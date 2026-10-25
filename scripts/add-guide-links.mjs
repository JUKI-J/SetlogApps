#!/usr/bin/env node
// One-shot, idempotent: adds BreadcrumbList JSON-LD to existing guides/*.html and a link to the matching
// app page (apps.setlog.net/<slug>/) on the per-app guides. Safe to re-run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/apps.json'), 'utf8')).apps;
const bySlug = Object.fromEntries(reg.map((a) => [a.slug, a]));
let n = 0;
for (const f of fs.readdirSync(path.join(ROOT, 'guides'))) {
  if (!f.endsWith('.html') || f === 'index.html') continue;
  const p = path.join(ROOT, 'guides', f);
  let s = fs.readFileSync(p, 'utf8');
  const o = s;
  const slug = f.replace(/\.html$/, '');
  const url = `https://setlog.net/guides/${slug}`;
  const crumb = (s.match(/<p class="crumbs">[\s\S]*?\/ ([^<\/]+)<\/p>/) || [])[1];
  if (crumb && !s.includes('"BreadcrumbList"')) {
    const bc = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://setlog.net/' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://setlog.net/guides/' },
      { '@type': 'ListItem', position: 3, name: crumb.trim(), item: url } ] };
    s = s.replace('<link rel="stylesheet" href="/css/site.css">', `<script type="application/ld+json">${JSON.stringify(bc)}</script>\n<link rel="stylesheet" href="/css/site.css">`);
  }
  const a = bySlug[slug];
  if (a && a.status === 'live' && !s.includes('class="app-page-link"')) {
    const ko = a.locales.includes('ko') ? `https://apps.setlog.net/${a.slug}/${a.primaryLocale === 'ko' ? '' : 'ko/'}` : null;
    const en = a.locales.includes('en') ? `https://apps.setlog.net/${a.slug}/` : null;
    const parts = [];
    if (ko) parts.push(`앱 소개 페이지: <a href="${ko}">${a.name}</a>`);
    if (en) parts.push(`App page: <a href="${en}">${a.name}</a>`);
    if (parts.length) s = s.replace(/(<p class="meta-line">[^<]*<\/p>)/, `$1\n  <p class="app-page-link meta-line">${parts.join(' · ')}</p>`);
  }
  if (s !== o) { fs.writeFileSync(p, s); n++; }
}
console.log('guides updated:', n);
