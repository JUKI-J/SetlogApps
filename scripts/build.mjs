#!/usr/bin/env node
// SetlogApps page generator + validators. Node stdlib only.
//   node scripts/build.mjs                       build (fails when a campaignLink is missing)
//   node scripts/build.mjs --allow-plain-links   LOCAL PREVIEW ONLY: falls back to https://apps.apple.com/app/id<ID>
//   node scripts/build.mjs --check-live          also verify every live appStoreId via iTunes Lookup (network)
//   node scripts/build.mjs --today=YYYY-MM-DD    override "today" for lastmod
// Reads data/apps.json + data/i18n/*.json + templates/*.html, writes apps/<slug>/**, apps/ko/index.html,
// the marker regions of apps/index.html, sitemap.xml, apps-sitemap.xml, data/lastmod.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARGS = process.argv.slice(2);
const ALLOW_PLAIN = ARGS.includes('--allow-plain-links');
const CHECK_LIVE = ARGS.includes('--check-live');
const TODAY = (ARGS.find((a) => a.startsWith('--today=')) || '').slice(8) || new Date().toISOString().slice(0, 10);
const MAIN = 'https://setlog.net';
const APPS = 'https://apps.setlog.net';
const LOCALES = ['en', 'ko', 'de', 'fr', 'ja'];
const RESERVED_SLUGS = new Set(['apps', 'guides', 'css', 'js', 'images', 'functions', 'data', 'scripts', 'templates', 'docs', 'en', 'de', 'fr', 'ja', 'ko', 'about', 'faq', 'support', 'contact', 'privacy', 'terms', 'robots', 'sitemap']);
const SCHEMA_CATEGORY = { 'Utilities': 'UtilitiesApplication', 'Photo & Video': 'MultimediaApplication', 'Music': 'MultimediaApplication', 'Health & Fitness': 'HealthApplication', 'Sports': 'SportsApplication', 'Productivity': 'BusinessApplication', 'Food & Drink': 'LifestyleApplication' };
const FREE_RE = /\bfree\b|gratuit|kostenlos|kostenfrei|gratis|무료|無料|フリー/i;
const ADS_RE = /adsbygoogle|googlesyndication|doubleclick|googletagservices/i;

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ld = (o) => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>';
const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');

function writeIfChanged(rel, content) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== content) { fs.writeFileSync(p, content); return true; }
  return false;
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

// ---------- load
const registry = readJson('data/apps.json');
validateSchema(registry, readJson('data/apps.schema.json'), 'apps.json', err);
const UI = readJson('data/i18n/_ui.json');
const apps = registry.apps.filter((a) => a.status === 'live');
const seen = new Set();
for (const a of registry.apps) {
  if (seen.has(a.slug)) err(`duplicate slug ${a.slug}`);
  seen.add(a.slug);
  if (RESERVED_SLUGS.has(a.slug)) err(`slug ${a.slug} collides with a reserved path`);
  if (!a.locales.includes(a.primaryLocale)) err(`${a.slug}: primaryLocale not in locales`);
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

function storeLink(a, loc) {
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
  for (const f of c.features || []) parts.push(f.h, f.p);
  for (const s of c.specs || []) parts.push(s.k, s.v);
  parts.push(...(c.limits || []));
  for (const q of c.faq || []) parts.push(q.q, q.a);
  const text = parts.join(' ');
  if (loc === 'ja') return Math.round(text.replace(/\s/g, '').length / 3);
  return text.split(/\s+/).filter(Boolean).length;
}
function allCopyText(c) {
  return JSON.stringify(c, (k, v) => (k === 'src' || k === 'locale' ? undefined : v));
}
const osLabel = (a) => a.minOS.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s + '+').join(', ');
const localized = (obj, loc, fb) => (obj && (obj[loc] || obj.en || obj[fb] || Object.values(obj)[0])) || '';

function validateCopy(a, loc, c) {
  const w = `${a.slug}/${loc}`;
  if (c.locale !== loc) err(`${w}: locale field is "${c.locale}"`);
  for (const k of ['title', 'description', 'h1', 'tagline']) if (!c[k] || typeof c[k] !== 'string') err(`${w}: missing ${k}`);
  if (c.title && c.title.length > 60) err(`${w}: title ${c.title.length} chars > 60`);
  if (c.description && (c.description.length < (['ko', 'ja'].includes(loc) ? 60 : 120) || c.description.length > 155)) err(`${w}: description ${c.description.length} chars (need 120-155; ko/ja 60-155)`);
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
  for (const f of a.forbiddenClaims) if (f && text.toLowerCase().includes(f.toLowerCase())) err(`${w}: forbiddenClaim "${f}" present`);
  if (/<[a-z][^>]*>/i.test(text.replace(/\\"/g, ''))) warns.push(`${w}: copy contains HTML-like tags (will be escaped)`);
  return words;
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
const tplCat = fs.readFileSync(path.join(ROOT, 'templates/catalog.html'), 'utf8');
const pagesOut = []; // {file, url}

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
  const hre = a.locales.map((l) => [l, pageUrl(a, l)]);
  hre.push(['x-default', pageUrl(a, a.primaryLocale)]);
  const catalogHref = catalogPath(loc === 'ko' ? 'ko' : 'en');
  const platformsLine = a.platforms.join(', ');
  const spec = [[ui.spec.platforms, platformsLine], [ui.spec.requires, osLabel(a)], ...c.specs.map((s) => [s.k, s.v])]
    .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  const cta = `<a class="primary" href="${esc(link)}" rel="noopener">${esc(ui.storeBtn[a.storeKind])}</a>` + (a.playUrl ? `<a href="${esc(a.playUrl)}" rel="noopener">${esc(ui.playBtn)}</a>` : '');
  const langSwitch = a.locales.length > 1
    ? `<p class="lang-switch">${esc(ui.h.languages)}: ` + a.locales.map((l) => l === loc ? `<a aria-current="page" lang="${l}" hreflang="${l}" href="${pagePath(a, l)}">${esc(UI[l].langName)}</a>` : `<a lang="${l}" hreflang="${l}" href="${pagePath(a, l)}">${esc(UI[l].langName)}</a>`).join(' &middot; ') + '</p>'
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
    description: c.description, inLanguage: loc, downloadUrl: link,
    screenshot: c.screenshots.map((s) => MAIN + s.src),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'SETLOG', url: MAIN + '/' },
    publisher: { '@type': 'Organization', name: 'SETLOG', url: MAIN + '/' },
    dateModified: a.updated,
  };
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: loc, mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  const bc = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'SETLOG ' + ui.crumbApps, item: APPS + catalogHref },
    { '@type': 'ListItem', position: 2, name: a.name, item: url } ] };
  const html = render(tplApp, {
    lang: loc, title: esc(c.title), description: esc(c.description), canonical: url, hreflang: hreflangLinks(hre),
    ogImage, ogLocale: ui.ogLocale, itunesMeta: a.storeKind === 'ios' ? `<meta name="apple-itunes-app" content="app-id=${a.appStoreId}">` : '',
    jsonld: [sw, faq, bc].map(ld).join('\n'), nav: navHtml(loc), catalogHref, crumbApps: esc(ui.crumbApps), appName: esc(a.name),
    icon: a.icon, h1: esc(c.h1), tagline: esc(c.tagline), langSwitch, cta,
    hSummary: esc(ui.h.summary), summary: c.summary.map((s) => `<li>${esc(s)}</li>`).join(''),
    overview: (c.overview || []).map((p) => `<p>${esc(p)}</p>`).join('\n  '),
    hFeatures: esc(ui.h.features), features: c.features.map((f) => `<h3>${esc(f.h)}</h3>\n  <p>${esc(f.p)}</p>`).join('\n  '),
    hScreenshots: esc(ui.h.screenshots), shots, hSpecs: esc(ui.h.specs), specs: spec,
    hLimits: esc(ui.h.limits), limits: c.limits.map((l) => `<li>${esc(l)}</li>`).join(''),
    hFaq: esc(ui.h.faq), faq: c.faq.map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n  '),
    related, others: othersHtml, footerLinks: footerLinks(loc), footerSupport: esc(ui.footerSupport),
  });
  return html;
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

function replaceMarker(html, name, inner) {
  const re = new RegExp(`(<!-- @gen:${name} -->)[\\s\\S]*?(<!-- /@gen -->)`);
  if (!re.test(html)) throw new Error(`marker @gen:${name} missing in apps/index.html`);
  return html.replace(re, (m, a, b) => `${a}\n${inner}\n${b}`);
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
if (!errors.length || true) {
  for (const a of apps) for (const loc of a.locales) {
    if (!i18n[a.slug][loc] || !UI[loc]) continue;
    const html = renderAppPage(a, loc);
    if (writeIfChanged(outFile(a, loc), html)) changed++;
    generated.add(outFile(a, loc));
  }
  // catalogs
  const idxPath = 'apps/index.html';
  let idx = fs.readFileSync(path.join(ROOT, idxPath), 'utf8');
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
const allHtml = walk('.').map((p) => p.replace(/^\.\//, ''));
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
  const h = sha1(fs.readFileSync(path.join(ROOT, file)));
  if (!lm[u]) lm[u] = { hash: h, date: TODAY };
  else if (lm[u].hash !== h) lm[u] = { hash: h, date: TODAY };
  return lm[u].date;
}
const order = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
const urlset = (items) => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + items.map(([u, d]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join('\n') + '\n</urlset>\n';
const mainItems = mainPages.map((f) => [fileToUrl(f), lastmodFor(f)]).sort((x, y) => (x[0] === MAIN + '/' ? -1 : y[0] === MAIN + '/' ? 1 : 0) || order(x[0], y[0]));
// keep the historical order: home, about, support, faq, contact, privacy, terms, guides/, guides... (home first, then lexical is fine for crawlers)
const appItems = appPages.map((f) => [fileToUrl(f), lastmodFor(f)]).sort((x, y) => order(x[0], y[0]));
writeIfChanged('sitemap.xml', urlset(mainItems));
writeIfChanged('apps-sitemap.xml', urlset(appItems));
writeIfChanged(lmPath, JSON.stringify(Object.fromEntries(Object.entries(lm).sort(([x], [y]) => order(x, y))), null, 1) + '\n');

// ---------- validators over disk
const pageInfo = new Map(); // url -> {file, html, host}
for (const f of [...mainPages, ...appPages]) pageInfo.set(fileToUrl(f), { file: f, html: fs.readFileSync(path.join(ROOT, f), 'utf8') });

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
  if (!h) return true;
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
  return cand.some((c) => c && fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile());
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
    if (!ok) err(`${a.slug}: appStoreId ${a.appStoreId} not found on iTunes Lookup (kr/us)`);
  }
}

// ---------- report
console.log(`apps live: ${apps.length}; pages: ${wordTable.length} (written/updated this run: ${changed})`);
for (const [s, l, w] of wordTable) console.log(`  ${s}/${l}: ${w} words`);
console.log(`sitemap.xml: ${mainItems.length} urls; apps-sitemap.xml: ${appItems.length} urls; JSON-LD blocks parsed: ${jsonldCount}; hreflang pairs checked: ${hreChecks}; links checked: ${linkChecks}`);
if (ALLOW_PLAIN) console.log('NOTE: --allow-plain-links (local preview only; do not deploy with plain App Store links)');
for (const w of warns) console.log('warn: ' + w);
if (errors.length) { console.error(`\nFAILED with ${errors.length} error(s):`); for (const e of errors) console.error(' - ' + e); process.exit(1); }
console.log('OK: all validators passed');
