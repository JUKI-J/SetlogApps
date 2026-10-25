#!/bin/bash
# Smoke test against `npx wrangler pages dev . --port 8788` (host header emulates the two domains).
# Prints "<status> <host> <path> [-> redirect]". Exit 1 if any 404/5xx where 200/301 expected.
B=http://localhost:8788; bad=0
chk(){ # host path [expected-prefix]
  out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -H "Host: $1" "$B$2"); code=${out%% *}
  echo "$code $1 $2 ${out#* }"; case $code in 404|5??) bad=1;; esac; }
for u in $(git show HEAD:sitemap.xml | grep -o '<loc>[^<]*' | sed 's/<loc>https:\/\/setlog.net//'); do chk setlog.net "$u"; done
for u in / /ko/ /robots.txt /sitemap.xml /guides/slplayer /apps/ /apps/slplayer/; do chk apps.setlog.net "$u"; done
for u in $(grep -o '<loc>[^<]*' apps-sitemap.xml | sed 's/<loc>https:\/\/apps.setlog.net//'); do chk apps.setlog.net "$u"; done
for u in $(grep -o '<loc>[^<]*' sitemap.xml | sed 's/<loc>https:\/\/setlog.net//'); do chk setlog.net "$u"; done
for k in $(ls [0-9a-f]*.txt 2>/dev/null | grep -E '^[0-9a-f]{32}\.txt$'); do chk setlog.net "/$k"; chk apps.setlog.net "/$k"; done
chk apps.setlog.net /slplayer; chk apps.setlog.net /nonexistent/; chk setlog.net /apps/slplayer/; chk www.setlog.net /about
exit $bad
