#!/usr/bin/env node
// SetlogApps page generator + validators. Node stdlib only.
//   node scripts/build.mjs                       build (fails when a campaignLink is missing)
//   node scripts/build.mjs --allow-plain-links   LOCAL PREVIEW ONLY: falls back to https://apps.apple.com/app/id<ID>
//   node scripts/build.mjs --check-live          also verify every live appStoreId (iTunes Lookup) and every playUrl (must be HTTP 200)
//   node scripts/build.mjs --allow-legacy-hero  DEV ONLY: pages lacking hero/pillars/features[h2]/midCta/closeH2/trust fall back to templates/app-page-legacy.html
//   node scripts/build.mjs --allow-price         DEV ONLY: skip the price/"free" scan of the generated page body
//   node scripts/build.mjs --self-test           unit-test the free/price/pricing-model regexes and locale-tag mapping, then exit
//   node scripts/build.mjs --scrub-report=<file.md> [--all-files] [--head]   list copy strings that hit the free/price/pricing-model regexes, then exit
//   node scripts/build.mjs --today=YYYY-MM-DD    override "today" for lastmod
//   node scripts/build.mjs --indexnow [--since=YYYY-MM-DD] [--dry-run]
//                                                after a passing build, POST URLs whose lastmod >= since (default: today)
//                                                to https://api.indexnow.org/indexnow, one request per host. --dry-run only prints.
// Reads data/apps.json + data/i18n/*.json + templates/*.html, writes apps/<slug>/**, apps/ko/index.html,
// functions/_generated.js (locales + storeLinks for the middleware and /go), the marker regions of apps/index.html + support.html + about.html (@gen:support-chips|support-privacy|about-en|about-ko), sitemap.xml, apps-sitemap.xml, data/lastmod.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARGS = process.argv.slice(2);
const ALLOW_PLAIN = ARGS.includes('--allow-plain-links');
const CHECK_LIVE = ARGS.includes('--check-live');
const ALLOW_LEGACY = ARGS.includes('--allow-legacy-hero');
const ALLOW_PRICE = ARGS.includes('--allow-price');
const INDEXNOW = ARGS.includes('--indexnow');
const DRY_RUN = ARGS.includes('--dry-run');
const TODAY = (ARGS.find((a) => a.startsWith('--today=')) || '').slice(8) || new Date().toISOString().slice(0, 10);
const MAIN = 'https://setlog.net';
const APPS = 'https://apps.setlog.net';
const LOCALES = ['en', 'ko', 'ja', 'zh-hans', 'zh-hant', 'de', 'fr', 'es', 'it', 'pt-br', 'ru', 'tr'];
// URL segment / i18n file name / apps.json code (lower-case) -> BCP-47 tag for hreflang, <html lang>, inLanguage, sitemap
const LOCALE_TAG = { 'zh-hans': 'zh-Hans', 'zh-hant': 'zh-Hant', 'pt-br': 'pt-BR' };
const tagOf = (l) => LOCALE_TAG[l] || l;
const CJK_LOCALES = new Set(['ja', 'zh-hans', 'zh-hant']); // word count = chars/3
const SHORT_DESC_LOCALES = new Set(['ko', 'ja', 'zh-hans', 'zh-hant']); // description 60-155
const RESERVED_SLUGS = new Set(['apps', 'guides', 'css', 'js', 'images', 'functions', 'data', 'scripts', 'templates', 'docs', ...LOCALES, 'about', 'faq', 'support', 'contact', 'privacy', 'terms', 'robots', 'sitemap']);
const SCHEMA_CATEGORY = { 'Utilities': 'UtilitiesApplication', 'Photo & Video': 'MultimediaApplication', 'Music': 'MultimediaApplication', 'Health & Fitness': 'HealthApplication', 'Sports': 'SportsApplication', 'Productivity': 'BusinessApplication', 'Food & Drink': 'LifestyleApplication' };
// "free" wording; hands-free / ad-free / x-free compounds, "free up" and フリーズ (freeze) are not pricing claims.
// Latin-script stems carry a left boundary so e.g. "above" never matches "Abo"; CJK/Cyrillic stems are prefix matches.
const FREE_SRC = '(?<![-\\w])free\\b(?!\\s+up\\b)|(?<![\\p{L}])(?:gratuit|kostenlos|kostenfrei|gratis|gratuito|gratuita|grátis|ücretsiz)|무료|無料|免费|免費|フリー(?!ズ)|бесплатн';
const FREE_RE = new RegExp(FREE_SRC, 'iu');
const CUR = '(?:(?-i:USD|EUR|KRW|JPY|CHF|GBP|BRL|TRY|RUB|CNY|TWD|TL)|원|円|元|руб\\p{L}*|₽|₺)'; // letter codes are case-sensitive ("Try 2 presets" is not a price)
const PRICE_SRC = '\\d[\\d,.\\s]{0,12}\\s?' + CUR + '(?![\\p{L}])|(?<![\\p{L}])' + CUR + '\\s?\\d|(?:R\\$|NT\\$|[£￥¥$€₩₽₺])\\s?\\d|\\d[\\d,.]*\\s?[€₽₺$£¥￥₩]|' + FREE_SRC;
const PRICE_RE = new RegExp(PRICE_SRC, 'iu');
// pricing-model wording: must not appear anywhere in generated page bodies (landing + SEO sections) nor in i18n copy.
// Latin stems: left boundary (?<!\p{L}) so "Abo" does not hit "above"/"Laboratory"; right side open only where the stem is intentionally a prefix.
const PRICING_MODEL_SRC = [
  '(?<!\\p{L})(?:trials?(?!\\s+and\\s+error)|subscri\\w*|lifetime|purchas\\w*|pric(?:e|es|ing))(?!\\p{L})',
  // bare "plan" is a common noun (training plan, plan d'entraînement); only pricing compounds count
  '(?<!\\p{L})(?:(?:pricing|subscription|paid|Pro) plans?|(?:monthly|yearly|annual) plan|Tarife?|Preisplan\\w*|forfaits?|plan de pago|plano pago|тариф\\w*|ücretli plan)(?!\\p{L})|요금제|料金プラン|プラン料金|套餐|付费方案',
  '무료 체험|체험판|구독|평생|요금|가격|구매|유료 기능|한 번 결제',
  '体験版|無料体験|サブスク|買い切り|購入|価格|料金|有料版|課金|月額',
  '试用|訂閱|订阅|订购|终身|終身|购买|購買|价格|價格|定价|付費|內購|买断|買斷',
  '(?<!\\p{L})(?:Testphase|Probeversion|Probeabo|Probezeit|umsonst|Abos?|Abonnements?|Kauf\\w*|Preis\\w*)(?!\\p{L})',
  '(?<!\\p{L})(?:essai gratuit|version d\'essai|abonnement\\w*|achat\\w*|prix(?!\\s+(?:Nobel|Goncourt|Pulitzer|d\'honneur))|payant\\w*)(?!\\p{L})',
  '(?<!\\p{L})(?:versión de prueba|prueba gratis|suscripci[oó]n|suscripciones|compra(?:r|s|rlo|rla)?|precios?|sin costo)(?!\\p{L})|de por vida',
  '(?<!\\p{L})(?:versione di prova|periodo di prova|abbonament\\w*|acquist\\w*|prezz\\w*|una tantum)(?!\\p{L})|a vita(?!\\p{L})',
  '(?<!\\p{L})(?:versão de teste|teste grátis|assinatura\\w*|assinar|compra(?:r|s)?|pre[cç]o\\w*|vital[ií]ci\\w*)(?!\\p{L})',
  '(?<!\\p{L})(?:пробн|подписк|покупк|покупат|цен(?:а|ы|у|е|ой)(?!\\p{L})|навсегда|платная версия|купить Pro)',
  '(?<!\\p{L})(?:deneme sürümü|ücretsiz deneme|abonelik|satın|fiyat\\w*|tek seferlik|ödeme)|ömür boyu',
  'pay once|buy Pro|\\d\\s?/(?:月|month|mo|Monat|mois|mes|mese|mês|мес|ay)(?![\\p{L}])',
].join('|');
const PRICING_MODEL_RE = new RegExp(PRICING_MODEL_SRC, 'iu');
const ADS_RE = /adsbygoogle|googlesyndication|doubleclick|googletagservices/i;

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ld = (o) => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>';
const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');

// Outputs are buffered in memory and flushed to disk only when every validator passed (see flush below).
const pending = new Map();
function writeIfChanged(rel, content) {
  const p = path.join(ROOT, rel);
  pending.set(rel, content);
  return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== content;
}
const readOut = (rel) => (pending.has(rel) ? pending.get(rel) : fs.readFileSync(path.join(ROOT, rel), 'utf8'));
function flushPending() {
  for (const [rel, content] of pending) {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === content) continue;
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
}

// ---------- tiny JSON-schema subset validator (type/required/enum/pattern/items/properties/minItems/minLength)
function validateSchema(v, s, where, out) {
  if (s.enum && !s.enum.includes(v)) out(`${where}: ${JSON.stringify(v)} not in ${JSON.stringify(s.enum)}`);
  if (s.type) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    if (!types.includes(t)) { out(`${where}: expected ${types.join('|')}, got ${t}`); return; }
  }
  if (typeof v === 'string') {
    if (s.pattern && !new RegExp(s.pattern).test(v)) out(`${where}: does not match ${s.pattern}`);
    if (s.minLength && v.length < s.minLength) out(`${where}: too short`);
  }
  if (Array.isArray(v)) {
    if (s.minItems && v.length < s.minItems) out(`${where}: needs >= ${s.minItems} items`);
    if (s.items) v.forEach((x, i) => validateSchema(x, s.items, `${where}[${i}]`, out));
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const r of s.required || []) if (!(r in v)) out(`${where}: missing "${r}"`);
    for (const [k, sub] of Object.entries(s.properties || {})) if (k in v) validateSchema(v[k], sub, `${where}.${k}`, out);
  }
}

// ---------- self-test (node scripts/build.mjs --self-test)
if (ARGS.includes('--self-test')) {
  const T = [];
  const t = (name, re, text, want) => T.push([name, re.test(text) === want]);
  // FREE_RE: must not hit
  t('en hands-free', FREE_RE, 'a hands-free workflow', false);
  t('en free up', FREE_RE, 'free up space on your Mac', false);
  t('en ad-free', FREE_RE, 'an ad-free player', false);
  t('en free (hit)', FREE_RE, 'Free forever', true);
  t('ja freeze', FREE_RE, 'フリーズしません', false);
  t('de kostenlos (hit)', FREE_RE, 'Die App ist kostenlos', true);
  t('es gratis (hit)', FREE_RE, 'totalmente gratis', true);
  t('it gratuita (hit)', FREE_RE, 'versione gratuita', true);
  t('pt grátis (hit)', FREE_RE, 'baixe grátis', true);
  t('ru бесплатно (hit)', FREE_RE, 'Скачать бесплатно', true);
  t('tr ücretsiz (hit)', FREE_RE, 'ücretsiz indir', true);
  t('zh 免费 (hit)', FREE_RE, '免费下载', true);
  t('zh-hant 免費 (hit)', FREE_RE, '免費下載', true);
  t('ko 무료 (hit)', FREE_RE, '무료 체험', true);
  // PRICING_MODEL_RE: must not hit
  t('en planning', PRICING_MODEL_RE, 'planning your route', false);
  t('en above', PRICING_MODEL_RE, 'see the options above', false);
  t('en airplane/explanation', PRICING_MODEL_RE, 'an explanation of the airplane mode', false);
  t('de Laboratorium (Abo inside)', PRICING_MODEL_RE, 'im Laboratorium', false);
  t('de Probleme', PRICING_MODEL_RE, 'keine Probleme beim Öffnen', false);
  t('fr prix inside words', PRICING_MODEL_RE, 'une approche précise', false);
  t('es comprender', PRICING_MODEL_RE, 'para comprender el formato', false);
  t('it prova-less', PRICING_MODEL_RE, 'la provincia di Roma', false);
  t('pt testemunho', PRICING_MODEL_RE, 'o testemunho do usuário', false);
  t('ru цена inside', PRICING_MODEL_RE, 'интенсивность и ценный совет', false);
  t('tr denemek-less', PRICING_MODEL_RE, 'her şeyi bir arada', false);
  // PRICING_MODEL_RE: must hit
  t('en plans (hit)', PRICING_MODEL_RE, 'Pro plans available', true);
  t('en training plan', PRICING_MODEL_RE, 'not a training plan app', false);
  t("fr plan d'entraînement", PRICING_MODEL_RE, "pas un plan d'entraînement", false);
  t('de Trainingsplan', PRICING_MODEL_RE, 'kein Trainingsplan', false);
  t('en pricing plan (hit)', PRICING_MODEL_RE, 'a pricing plan', true);
  t('ko 요금제 (hit)', PRICING_MODEL_RE, '요금제 안내', true);
  t('fr forfait (hit)', PRICING_MODEL_RE, 'un forfait annuel', true);
  t('en subscription (hit)', PRICING_MODEL_RE, 'a subscription', true);
  t('en lifetime (hit)', PRICING_MODEL_RE, 'lifetime unlock', true);
  t('ko 구독 (hit)', PRICING_MODEL_RE, '구독 없이', true);
  t('ja 買い切り (hit)', PRICING_MODEL_RE, '買い切りです', true);
  t('zh-hans 订阅 (hit)', PRICING_MODEL_RE, '无需订阅', true);
  t('zh-hant 訂閱 (hit)', PRICING_MODEL_RE, '無需訂閱', true);
  t('de Abo (hit)', PRICING_MODEL_RE, 'ohne Abo', true);
  t('de Kauf (hit)', PRICING_MODEL_RE, 'In-App-Kauf', true);
  t('fr abonnement (hit)', PRICING_MODEL_RE, 'sans abonnement', true);
  t('es comprar (hit)', PRICING_MODEL_RE, 'puedes comprar Pro', true);
  t('es de por vida (hit)', PRICING_MODEL_RE, 'licencia de por vida', true);
  t('it a vita (hit)', PRICING_MODEL_RE, 'licenza a vita', true);
  t('it abbonamento (hit)', PRICING_MODEL_RE, 'senza abbonamento', true);
  t('pt assinatura (hit)', PRICING_MODEL_RE, 'sem assinatura', true);
  t('pt preço (hit)', PRICING_MODEL_RE, 'o preço', true);
  t('ru подписка (hit)', PRICING_MODEL_RE, 'без подписки', true);
  t('ru навсегда (hit)', PRICING_MODEL_RE, 'доступ навсегда', true);
  t('tr abonelik (hit)', PRICING_MODEL_RE, 'abonelik yok', true);
  t('tr ömür boyu (hit)', PRICING_MODEL_RE, 'ömür boyu lisans', true);
  // PRICE_RE currency
  t('$ digit (hit)', PRICE_RE, 'only $4.99', true);
  t('R$ digit (hit)', PRICE_RE, 'por R$ 19,90', true);
  t('NT$ digit (hit)', PRICE_RE, 'NT$ 150', true);
  t('元 digit (hit)', PRICE_RE, '仅需 30 元', true);
  t('₩ digit (hit)', PRICE_RE, '₩3,900', true);
  t('₺ digit (hit)', PRICE_RE, '₺49,99', true);
  t('руб digit (hit)', PRICE_RE, '299 рублей', true);
  t('EUR digit (hit)', PRICE_RE, '4.99 EUR', true);
  t('plain numbers (no hit)', PRICE_RE, 'Supports 5 languages and 3 windows, 120 fps', false);
  t('version string (no hit)', PRICE_RE, 'Requires iOS 16.1 or later, macOS 14', false);
  t('TRY word (no hit)', PRICE_RE, 'You can try it and see', false);
  t('no-hit Try 2 presets', PRICE_RE, 'Try 2 presets', false);
  t('no-hit trial and error', PRICING_MODEL_RE, 'by trial and error', false);
  t('no-hit ja 視聴体験', PRICING_MODEL_RE, '快適な視聴体験', false);
  t('no-hit ko 몰입 체험', PRICING_MODEL_RE, '몰입 체험', false);
  t('no-hit it fai una prova', PRICING_MODEL_RE, 'fai una prova', false);
  t('no-hit es ponlo a prueba', PRICING_MODEL_RE, 'ponlo a prueba', false);
  t('no-hit pt faça um teste', PRICING_MODEL_RE, 'faça um teste', false);
  t('no-hit fr un essai', PRICING_MODEL_RE, 'un essai', false);
  t('no-hit fr prix Nobel', PRICING_MODEL_RE, 'le prix Nobel', false);
  t('hit fr prix', PRICING_MODEL_RE, 'à bon prix', true);
  t('no-hit de Probe', PRICING_MODEL_RE, 'eine Probe', false);
  t('no-hit tr denemek için', PRICING_MODEL_RE, 'denemek için', false);
  t('hit ja 体験版', PRICING_MODEL_RE, '体験版あり', true);
  t('hit ko 무료 체험', PRICING_MODEL_RE, '무료 체험', true);
  t('hit it versione di prova', PRICING_MODEL_RE, 'versione di prova', true);
  t('hit fr essai gratuit', PRICING_MODEL_RE, 'essai gratuit', true);
  t('hit 9.99/月', PRICING_MODEL_RE, '9.99/月', true);
  t('hit pay once', PRICING_MODEL_RE, 'pay once', true);
  // forbiddenClaims
  t('claim NAS vs pt nas', claimRe('NAS'), 'nas quais o app roda', false);
  t('claim NAS vs tr nasıl', claimRe('NAS'), 'nasıl çalışır', false);
  t('claim NAS hit', claimRe('NAS'), 'copy to a NAS drive', true);
  t('claim iCloud ci', claimRe('iCloud'), 'syncs via icloud', true);
  t('claim phrase boundary', claimRe('change pitch'), 'you can change pitches', false);
  t('claim phrase hit', claimRe('change pitch'), 'Change Pitch now', true);
  // locale tags
  T.push(['tag zh-hans', tagOf('zh-hans') === 'zh-Hans']); T.push(['tag zh-hant', tagOf('zh-hant') === 'zh-Hant']);
  T.push(['tag pt-br', tagOf('pt-br') === 'pt-BR']); T.push(['tag ko', tagOf('ko') === 'ko']);
  T.push(['12 locales', LOCALES.length === 12]);
  const failed = T.filter(([, ok]) => !ok);
  console.log(`self-test: ${T.length - failed.length}/${T.length} passed`);
  for (const [n] of failed) console.error('  FAIL ' + n);
  process.exit(failed.length ? 1 : 0);
}

// ---------- scrub report (node scripts/build.mjs --scrub-report=<out.md> [--all-files]): list copy strings hit by free/price/pricing-model regexes
if (ARGS.some((a) => a.startsWith('--scrub-report='))) {
  const outRel = ARGS.find((a) => a.startsWith('--scrub-report=')).slice(15);
  const { execFileSync } = await import('node:child_process');
  const tracked = ARGS.includes('--all-files') ? null : new Set(execFileSync('git', ['ls-files', 'data/i18n'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean));
  const rows = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'data/i18n')).sort()) {
    const m = f.match(/^(.+)\.([a-z]{2}(?:-[a-z]{2,4})?)\.json$/);
    if (!m || (tracked && !tracked.has('data/i18n/' + f))) continue;
    const c = ARGS.includes('--head') ? JSON.parse(execFileSync('git', ['show', 'HEAD:data/i18n/' + f], { cwd: ROOT, encoding: 'utf8' })) : readJson('data/i18n/' + f);
    const walk = (v, p2, k) => {
      if (k === 'src' || k === 'locale') return;
      if (typeof v === 'string') {
        const kinds = [['free', FREE_RE], ['price', PRICE_RE], ['model', PRICING_MODEL_RE]].filter(([, re]) => re.test(v));
        if (kinds.length) { const hit = (v.match(PRICING_MODEL_RE) || v.match(PRICE_RE) || v.match(FREE_RE))[0]; rows.push([m[1], m[2], p2, [...new Set(kinds.map(([n]) => n))].join('+'), hit, v.replace(/\s+/g, ' ').slice(0, 60)]); }
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p2}[${i}]`));
      else if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) walk(x, p2 ? `${p2}.${kk}` : kk, kk);
    };
    walk(c, '');
  }
  const md = `# Pricing/free wording scrub report\n\nGenerated by \`node scripts/build.mjs --scrub-report=...\` on ${TODAY}. Scope: ${tracked ? (ARGS.includes('--head') ? 'i18n files as committed at HEAD (pre-rewrite copy)' : 'i18n files tracked in git, working-tree state') : 'all data/i18n files'}. Rule: no free / price / currency / subscription / trial / lifetime / purchase / plan wording anywhere in copy; rewrite as feature statements (e.g. "included in Pro") without those words.\n\n${rows.length} hit(s) in ${new Set(rows.map((r) => r[0] + '/' + r[1])).size} file(s).\n\n| app | locale | field | kind | match | text (first 60 chars) |\n|---|---|---|---|---|---|\n` + rows.map((r) => '| ' + r.map((x) => String(x).replace(/\|/g, '\\|')).join(' | ') + ' |').join('\n') + '\n';
  fs.mkdirSync(path.dirname(path.join(ROOT, outRel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, outRel), md);
  console.log(`scrub report: ${rows.length} hit(s) -> ${outRel}`);
  process.exit(0);
}

// ---------- load
const registry = readJson('data/apps.json');
validateSchema(registry, readJson('data/apps.schema.json'), 'apps.json', err);
const UI = readJson('data/i18n/_ui.json');
if (!ALLOW_PRICE) { // price/free wording must not live in shared UI strings either
  const walkStr = (v, p2) => { if (typeof v === 'string') { if (PRICE_RE.test(v)) err(`_ui.json ${p2}: price/free wording "${v.match(PRICE_RE)[0]}"`); if (PRICING_MODEL_RE.test(v)) err(`_ui.json ${p2}: pricing-model wording "${v.match(PRICING_MODEL_RE)[0]}"`); } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkStr(x, p2 + '.' + k); };
  walkStr(UI, '');
}
const apps = registry.apps.filter((a) => a.status === 'live');
// keywords per locale: data/i18n-keywords/<slug>.json ({loc:[...]}) supplements apps.json; missing locales fall back to en (warning only)
for (const a of apps) {
  const kf = `data/i18n-keywords/${a.slug}.json`;
  let extra = {};
  if (exists(kf)) { try { extra = readJson(kf); } catch (e) { warns.push(`${kf}: invalid JSON (${e.message})`); } }
  a.keywords = { ...(a.keywords || {}), ...Object.fromEntries(Object.entries(extra).filter(([, v]) => Array.isArray(v) && v.length)) };
  const lacking = a.locales.filter((l) => !(a.keywords[l] && a.keywords[l].length));
  if (lacking.length) { warns.push(`${a.slug}: keywords missing for ${lacking.join(',')} (using en fallback; add ${kf})`); for (const l of lacking) a.keywords[l] = a.keywords.en || []; }
}
const seen = new Set();
for (const a of registry.apps) {
  if (seen.has(a.slug)) err(`duplicate slug ${a.slug}`);
  seen.add(a.slug);
  if (RESERVED_SLUGS.has(a.slug)) err(`slug ${a.slug} collides with a reserved path`);
  if (!a.locales.includes(a.primaryLocale)) err(`${a.slug}: primaryLocale not in locales`);
  if (a.status === 'live' && !['landscape', 'portrait'].includes(a.heroOrientation)) err(`${a.slug}: heroOrientation must be "landscape" or "portrait"`);
}

const i18n = {}; // slug -> locale -> copy
for (const a of apps) {
  i18n[a.slug] = {};
  for (const loc of a.locales) {
    const f = `data/i18n/${a.slug}.${loc}.json`;
    if (!exists(f)) { err(`${a.slug}/${loc}: missing ${f}`); continue; }
    try { i18n[a.slug][loc] = readJson(f); } catch (e) { err(`${f}: invalid JSON (${e.message})`); }
  }
}

// ---------- helpers
const isPrimary = (a, loc) => loc === a.primaryLocale;
const pagePath = (a, loc) => `/${a.slug}/` + (isPrimary(a, loc) ? '' : loc + '/');
const pageUrl = (a, loc) => APPS + pagePath(a, loc);
const outFile = (a, loc) => `apps/${a.slug}/` + (isPrimary(a, loc) ? '' : loc + '/') + 'index.html';
const catalogPath = (loc) => (loc === 'ko' ? '/ko/' : '/');

const storeLinkCache = new Map();
function storeLink(a, loc) {
  const key = a.slug + '/' + loc;
  if (!storeLinkCache.has(key)) storeLinkCache.set(key, storeLinkRaw(a, loc));
  return storeLinkCache.get(key);
}
function storeLinkRaw(a, loc) {
  const cl = a.campaignLink;
  const v = cl && typeof cl === 'object' ? cl[loc] : typeof cl === 'string' ? cl : null;
  if (v) {
    let ok = false;
    try { const u = new URL(v); ok = u.hostname === 'apps.apple.com' && u.pathname.includes('id' + a.appStoreId) && u.searchParams.get('pt') && u.searchParams.get('ct') === `web-${a.slug}-${loc}`; } catch { /* below */ }
    if (!ok) err(`${a.slug}/${loc}: campaignLink must be the ASC generator link for id${a.appStoreId} with pt= and ct=web-${a.slug}-${loc}`);
    return v;
  }
  if (ALLOW_PLAIN) return `https://apps.apple.com/app/id${a.appStoreId}`;
  err(`${a.slug}/${loc}: campaignLink is null (paste the ASC campaign link generator result for ct=web-${a.slug}-${loc}; use --allow-plain-links only for local preview)`);
  return `https://apps.apple.com/app/id${a.appStoreId}`;
}

function copyWords(c, loc) {
  const parts = [...(c.summary || []), ...(c.overview || [])];
  for (const f of c.features || []) parts.push(f.h || f.h2, f.p);
  for (const s of c.specs || []) parts.push(s.k, s.v);
  parts.push(...(c.limits || []));
  for (const q of c.faq || []) parts.push(q.q, q.a);
  const text = parts.join(' ');
  if (CJK_LOCALES.has(loc)) return Math.round(text.replace(/\s/g, '').length / 3);
  return text.split(/\s+/).filter(Boolean).length;
}
function allCopyText(c) { // every string value of the copy (not key names), minus src/locale
  const out = [];
  const walk = (v, k) => { if (k === 'src' || k === 'locale') return; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => walk(x)); else if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) walk(x, kk); };
  walk(c);
  return out.join('\n');
}
const scan = (re, text, max = 5) => { const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); const hits = []; let m; while ((m = g.exec(text)) && hits.length < max) { hits.push([m[0], m.index]); if (m[0] === '') g.lastIndex++; } return hits; };
const osLabel = (a) => a.minOS.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s + '+').join(', ');
const localized = (obj, loc, fb) => (obj && (obj[loc] || obj.en || obj[fb] || Object.values(obj)[0])) || '';

// forbiddenClaims: ALL-CAPS acronyms (2+ letters, e.g. NAS) match case-sensitively; every claim needs word boundaries (so pt "nas" / tr "nasıl" pass)
function claimRe(f) {
  const body = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?<![\\p{L}\\p{N}])' + body + '(?![\\p{L}\\p{N}])', /^\p{Lu}{2,}$/u.test(f) ? 'u' : 'iu');
}
function validateCopy(a, loc, c) {
  const w = `${a.slug}/${loc}`;
  if (c.locale !== loc) err(`${w}: locale field is "${c.locale}"`);
  for (const k of ['title', 'description', 'h1', 'tagline']) if (!c[k] || typeof c[k] !== 'string') err(`${w}: missing ${k}`);
  if (c.title && c.title.length > 60) err(`${w}: title ${c.title.length} chars > 60`);
  if (c.description && (c.description.length < (SHORT_DESC_LOCALES.has(loc) ? 60 : 120) || c.description.length > 155)) err(`${w}: description ${c.description.length} chars (need 120-155; ko/ja/zh 60-155)`);
  if (!Array.isArray(c.summary) || c.summary.length !== 3) err(`${w}: summary needs exactly 3 items`);
  if (!Array.isArray(c.features) || c.features.length < 3 || c.features.length > 6) err(`${w}: features need 3-6 items`);
  if (!Array.isArray(c.screenshots) || c.screenshots.length < 3 || c.screenshots.length > 5) err(`${w}: screenshots need 3-5 items`);
  for (const [i, s] of (c.screenshots || []).entries()) {
    if (!s.alt || s.alt.trim().length < 12) err(`${w}: screenshot ${i + 1} alt missing/too short`);
    if (!s.src || !exists(s.src.replace(/^\//, ''))) err(`${w}: screenshot ${i + 1} file missing (${s.src})`);
    if (!s.w || !s.h) err(`${w}: screenshot ${i + 1} needs w/h`);
  }
  if (!Array.isArray(c.faq) || c.faq.length < 4 || c.faq.length > 6) err(`${w}: faq needs 4-6 items`);
  if (!Array.isArray(c.limits) || c.limits.length < 2) err(`${w}: limits need >= 2 items`);
  if (!c.card || !c.card.tagline || !Array.isArray(c.card.features) || c.card.features.length < 3) err(`${w}: card.tagline + 3 card.features required`);
  const words = copyWords(c, loc);
  if (words < 350) err(`${w}: thin copy, ${words} words < 350`);
  const text = allCopyText(c);
  if (FREE_RE.test(text)) err(`${w}: forbidden "free" wording: ${text.match(FREE_RE)[0]}`);
  if (!ALLOW_PRICE && PRICE_RE.test(text)) err(`${w}: price/currency wording in copy: ${text.match(PRICE_RE)[0]}`);
  if (!ALLOW_PRICE && PRICING_MODEL_RE.test(text)) { const mm = text.match(PRICING_MODEL_RE); err(`${w}: pricing-model wording in copy: "${mm[0]}" ...${text.slice(Math.max(0, mm.index - 30), mm.index + 40).replace(/\s+/g, ' ')}...`); }
  for (const f of a.forbiddenClaims) if (f && claimRe(f).test(text)) err(`${w}: forbiddenClaim "${f}" present`);
  if (/<[a-z][^>]*>/i.test(text.replace(/\\"/g, ''))) warns.push(`${w}: copy contains HTML-like tags (will be escaped)`);
  return words;
}

// ---------- landing (Apple-style top) fields: hero / pillars / features[{h2,p,shot}] / midCta / closeH2 / trust
// landing shots: images/apps/<slug>/<loc>/NN.webp when present, else the primary-locale (en) file (new locales reuse the store shots, plan 2d)
const shotPath = (a, loc, n) => { const own = `images/apps/${a.slug}/${loc}/${n}.webp`; return exists(own) ? own : `images/apps/${a.slug}/${a.primaryLocale}/${n}.webp`; };
function landingMissing(c) {
  const L = c.landing || {};
  const miss = [];
  for (const k of ['hero', 'pillars', 'features', 'midCta', 'closeH2', 'trust']) if (!L[k]) miss.push('landing.' + k);
  return miss;
}
function validateLanding(a, loc, c) {
  const w = `${a.slug}/${loc}`;
  const bad = (m) => err(`${w}: landing.${m}`);
  const L = c.landing;
  const h = L.hero || {};
  for (const k of ['category', 'h1', 'sub']) if (!h[k] || typeof h[k] !== 'string') bad(`hero.${k} missing`);
  const n = Array.isArray(h.shots) ? h.shots.length : 0;
  if (a.heroOrientation === 'landscape' ? n !== 1 : (n < 2 || n > 3)) bad(`hero.shots needs ${a.heroOrientation === 'landscape' ? 1 : '2-3'} item(s) for ${a.heroOrientation}`);
  for (const sh of h.shots || []) if (!exists(shotPath(a, loc, sh))) bad(`hero shot file missing: ${shotPath(a, loc, sh)}`);
  if (!Array.isArray(L.pillars) || L.pillars.length !== 3 || L.pillars.some((x) => !x || !x.title || !x.text)) bad('pillars needs 3 x {title,text}');
  if (!Array.isArray(L.features) || L.features.length !== 3 || L.features.some((x) => !x || !x.h2 || !x.p || !x.shot)) bad('features needs 3 x {h2,p,shot}');
  for (const f of L.features || []) if (f && f.shot && !exists(shotPath(a, loc, f.shot))) bad(`feature shot file missing: ${shotPath(a, loc, f.shot)}`);
  if (!L.midCta || !L.midCta.h2 || !L.midCta.p) bad('midCta needs {h2,p}');
  if (typeof L.closeH2 !== 'string' || !L.closeH2) bad('closeH2 missing');
  if (!Array.isArray(L.trust) || L.trust.length < 2 || L.trust.length > 4) bad('trust needs 2-4 items');
}

// ---------- rendering
function navHtml(loc) {
  const n = UI[loc].nav;
  return `<a href="${MAIN}/">${esc(n.home)}</a><a href="${APPS}/" aria-current="page">${esc(n.apps)}</a><a href="${MAIN}/guides/">${esc(n.guides)}</a><a href="${MAIN}/about">${esc(n.about)}</a><a href="${MAIN}/support">${esc(n.support)}</a><a href="${MAIN}/contact">${esc(n.contact)}</a><a href="${MAIN}/privacy">${esc(n.privacy)}</a><a href="${MAIN}/terms">${esc(n.terms)}</a>`;
}
const footerLinks = (loc) => { const n = UI[loc].nav; return [['/', n.home], ['/guides/', n.guides], ['/about', n.about], ['/faq', 'FAQ'], ['/support', n.support], ['/contact', n.contact], ['/privacy', n.privacy], ['/terms', n.terms]].map(([h, t]) => `<a href="${MAIN}${h}">${esc(t)}</a>`).join(''); };
function render(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in vars)) throw new Error('template var missing: ' + k); return vars[k]; });
}
const hreflangLinks = (items) => items.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${u}">`).join('\n');

const tplApp = fs.readFileSync(path.join(ROOT, 'templates/app-page.html'), 'utf8');
const tplLegacy = fs.readFileSync(path.join(ROOT, 'templates/app-page-legacy.html'), 'utf8');
const tplCat = fs.readFileSync(path.join(ROOT, 'templates/catalog.html'), 'utf8');
const droppedSpecs = [];
const pagesOut = []; // {file, url}

// ---------- landing helpers
const cap = (x) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);
function platformPhrase(a, ui) {
  const words = [...new Set(a.platforms.map((p) => ui.platformWords[p] || p))].slice(0, 4);
  let t = ui.forPlatforms[String(words.length)];
  ['A', 'B', 'C', 'D'].forEach((k, i) => { t = t.replace(`{${k}}`, words[i] || ''); });
  return t;
}
const missingBadge = new Set();
function storeBadge(a, loc, store, pos, ui) {
  const kind = store === 'play' ? 'play' : a.storeKind;
  const prefix = { mac: 'mac', ios: 'apple', play: 'play' }[kind];
  let file = `images/badges/${prefix}-${loc}.svg`;
  if (!exists(file)) {
    if (!missingBadge.has(file)) { warns.push(`badge missing: ${file}${exists(`images/badges/${prefix}-en.svg`) ? ' (falling back to en)' : ' (text fallback)'}`); missingBadge.add(file); }
    file = `images/badges/${prefix}-en.svg`;
  }
  const href = `/go/${a.slug}?l=${loc}&amp;store=${store}&amp;pos=${pos}`;
  const label = esc(ui.badgeAlt[kind]);
  if (!exists(file)) return `<a class="store" href="${href}" rel="nofollow noopener" aria-label="${label}"><span class="badge"><span>${label}</span></span></a>`;
  return `<a class="store" href="${href}" rel="nofollow noopener" aria-label="${label}"><img src="/${file}" alt="${label}" height="44"></a>`;
}
const storesHtml = (a, loc, pos, ui) => `<div class="stores">${storeBadge(a, loc, 'apple', pos, ui)}${a.playUrl ? storeBadge(a, loc, 'play', pos, ui) : ''}</div>`;
function renderLanding(a, loc, c, ui, ctx) {
  const L = c.landing;
  const h = L.hero;
  const phrase = platformPhrase(a, ui);
  const appName = a.name;
  const tf = (t) => t.replace('{app}', appName).replace('{cat}', cap(h.category)).replace('{for}', phrase);
  let title = tf(ui.titleFmt);
  if (title.length > 60) title = tf(ui.titleFmt.replace(/\s?\{for\}\s?/, ' ').replace(/\s+/g, ' ')); // drop the platform tail when too long
  if (title.length > 60) warns.push(`${a.slug}/${loc}: landing title ${title.length} chars > 60`);
  const altOf = (nn, fb) => ((c.screenshots || []).find((x) => x.src.endsWith(`/${nn}.webp`)) || {}).alt || fb;
  const port = a.heroOrientation === 'portrait';
  const [iw0, ih0] = port ? [420, 909] : [1000, 625];
  const img = (nn, fb, eager) => { const sc = (c.screenshots || []).find((x) => x.src.endsWith(`/${nn}.webp`)); const iw = sc && sc.w ? sc.w : iw0, ih = sc && sc.h ? sc.h : ih0; return `<img src="/${shotPath(a, loc, nn)}" alt="${esc(altOf(nn, fb))}" width="${iw}" height="${ih}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async">`; };
  const heroShots = `<figure class="shot${port ? ' row n' + h.shots.length : ''}">${h.shots.map((nn, i) => img(nn, h.h1, i === 0)).join('')}</figure>`;
  const pillars = L.pillars.map((x) => `<div class="pillar"><b>${esc(x.title)}</b><p>${esc(x.text)}</p></div>`).join('');
  const features = L.features.map((f, i) => `<section class="feature${i % 2 ? ' flip' : ''}${port ? ' portrait' : ''}"><div class="text"><h2>${esc(f.h2)}</h2><p>${esc(f.p)}</p></div>${img(f.shot, f.h2, false)}</section>`).join('\n  ');
  // landing spec grid: no pricing-model wording at all; paid features appear only as one 'Pro (optional)' row listing feature names
  const norm = (t) => String(t).trim().toLowerCase();
  const isPro = (x) => /\bPro\b/.test(x.k) || /\bPro\b/.test(x.v);
  const proLabels = new Set([...Object.values(UI).map((u) => norm(u.proOptional || '')), 'pro']);
  const proFeatures = c.specs.filter((x) => isPro(x) && !PRICING_MODEL_RE.test(x.k + ' ' + x.v)).flatMap((x) => (proLabels.has(norm(x.k)) ? [x.v.trim()] : /\bPro\b/.test(x.k) ? [] : [x.k.trim()]));
  const rows = c.specs.filter((x) => !isPro(x) && !PRICING_MODEL_RE.test(x.k + ' ' + x.v)).map((x) => [x.k, x.v]);
  if (!rows.some(([k]) => norm(k) === norm(ui.spec.requires))) rows.unshift([ui.spec.requires, [a.minOS, a.minAndroid].filter(Boolean).join(', ')]);
  if (proFeatures.length) rows.push([ui.proOptional, proFeatures.join(', ')]);
  ctx.droppedSpecs = c.specs.length - c.specs.filter((x) => !isPro(x) && !PRICING_MODEL_RE.test(x.k + ' ' + x.v)).length;
  const specs = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const reqLine = ui.requires.replace('{os}', [a.minOS, a.minAndroid].filter(Boolean).join(', '));
  const opens = [ui.opensIn[a.storeKind], a.playUrl ? ui.opensIn.play : null].filter(Boolean).join(' · ');
  const heroMeta = [cap(phrase), reqLine, opens].map(esc).join(' &middot; ');
  const langs = a.locales.length > 1;
  const menuLocales = LOCALES.filter((l) => a.locales.includes(l)); // fixed menu order, independent of the per-app locales array
  const langHref = (l) => `${pagePath(a, l)}?lang=${l}`;
  const langMenu = langs ? `<details class="lang"><summary aria-label="${esc(ui.language)}"><span class="full">${esc(UI[loc].langName)}</span><span class="code">${loc.toUpperCase()}</span></summary><div class="menu">${menuLocales.map((l) => `<a lang="${tagOf(l)}" hreflang="${tagOf(l)}" href="${langHref(l)}"${l === loc ? ' aria-current="true"' : ''}>${esc(UI[l].langName)}</a>`).join('')}</div></details>` : '';
  const getPill = `<a class="get" rel="nofollow noopener" href="/go/${a.slug}?l=${loc}&amp;store=apple&amp;pos=header">${esc(ui.getApp.replace('{app}', appName))}</a>`;
  const others = apps.filter((o) => o.slug !== a.slug).sort((x, y) => (y.storeKind === a.storeKind) - (x.storeKind === a.storeKind)).slice(0, 3).map((o) => o.name);
  const made = esc(ui.madeBy.replace('{n}', String(apps.length))).replace('Setlog', '<b>Setlog</b>');
  const maker = `${made}<span class="also">${esc(ui.alsoFrom.replace('{apps}', others.join(', ')))}</span>`;
  const priv = (a.site && a.site.privacyLangs) || [];
  const pl = priv.includes(loc === 'ko' ? 'kr' : loc) ? (loc === 'ko' ? 'kr' : loc) : priv.includes('en') ? 'en' : priv[0];
  const footerNav = [[`${MAIN}/support`, ui.nav.support], [pl ? `${PRIV_BASE}${a.slug}-${pl}.html` : `${MAIN}/privacy`, ui.nav.privacy], [`${MAIN}/terms`, ui.nav.terms], [catalogPath(loc === 'ko' ? 'ko' : 'en'), ui.allApps]]
    .map(([hr, t]) => `<a href="${hr}">${esc(t)}</a>`).join('') + (langs ? menuLocales.map((l) => `<a lang="${tagOf(l)}" hreflang="${tagOf(l)}" href="${langHref(l)}">${esc(UI[l].langName)}</a>`).join('') : '');
  const trademark = esc(ui.trademark.apple + (a.playUrl ? ' ' + ui.trademark.google : ''));
  return {
    title: esc(title), by: esc(ui.by), appName: esc(appName), selfHref: pagePath(a, loc), navFeatures: esc(ui.navFeatures), navSpecs: esc(ui.navSpecs),
    langMenu, getPill, eyebrow: esc(tf(ui.eyebrowFmt)), h1: esc(h.h1), sub: esc(h.sub), heroStores: storesHtml(a, loc, 'hero', ui), heroMeta,
    trust: L.trust.map((x) => `<span>${esc(x)}</span>`).join(''), heroShots, pillars, features, midH2: esc(L.midCta.h2), midP: esc(L.midCta.p),
    midStores: storesHtml(a, loc, 'mid', ui), hSpecs: esc(ui.h.specs), specs, closeH2: esc(L.closeH2), closeP: esc(ui.getFor.replace('{app}', appName).replace('{for}', phrase)),
    closeStores: storesHtml(a, loc, 'close', ui), maker, seoFeatures: c.features.map((f) => `<h3>${esc(f.h || f.h2)}</h3>\n    <p>${esc(f.p)}</p>`).join('\n    '),
    footerNav, trademark,
  };
}

function renderAppPage(a, loc) {
  const c = i18n[a.slug][loc];
  const ui = UI[loc];
  const url = pageUrl(a, loc);
  const link = storeLink(a, loc);
  const icon = MAIN + a.icon;
  const shots = c.screenshots.map((s, i) => {
    const wide = s.w > s.h;
    const attrs = i === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    return `<figure${wide ? ' class="wide"' : ''}><img src="${esc(s.src)}" alt="${esc(s.alt)}" width="${s.w}" height="${s.h}" ${attrs} decoding="async">${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ''}</figure>`;
  }).join('');
  const ogImage = MAIN + c.screenshots[0].src;
  const hre = a.locales.map((l) => [tagOf(l), pageUrl(a, l)]);
  hre.push(['x-default', pageUrl(a, a.primaryLocale)]);
  const catalogHref = catalogPath(loc === 'ko' ? 'ko' : 'en');
  const platformsLine = a.platforms.join(', ');
  const spec = [[ui.spec.platforms, platformsLine], [ui.spec.requires, osLabel(a)], ...c.specs.map((s) => [s.k, s.v])]
    .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  const cta = `<a class="primary" href="${esc(link)}" rel="noopener">${esc(ui.storeBtn[a.storeKind])}</a>` + (a.playUrl ? `<a href="${esc(a.playUrl)}" rel="noopener">${esc(ui.playBtn)}</a>` : '');
  const langSwitch = a.locales.length > 1
    ? `<p class="lang-switch">${esc(ui.h.languages)}: ` + LOCALES.filter((l) => a.locales.includes(l)).map((l) => l === loc ? `<a aria-current="page" lang="${tagOf(l)}" hreflang="${tagOf(l)}" href="${pagePath(a, l)}">${esc(UI[l].langName)}</a>` : `<a lang="${tagOf(l)}" hreflang="${tagOf(l)}" href="${pagePath(a, l)}">${esc(UI[l].langName)}</a>`).join(' &middot; ') + '</p>'
    : '';
  const guides = (a.guides || []);
  const related = guides.length
    ? `<section class="related"><h2>${esc(ui.h.related)}</h2><ul>${guides.map((g) => `<li><a href="${MAIN}${g.href}">${esc(localized(g.title, loc, a.primaryLocale))}</a></li>`).join('')}</ul></section>`
    : '';
  const others = apps.filter((o) => o.slug !== a.slug).sort((x, y) => (y.storeKind === a.storeKind) - (x.storeKind === a.storeKind)).slice(0, 3);
  const othersHtml = `<section class="related"><h2>${esc(ui.h.others)}</h2><ul class="others">${others.map((o) => {
    const ol = o.locales.includes(loc) ? loc : o.primaryLocale;
    const oc = i18n[o.slug][ol];
    return `<li><a href="${pagePath(o, ol)}">${esc(o.name)}</a><span>${esc(oc ? oc.card.tagline : '')}</span></li>`;
  }).join('')}</ul></section>`;
  const sw = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication',
    name: (a.storeNames && a.storeNames[loc]) || a.name, url, image: icon,
    applicationCategory: SCHEMA_CATEGORY[a.category], operatingSystem: osLabel(a),
    // Google Ads '무료 데스크톱 소프트웨어' 인증 트리거 회피(2026-11-09 비승인): offers price 0·downloadUrl 제거, 스토어 링크는 sameAs로만
    description: c.description, inLanguage: tagOf(loc), sameAs: [link],
    screenshot: c.screenshots.map((s) => MAIN + s.src),
    author: { '@type': 'Organization', name: 'SETLOG', url: MAIN + '/' },
    publisher: { '@type': 'Organization', name: 'SETLOG', url: MAIN + '/' },
    dateModified: a.updated,
  };
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: tagOf(loc), mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  const bc = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'SETLOG ' + ui.crumbApps, item: APPS + catalogHref },
    { '@type': 'ListItem', position: 2, name: a.name, item: url } ] };
  const miss = landingMissing(c);
  const landing = !miss.length;
  if (landing) {
    const before = errors.length;
    validateLanding(a, loc, c);
    if (errors.length > before) return null;
  } else if (!ALLOW_LEGACY) err(`${a.slug}/${loc}: landing fields missing: ${miss.join(', ')} (dev: --allow-legacy-hero)`);
  const ctx = {};
  const extra = landing ? renderLanding(a, loc, c, ui, ctx) : {};
  if (landing) droppedSpecs.push([a.slug, loc, ctx.droppedSpecs]);
  const vars = {
    lang: tagOf(loc), title: esc(c.title), description: esc(c.description), canonical: url, hreflang: hreflangLinks(hre),
    ogImage, ogLocale: ui.ogLocale, itunesMeta: a.storeKind === 'ios' ? `<meta name="apple-itunes-app" content="app-id=${a.appStoreId}">` : '',
    jsonld: [sw, faq, bc].map(ld).join('\n'), nav: navHtml(loc), catalogHref, crumbApps: esc(ui.crumbApps), appName: esc(a.name),
    icon: a.icon, h1: esc(c.h1), tagline: esc(c.tagline), langSwitch, cta,
    hSummary: esc(ui.h.summary), summary: c.summary.map((s) => `<li>${esc(s)}</li>`).join(''),
    overview: (c.overview || []).map((p) => `<p>${esc(p)}</p>`).join('\n  '),
    hFeatures: esc(ui.h.features), features: c.features.map((f) => `<h3>${esc(f.h || f.h2)}</h3>\n  <p>${esc(f.p)}</p>`).join('\n  '),
    hScreenshots: esc(ui.h.screenshots), shots, hSpecs: esc(ui.h.specs), specs: spec,
    hLimits: esc(ui.h.limits), limits: c.limits.map((l) => `<li>${esc(l)}</li>`).join(''),
    hFaq: esc(ui.h.faq), faq: c.faq.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n  '),
    related, others: othersHtml, footerLinks: footerLinks(loc), footerSupport: esc(ui.footerSupport),
  };
  let out = render(landing ? tplApp : tplLegacy, { ...vars, ...extra });
  const flags = [ALLOW_LEGACY && 'allow-legacy-hero', ALLOW_PRICE && 'allow-price'].filter(Boolean);
  if (flags.length) out = out.replace('</head>', `<meta name="build-flags" content="${flags.join(' ')}">\n</head>`);
  return out;
}

function cardsHtml(loc) {
  const ui = UI[loc];
  return apps.map((a) => {
    const pl = a.locales.includes(loc) ? loc : a.primaryLocale;
    const c = i18n[a.slug][pl];
    if (!c) return '';
    const href = pagePath(a, pl);
    const play = a.playUrl ? `<a class="badge" href="${esc(a.playUrl)}" target="_blank" rel="noopener noreferrer">Google Play</a>` : '';
    return `  <div class="app" id="app-${a.slug}">
    <div class="app-icon"><img src="${a.icon}" alt="${esc(a.name)}" width="64" height="64" loading="lazy" decoding="async"></div>
    <div class="app-body">
      <p class="app-name"><a href="${href}">${esc(a.name)}</a> <span class="plat">${esc(a.platforms.join(' · '))}</span></p>
      <p class="app-desc">${esc(c.card.tagline)}</p>
      <ul class="app-features">
${c.card.features.map((f) => `        <li>${esc(f)}</li>`).join('\n')}
      </ul>
      <div class="app-badges"><a class="badge" href="${href}">${esc(ui.detailsBtn)}</a>${play}</div>
    </div>
  </div>`;
  }).join('\n\n');
}
function itemListLd(loc) {
  return [
    { '@context': 'https://schema.org', '@type': 'ItemList', name: UI[loc].catalog.title || UI.en.catalog.title, itemListElement: apps.map((a, i) => {
      const pl = a.locales.includes(loc) ? loc : a.primaryLocale;
      return { '@type': 'ListItem', position: i + 1, url: pageUrl(a, pl), name: a.name };
    }) },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'SETLOG', url: MAIN + '/', logo: MAIN + '/images/slplayer-icon.png' },
  ].map(ld).join('\n');
}
const catHreflang = () => hreflangLinks([['en', APPS + '/'], ['ko', APPS + '/ko/'], ['x-default', APPS + '/']]);

function replaceMarker(html, name, inner, file = 'apps/index.html') {
  const re = new RegExp(`(<!-- @gen:${name} -->)[\\s\\S]*?(<!-- /@gen -->)`);
  if (!re.test(html)) throw new Error(`marker @gen:${name} missing in ${file}`);
  return html.replace(re, (m, a, b) => `${a}\n${inner}\n${b}`);
}

// ---------- site pages (support / about): marker regions generated from data/apps.json (live apps only)
const PRIV_BASE = 'https://juki-j.github.io/privacy-policy/';
const PRIV_LABEL = { en: 'English', kr: '한국어', ja: '日本語' };
const byName = (x, y) => x.name.toLowerCase().localeCompare(y.name.toLowerCase());
function siteOf(a) {
  if (!a.site) { err(`${a.slug}: site{} missing (supportLabel/supportHref/privacyName/privacyLangs/about{en,ko}) — needed for support/privacy/about regions`); return null; }
  return a.site;
}
function supportChips() {
  return apps.slice().sort(byName).map((a) => {
    const s = siteOf(a); if (!s) return '';
    const ext = /^https?:/.test(s.supportHref);
    return `  <a class="chip" href="${esc(s.supportHref)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(s.supportLabel)}</a>`;
  }).filter(Boolean).join('\n');
}
function supportPrivacy() {
  return apps.slice().sort(byName).map((a) => {
    const s = siteOf(a); if (!s) return '';
    const links = (s.privacyLangs || []).map((l) => `<a href="${PRIV_BASE}${a.slug}-${l}.html">${PRIV_LABEL[l]}</a>`).join('');
    return `    <div><span>${esc(s.privacyName || a.name)}</span><small>${links}</small></div>`;
  }).filter(Boolean).join('\n');
}
function aboutList(lang) {
  return apps.map((a) => {
    const s = siteOf(a); if (!s) return '';
    const t = s.about && s.about[lang];
    if (!t) { err(`${a.slug}: site.about.${lang} missing`); return ''; }
    return `      <li><strong>${esc(t.name)}:</strong> ${esc(t.text)}</li>`;
  }).filter(Boolean).join('\n');
}
function regenMarkers(file, regions) {
  let html = readOut(file);
  for (const [name, inner] of regions) html = replaceMarker(html, name, inner, file);
  return writeIfChanged(file, html);
}

// ---------- build pages
const wordTable = [];
for (const a of apps) for (const loc of a.locales) {
  const c = i18n[a.slug][loc];
  if (!c) continue;
  if (!UI[loc]) { err(`${a.slug}/${loc}: no UI strings for locale`); continue; }
  wordTable.push([a.slug, loc, validateCopy(a, loc, c)]);
}
let changed = 0;
const generated = new Set();
{
  for (const a of apps) for (const loc of a.locales) {
    if (!i18n[a.slug][loc] || !UI[loc]) continue;
    const html = renderAppPage(a, loc);
    if (html == null) continue; // landing validation failed: nothing rendered, errors already recorded
    if (writeIfChanged(outFile(a, loc), html)) changed++;
    generated.add(outFile(a, loc));
  }
  // catalogs
  const idxPath = 'apps/index.html';
  let idx = readOut(idxPath);
  idx = replaceMarker(idx, 'head', catHreflang() + '\n' + itemListLd('en'));
  idx = replaceMarker(idx, 'cards', cardsHtml('en'));
  if (writeIfChanged(idxPath, idx)) changed++;
  const styleMatch = idx.match(/<style>([\s\S]*?)<\/style>/);
  const ko = UI.ko.catalog;
  const koHtml = render(tplCat, {
    lang: 'ko', title: esc(ko.title), description: esc(ko.description), canonical: APPS + '/ko/', hreflang: catHreflang(), ogLocale: 'ko_KR',
    jsonld: itemListLd('ko'), style: styleMatch ? styleMatch[1].replace(/\s*\.wave[^}]*\}\s*/g, '\n') : '', nav: navHtml('ko'),
    h1: esc(ko.h1), sub: esc(ko.sub), eyebrow: esc(ko.eyebrow), cards: cardsHtml('ko'), footerLinks: footerLinks('ko'),
  });
  if (writeIfChanged('apps/ko/index.html', koHtml)) changed++;
  if (regenMarkers('support.html', [['support-chips', supportChips()], ['support-privacy', supportPrivacy()]])) changed++;
  if (regenMarkers('about.html', [['about-en', aboutList('en')], ['about-ko', aboutList('ko')]])) changed++;
}

// ---------- functions/_generated.js (consumed by functions/_middleware.js and functions/go/[slug].js)
{
  const locs = {}, prim = {}, links = {};
  for (const a of apps) {
    locs[a.slug] = a.locales.slice(); prim[a.slug] = a.primaryLocale; links[a.slug] = {};
    for (const l of a.locales) links[a.slug][l] = { apple: storeLink(a, l), play: a.playUrl || null };
  }
  const js = '// GENERATED by scripts/build.mjs - do not edit by hand.\n'
    + `export const locales = ${JSON.stringify(locs, null, 1)};\n`
    + `export const primaryLocale = ${JSON.stringify(prim, null, 1)};\n`
    + `export const storeLinks = ${JSON.stringify(links, null, 1)};\n`;
  if (writeIfChanged('functions/_generated.js', js)) changed++;
}

// ---------- page inventory (disk) for sitemap + validators
function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', '.git', '.claude', '.wrangler', 'images', 'css', 'js', 'functions', 'data', 'scripts', 'templates', 'docs'].includes(e.name)) walk(rel, out); }
    else if (e.name.endsWith('.html')) out.push(rel);
  }
  return out;
}
const allHtml = [...new Set([...walk('.').map((p) => p.replace(/^\.\//, '')), ...[...pending.keys()].filter((k) => k.endsWith('.html'))])];
function fileToUrl(f) {
  if (f.startsWith('apps/')) { const r = f.slice(5).replace(/index\.html$/, ''); return APPS + '/' + r; }
  if (f === '404.html') return null;
  if (f.endsWith('index.html')) return MAIN + '/' + f.slice(0, -'index.html'.length);
  return MAIN + '/' + f.replace(/\.html$/, '');
}
function urlToFile(u) {
  let host, p;
  try { const x = new URL(u); host = x.origin; p = x.pathname; } catch { return null; }
  if (host === APPS) { const f = 'apps' + p; return p.endsWith('/') ? f + 'index.html' : f + '/index.html'; }
  if (host === MAIN) { if (p === '/') return 'index.html'; return p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1) + '.html'; }
  return null;
}
const mainPages = allHtml.filter((f) => !f.startsWith('apps/') && f !== '404.html');
const appPages = allHtml.filter((f) => f.startsWith('apps/'));

// lastmod state
const lmPath = 'data/lastmod.json';
const lm = exists(lmPath) ? readJson(lmPath) : {};
function lastmodFor(file) {
  const u = fileToUrl(file);
  const h = sha1(Buffer.from(readOut(file)));
  if (!lm[u]) lm[u] = { hash: h, date: TODAY };
  else if (lm[u].hash !== h) lm[u] = { hash: h, date: TODAY };
  return lm[u].date;
}
const order = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
const urlset = (items) => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + items.map(([u, d]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join('\n') + '\n</urlset>\n';
const mainItems = mainPages.map((f) => [fileToUrl(f), lastmodFor(f)]).sort((x, y) => (x[0] === MAIN + '/' ? -1 : y[0] === MAIN + '/' ? 1 : 0) || order(x[0], y[0]));
// keep the historical order: home, about, support, faq, contact, privacy, terms, guides/, guides... (home first, then lexical is fine for crawlers)
const appItems = appPages.map((f) => [fileToUrl(f), lastmodFor(f)]).sort((x, y) => order(x[0], y[0]));
for (const u of Object.keys(lm)) if (u.startsWith(APPS + '/') && !appItems.some(([x]) => x === u)) delete lm[u]; // removed app pages leave no stale lastmod state
writeIfChanged('sitemap.xml', urlset(mainItems));
writeIfChanged('apps-sitemap.xml', urlset(appItems));
writeIfChanged(lmPath, JSON.stringify(Object.fromEntries(Object.entries(lm).sort(([x], [y]) => order(x, y))), null, 1) + '\n');

// ---------- validators over disk
const pageInfo = new Map(); // url -> {file, html, host}
for (const f of [...mainPages, ...appPages]) pageInfo.set(fileToUrl(f), { file: f, html: readOut(f) });

const intentGuides = mainPages.filter((f) => /^(en|de|fr|ja)\/guides\//.test(f) || f === 'guides/play-mkv-on-mac.html');
const strictFiles = new Set([...appPages.filter((f) => generated.has(f) || f === 'apps/ko/index.html'), ...intentGuides]);
let jsonldCount = 0;
for (const [u, p] of pageInfo) {
  // JSON-LD parses
  for (const m of p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); jsonldCount++; } catch (e) { err(`${p.file}: JSON-LD parse error (${e.message})`); }
  }
  const canon = (p.html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (strictFiles.has(p.file)) {
    if (canon !== u) err(`${p.file}: canonical ${canon} != ${u}`);
    if (ADS_RE.test(p.html)) err(`${p.file}: contains ad code`);
    const visible = p.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    if (p.file.startsWith('apps/') && FREE_RE.test(visible)) err(`${p.file}: "free" wording in visible text`);
    if (intentGuides.includes(p.file) && FREE_RE.test(visible)) err(`${p.file}: "free" wording (${visible.match(FREE_RE)[0]})`);
    if (!ALLOW_PRICE && generated.has(p.file)) {
      const body = (p.html.split(/<body[^>]*>/)[1] || '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const re = new RegExp(PRICE_RE.source, 'giu');
      let m, n = 0;
      while ((m = re.exec(body)) && n++ < 5) err(`${p.file}: price/free wording "${m[0]}" in ...${body.slice(Math.max(0, m.index - 40), m.index + 40)}...`);
      // pricing-model wording anywhere in the page body (landing + SEO sections + attributes)
      const attrs = [...(p.html.split(/<body[^>]*>/)[1] || '').matchAll(/\s(?:alt|aria-label|title)="([^"]*)"/g)].map((x) => x[1]).join(' ');
      for (const [w2, ix] of scan(PRICING_MODEL_RE, body + ' ' + attrs)) err(`${p.file}: pricing-model wording "${w2}" in body ...${(body + ' ' + attrs).slice(Math.max(0, ix - 40), ix + 40)}...`);
    }
    if (generated.has(p.file) && p.html.includes('class="hero"')) {
      const region = (p.html.split('</header>')[1] || '').split('class="seo"')[0];
      const altText = [...region.matchAll(/\s(?:alt|aria-label)="([^"]*)"/g)].map((m) => m[1]).join(' ');
      const landText = region.replace(/<[^>]+>/g, ' ') + ' ' + altText;
      const lm2 = landText.match(PRICING_MODEL_RE);
      if (lm2) err(`${p.file}: pricing-model wording "${lm2[0]}" in landing area ...${landText.slice(Math.max(0, lm2.index - 40), lm2.index + 40).replace(/\s+/g, ' ')}...`);
    }
    const lang = (p.html.match(/<html lang="([^"]+)"/) || [])[1];
    if (!lang) err(`${p.file}: no html lang`);
    if (/\{\{\w+\}\}/.test(p.html)) err(`${p.file}: unreplaced template var`);
  }
}
// hreflang symmetry
const hre = new Map();
for (const [u, p] of pageInfo) {
  const set = new Map();
  for (const m of p.html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)) set.set(m[1], m[2]);
  if (set.size) hre.set(u, set);
}
let hreChecks = 0;
for (const [u, set] of hre) {
  const vals = [...set.values()];
  if (!vals.includes(u)) err(`hreflang: ${u} does not list itself`);
  if (!set.has('x-default')) err(`hreflang: ${u} lacks x-default`);
  const lang = (pageInfo.get(u).html.match(/<html lang="([^"]+)"/) || [])[1];
  if (set.get(lang) !== u && lang && !(lang === 'en' && set.get('en') === u)) err(`hreflang: ${u} html lang=${lang} but hreflang ${lang} -> ${set.get(lang)}`);
  for (const [l, target] of set) {
    hreChecks++;
    if (target === u) continue;
    const back = hre.get(target);
    if (!pageInfo.has(target)) { err(`hreflang: ${u} -> ${target} (${l}) does not exist`); continue; }
    if (!back) { err(`hreflang: ${target} (target of ${u}) has no hreflang set`); continue; }
    if (![...back.values()].includes(u)) err(`hreflang asymmetric: ${u} -> ${target} but not back`);
    const sameSet = [...set.entries()].every(([k, v]) => back.get(k) === v) && set.size === back.size;
    if (!sameSet) err(`hreflang: set of ${u} differs from set of ${target}`);
  }
}
// internal link / asset resolution
function resolveLocal(pageHost, href) {
  let h = href.split('#')[0].split('?')[0];
  if (!h || h.startsWith('/go/')) return true; // /go/<slug> is a Pages Function, not a file
  let host = pageHost;
  if (/^https?:\/\//.test(h)) { const x = new URL(h); if (x.origin !== MAIN && x.origin !== APPS) return true; host = x.origin; h = x.pathname; }
  else if (h.startsWith('//')) return true;
  else if (!h.startsWith('/')) return true; // relative / mailto / tel
  const cand = [];
  const redirects = ['/apps', '/apps/', '/privacy-policy', '/terms-of-service', '/about-us', '/blog', '/contact-us'];
  if (redirects.includes(h)) return true;
  if (host === APPS && h.startsWith('/apps/')) return true; // redirected to the apps host root
  if (host === APPS) { cand.push('apps' + h, 'apps' + (h.endsWith('/') ? h : h + '/') + 'index.html'); }
  cand.push(h.slice(1), h.slice(1) + '.html', (h.endsWith('/') ? h : h + '/').slice(1) + 'index.html');
  if (host === APPS && (h === '/robots.txt' || h === '/sitemap.xml')) return true;
  return cand.some((c) => c && pending.has(c)) || cand.some((c) => c && fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile());
}
let linkChecks = 0;
for (const [u, p] of pageInfo) {
  if (!strictFiles.has(p.file) && !p.file.startsWith('apps/')) continue;
  const host = u.startsWith(APPS) ? APPS : MAIN;
  for (const m of p.html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    linkChecks++;
    if (!resolveLocal(host, m[1])) err(`${p.file}: broken internal link ${m[1]}`);
  }
}
// sitemap vs historical 29 URLs
const oldUrls = Object.keys(readJson('data/lastmod.json')).filter((x) => x.startsWith(MAIN));
for (const u of oldUrls) if (!mainItems.some(([x]) => x === u)) err(`sitemap lost historical URL ${u}`);

// live check
if (CHECK_LIVE) {
  for (const a of apps) {
    let ok = false;
    for (const c of ['kr', 'us']) {
      try { const r = await fetch(`https://itunes.apple.com/lookup?id=${a.appStoreId}&country=${c}`); const t = JSON.parse(await r.text()); if (t.resultCount > 0) { ok = true; break; } } catch (e) { warns.push(`live check ${a.slug}: ${e.message}`); }
    }
    if (a.playUrl) {
      try { const r = await fetch(a.playUrl, { redirect: 'follow' }); if (r.status !== 200) err(`${a.slug}: playUrl returned HTTP ${r.status} (${a.playUrl})`); } catch (e) { err(`${a.slug}: playUrl fetch failed (${e.message})`); }
    }
    if (!ok) err(`${a.slug}: appStoreId ${a.appStoreId} not found on iTunes Lookup (kr/us)`);
  }
}

// ---------- write outputs only when everything passed
if (!errors.length) flushPending();
else console.error(`NOT writing ${[...pending.keys()].length} output files: ${errors.length} validation error(s)`);

// ---------- IndexNow
if (INDEXNOW) {
  if (errors.length) { console.error('IndexNow skipped: build has errors'); }
  else {
    const keyFiles = fs.readdirSync(ROOT).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
    if (keyFiles.length !== 1) { err(`IndexNow: expected exactly one <32-hex>.txt key file at the repo root, found ${keyFiles.length}`); }
    else {
      const key = keyFiles[0].slice(0, -4);
      if (fs.readFileSync(path.join(ROOT, keyFiles[0]), 'utf8').trim() !== key) err('IndexNow: key file content must equal its file name');
      const since = (ARGS.find((a) => a.startsWith('--since=')) || '').slice(8) || TODAY;
      const live = new Set([...mainItems, ...appItems].map(([u]) => u));
      const urls = Object.entries(lm).filter(([u, v]) => live.has(u) && v.date >= since).map(([u]) => u);
      for (const host of [MAIN, APPS]) {
        const list = urls.filter((u) => u.startsWith(host + '/'));
        if (!list.length) { console.log(`IndexNow ${host}: no changed URLs since ${since}`); continue; }
        const body = { host: new URL(host).hostname, key, keyLocation: `${host}/${key}.txt`, urlList: list };
        if (DRY_RUN) { console.log(`IndexNow DRY-RUN POST https://api.indexnow.org/indexnow\n${JSON.stringify(body, null, 2)}`); continue; }
        try {
          const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
          console.log(`IndexNow ${host}: HTTP ${r.status} (${list.length} urls)`);
          if (r.status >= 300) err(`IndexNow ${host}: HTTP ${r.status}`);
        } catch (e) { err(`IndexNow ${host}: ${e.message}`); }
      }
    }
  }
}

// ---------- report
console.log(`apps live: ${apps.length}; pages: ${wordTable.length} (written/updated this run: ${changed})`);
for (const [s, l, w] of wordTable) console.log(`  ${s}/${l}: ${w} words`);
console.log(`sitemap.xml: ${mainItems.length} urls; apps-sitemap.xml: ${appItems.length} urls; JSON-LD blocks parsed: ${jsonldCount}; hreflang pairs checked: ${hreChecks}; links checked: ${linkChecks}`);
if (ALLOW_PLAIN) console.log('NOTE: --allow-plain-links (local preview only; do not deploy with plain App Store links)');
console.log('landing spec rows dropped (pricing/Pro): ' + droppedSpecs.map(([s, l, n]) => `${s}/${l}=${n}`).join(' '));
for (const w of warns) console.log('warn: ' + w);
if (errors.length) { console.error(`\nFAILED with ${errors.length} error(s):`); for (const e of errors) console.error(' - ' + e); process.exit(1); }
console.log('OK: all validators passed');
