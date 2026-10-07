// Host routing for the single Pages project `setlogapps`.
//   setlog.net        -> content hub (index.html) + guides etc.
//   www.setlog.net    -> 301 https://setlog.net/<same path>
//   apps.setlog.net   -> app catalogue (/apps/index.html served at "/"); content pages 301 to setlog.net
//   setlog.net/apps/  -> 301 https://apps.setlog.net/
const MAIN = 'https://setlog.net';
const APPS = 'https://apps.setlog.net';
// content pages that live only on the main host (avoid duplicate content on apps host)
const MAIN_ONLY = /^\/(guides|about|faq|support|contact|privacy|terms)(\/|$|\.html$)/;

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (host === 'www.setlog.net') {
    return Response.redirect(MAIN + path + url.search, 301);
  }

  if (host === 'apps.setlog.net') {
    if (path === '/robots.txt') {
      return new Response('User-agent: *\nAllow: /\n\nSitemap: ' + APPS + '/sitemap.xml\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
      });
    }
    if (path === '/sitemap.xml') {
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' + APPS + '/</loc><lastmod>2026-10-07</lastmod></url>\n</urlset>\n';
      return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
    }
    if (path === '/' || path === '/index.html') {
      const res = await env.ASSETS.fetch(new URL('/apps/', url));
      return new Response(res.body, { status: res.status, headers: res.headers });
    }
    if (path === '/apps' || path === '/apps/' || path === '/apps/index.html') {
      return Response.redirect(APPS + '/', 301);
    }
    if (MAIN_ONLY.test(path)) {
      return Response.redirect(MAIN + path + url.search, 301);
    }
    return next();
  }

  // setlog.net (and *.pages.dev previews): the catalogue lives on apps.setlog.net
  if (host === 'setlog.net' && (path === '/apps' || path === '/apps/' || path === '/apps/index.html')) {
    return Response.redirect(APPS + '/', 301);
  }
  return next();
}
