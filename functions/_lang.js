// Language-tag normalisation shared by functions/_middleware.js (unit-tested in scripts/smoke.sh via node).
// language tag (Accept-Language token, cookie value, ?lang=) -> site locale code; null when not a language tag
// zh-cn|zh-sg|zh-hans* -> zh-hans; zh-tw|zh-hk|zh-mo|zh-hant* -> zh-hant; other zh -> zh-hans; pt* -> pt-br; else the 2-letter language
export function normalizeLang(tag) {
  let t = String(tag || '').trim().toLowerCase().replace(/_/g, '-');
  t = t.replace(/-[ux](?:-.*)?$/, ''); // drop private/extension singletons (de-DE-u-co-phonebk -> de-de)
  if (!/^[a-z]{2}(?:-[a-z0-9]{2,8})*$/.test(t)) return null; // 2-letter primary subtag only (3-letter codes are not site locales)
  const base = t.slice(0, 2);
  if (base === 'zh') return /^zh-(tw|hk|mo|hant)/.test(t) ? 'zh-hant' : 'zh-hans';
  if (base === 'pt') return 'pt-br';
  return base;
}

export function parseAcceptLanguage(header) {
  return (header || '').split(',').map((tok, idx) => {
    const [tag, ...params] = tok.trim().split(';');
    let q = 1;
    for (const p of params) {
      const mm = p.trim().match(/^q=(.*)$/i);
      if (mm) q = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(mm[1].trim()) ? parseFloat(mm[1]) : NaN; // malformed q -> drop token
    }
    return { lang: normalizeLang(tag), q, idx };
  }).filter((x) => x.lang && !Number.isNaN(x.q) && x.q > 0).sort((a, b) => b.q - a.q || a.idx - b.idx).map((x) => x.lang);
}

