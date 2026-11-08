#!/bin/bash
# Smoke test against `npx wrangler pages dev . --port 8788` (host header emulates the two domains).
# Prints "<status> <host> <path> [-> redirect]". Exit 1 if any 404/5xx where 200/301 expected.
B=${B:-http://localhost:8788}; bad=0
chk(){ # host path [expected-prefix]
  out=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -H "Host: $1" "$B$2"); code=${out%% *}
  echo "$code $1 $2 ${out#* }"; case $code in 404|5??) bad=1;; esac; }
for u in $(git show HEAD:sitemap.xml | grep -o '<loc>[^<]*' | sed 's/<loc>https:\/\/setlog.net//'); do chk setlog.net "$u"; done
for u in / /ko/ /robots.txt /sitemap.xml /guides/slplayer /apps/ /apps/slplayer/; do chk apps.setlog.net "$u"; done
for u in $(grep -o '<loc>[^<]*' apps-sitemap.xml | sed 's/<loc>https:\/\/apps.setlog.net//'); do chk apps.setlog.net "$u"; done
for u in $(grep -o '<loc>[^<]*' sitemap.xml | sed 's/<loc>https:\/\/setlog.net//'); do chk setlog.net "$u"; done
for k in $(ls [0-9a-f]*.txt 2>/dev/null | grep -E '^[0-9a-f]{32}\.txt$'); do chk setlog.net "/$k"; chk apps.setlog.net "/$k"; done
chk apps.setlog.net /slplayer; chk apps.setlog.net /nonexistent/; chk setlog.net /apps/slplayer/; chk www.setlog.net /about
# language detection (needs lang-aware middleware; B/H may be overridden for remote runs)
H=${H:-apps.setlog.net}
lang(){ # label expect-code expect-location-substr curl-args... url-path
  label=$1; ec=$2; el=$3; shift 3; path=${@: -1}
  out=$(curl -s -o /dev/null -D - -H "Host: $H" "${@:1:$#-1}" "$B$path" | tr -d '\r')
  code=$(echo "$out" | head -1 | awk '{print $2}'); loc=$(echo "$out" | awk 'tolower($1)=="location:"{print $2}')
  ok=OK; [ "$code" = "$ec" ] || ok=FAIL; [ -z "$el" ] || case "$loc" in *"$el") ;; *) ok=FAIL;; esac
  echo "$ok lang-$label $code ${loc:-}"; [ $ok = OK ] || bad=1; }
lang a 302 "/slplayer/de/?src=gads" -H 'Accept-Language: de-DE,de;q=0.9' /slplayer/?src=gads
lang b 200 "" -H 'Accept-Language: de-DE,de;q=0.9' -A Googlebot /slplayer/?src=gads
lang c 200 "" -H 'Accept-Language: ko' /slplayer/de/
lang d 302 "/slplayer/ja/" -H 'Accept-Language: ja' /slplayer/
lang e 302 "/slplayer/?src=gads" '/slplayer/de/?lang=en&src=gads'
lang f 302 /slplayer/de/ -H 'Cookie: lang=de' /slplayer/
lang g 302 "/charcoalplayer/de/" -H 'Accept-Language: de' /charcoalplayer/
# review fixes (plan 20261108 §3/§4)
lang h 200 "" -H 'Accept-Language: de' /slplayer/?lang=en
c=$(curl -s -o /dev/null -D - -H "Host: $H" -H 'Accept-Language: de' "$B/slplayer/?lang=en" | tr -d '\r' | grep -ic '^set-cookie: lang=en'); [ "$c" = 1 ] && echo "OK lang-h-cookie" || { echo "FAIL lang-h-cookie"; bad=1; }
lang i 404 "" /constructor/
lang j 404 "" /__proto__/
lang k 301 "/slplayer/?x=1" /slplayer/en/?x=1
lang l 301 "/slplayer/" /SLPLAYER/
lang m 302 "/slplayer/de/?lang=" -H 'Accept-Language: de' /slplayer/?lang=
lang n 302 "/slplayer/de/" /slplayer/?lang=DE
# 12-language rollout (plan 20261108 rev 3, section 2d): Accept-Language mapping + case-insensitive ?lang= (needs zipda zh-hans/zh-hant/pt-br/es pages built)
lang o 302 "/zipda/zh-hant/" -H 'Accept-Language: zh-TW,zh;q=0.9' /zipda/
lang p 302 "/zipda/zh-hans/" -H 'Accept-Language: zh-CN' /zipda/
lang q 302 "/zipda/pt-br/" -H 'Accept-Language: pt-PT' /zipda/
lang r 302 "/zipda/es/" -H 'Accept-Language: es-MX' /zipda/
lang s 200 "" -H 'Accept-Language: en' /zipda/zh-hans/
lang t 302 "/zipda/zh-hant/" '/zipda/?lang=zh-Hant'
c=$(curl -s -o /dev/null -D - -H "Host: $H" "$B/zipda/?lang=zh-Hant" | tr -d '\r' | grep -ic '^set-cookie: lang=zh-hant'); [ "$c" = 1 ] && echo "OK lang-t-cookie" || { echo "FAIL lang-t-cookie"; bad=1; }
c=$(curl -s -H "Host: $H" "$B/zipda/zh-hant/" | grep -c '<html lang="zh-Hant"'); [ "$c" = 1 ] && echo "OK lang-t-html" || { echo "FAIL lang-t-html"; bad=1; }
lang u 302 "/slplayer/ko/" '/slplayer/de/?lang=ko'
lang v 200 "" '/slplayer/de/?lang=de'
node "$(dirname "$0")/lang-test.mjs" || bad=1
G=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $H" "$B/go/constructor"); echo "go-constructor $G"; [ "$G" = 404 ] || bad=1
G=$(curl -s -o /dev/null -w "%{http_code}" -I -H "Host: $H" "$B/go/slplayer"); echo "go-HEAD-slplayer $G"; [ "$G" = 302 ] || bad=1
exit $bad
