// /go/<slug>?l=<lang>&store=<apple|play>&pos=<header|hero|mid|close>&src=<gads|web|...>
// 302 to the App Store / Google Play link, counting the click in Workers Analytics Engine (env.CLICKS, optional).
import { locales, primaryLocale, storeLinks } from '../_generated.js';
import { BOT_UA } from '../_bots.js'; // shared with _middleware.js

const norm = (v) => { v = typeof v === 'string' ? v.toLowerCase() : ''; return /^[a-z0-9-]{1,32}$/.test(v) ? v : 'other'; };

export function onRequestGet({ request, params, env }) {
  const url = new URL(request.url);
  const slug = String(params.slug || '').toLowerCase();
  const links = Object.hasOwn(storeLinks, slug) ? storeLinks[slug] : null;
  if (!links) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

  const q = url.searchParams;
  const reqLang = (q.get('l') || '').toLowerCase();
  const lang = (Object.hasOwn(locales, slug) ? locales[slug] : []).includes(reqLang) ? reqLang : primaryLocale[slug];
  const entry = links[lang] || links[primaryLocale[slug]];
  const src = q.has('src') ? norm(q.get('src')) : 'web';
  const pos = q.has('pos') ? norm(q.get('pos')) : 'none';
  const ua = request.headers.get('User-Agent') || '';
  const reqStore = (q.get('store') || '').toLowerCase();
  let store = reqStore === 'play' ? 'play' : reqStore === 'apple' ? 'apple' : (/Android/i.test(ua) && entry.play ? 'play' : 'apple');
  if (store === 'play' && !entry.play) store = 'apple';

  let target;
  if (store === 'play') {
    target = entry.play;
    if (src !== 'other' && !/[?&]referrer=/.test(target)) {
      target += (target.includes('?') ? '&' : '?') + 'referrer=' + encodeURIComponent('utm_source=' + src);
    }
  } else {
    target = entry.apple;
    if (src === 'gads') target = target.replace(/([?&]ct=)[^&#]*/, '$1' + encodeURIComponent('gads-' + slug + '-' + lang));
  }

  try {
    if (request.method !== 'HEAD' && !BOT_UA.test(ua)) env?.CLICKS?.writeDataPoint({
      blobs: [slug, lang, store, pos, src, request.cf?.country || ''],
      doubles: [1],
      indexes: [slug],
    });
  } catch (e) { /* counting must never break the redirect */ }

  return new Response(null, {
    status: 302,
    headers: { Location: target, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer-when-downgrade' },
  });
}

export const onRequestHead = onRequestGet;
