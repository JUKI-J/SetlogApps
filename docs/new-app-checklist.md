# 신규 앱 페이지 세트 체크리스트

레지스트리 1건 + 로케일 카피 + 이미지를 넣고 `node scripts/build.mjs`를 돌리면 앱 페이지·카탈로그 카드·ItemList/SoftwareApplication/FAQ/Breadcrumb 스키마·`sitemap`이 생성된다.
정본 계획: `.claude/plans/drafts/20261025-app-pages-seo.md` (출시 앱은 예외 없이 전부 적용).

## 절차

1. [ ] ASC 승인·판매 개시 확인 (`hub asc-sync` 또는 `https://itunes.apple.com/lookup?id=<ID>&country=kr`)
2. [ ] **ASC 캠페인 링크 생성기**로 로케일별 링크 생성 (`ct=web-<slug>-<locale>`, 예: `web-slplayer-de`). **직접 조립 금지** — 생성기 결과를 그대로 `campaignLink`에 로케일 맵으로 붙여넣는다.
3. [ ] `data/apps.json`에 엔트리 추가 (`status: "live"`). `forbiddenClaims`에 미출시/제거 기능 기입. 스키마: `data/apps.schema.json`.
   - slug는 루트 디렉토리명(`apps`, `guides`, `css`, `js`, `images` …)과 겹치면 안 된다 (빌드가 거부).
   - 사이트에 노출하지 않을 단계(예약)는 `status: "hidden"`.
4. [ ] 키워드: Google Ads 검색어 보고서·Apple Ads 검색어·ASC 키워드에서 로케일별 3–5개 → `keywords`.
5. [ ] `data/i18n/<slug>.<locale>.json` 작성 — 로케일당 **350단어+**(ja는 글자수/3), 번역이 아니라 그 시장의 검색어로 쓴다. 실제로 현지화된 로케일 + 키워드 근거가 있는 로케일만 만든다(thin content 금지).
   - 금지: `free/무료/gratuit/kostenlos/無料` 계열 단어(빌드 실패), 미출시 기능, 가격, 평점, 광고 코드.
6. [ ] 스크린샷: `/store-screenshots` 산출물에서 3–5장을 WebP로 변환 → `images/apps/<slug>/<locale>/NN.webp` (가로형 폭 ≤1000, 세로형 폭 ≤420, `cwebp -q 80`). JSON에 w/h·alt(화면에 보이는 것을 서술)·caption.
7. [ ] 아이콘 `images/<slug>-icon.png`.
8. [ ] `node scripts/build.mjs --check-live` 통과 (캠페인 링크 미입력 상태의 로컬 확인은 `--allow-plain-links`; **그 상태로 배포 금지**).
9. [ ] 로컬 미리보기: `npx wrangler pages dev .` → `curl -H 'Host: apps.setlog.net' http://localhost:8788/<slug>/` 등. Rich Results Test로 스키마, hreflang 확인.
10. [ ] 커밋·푸시(사용자 요청 시) → Pages 배포
11. [ ] GSC URL 검사 → 색인 요청(로케일별). 사이트맵: `https://setlog.net/sitemap.xml`, `https://apps.setlog.net/sitemap.xml`(= `apps-sitemap.xml`)
12. [ ] Bing Webmaster 제출(IndexNow)
13. [ ] Hub: 프로젝트 next 갱신("웹 페이지 게시 완료")

## 생성되는 것 / 손대지 않는 것

| 파일 | 방식 |
|---|---|
| `apps/<slug>/index.html`, `apps/<slug>/<locale>/index.html`, `apps/ko/index.html` | 전체 생성 (직접 수정 금지, 상단 주석 참고) |
| `apps/index.html` | `<!-- @gen:head -->`·`<!-- @gen:cards -->` 마커 사이만 생성, 나머지 수작업 영역 보존 |
| `sitemap.xml`, `apps-sitemap.xml`, `data/lastmod.json` | 생성 (lastmod = 파일 내용 해시가 바뀐 날) |
| `guides/*.html`, `{en,de,fr}/guides/*.html` | 수작업 (의도 가이드) — 빌드는 검증·사이트맵 등재만 |

URL 규칙: 기본 로케일은 `/<slug>/`, 나머지는 `/<slug>/<locale>/`. `x-default` = 기본 로케일.
