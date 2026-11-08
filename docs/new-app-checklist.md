# 신규 앱 페이지 세트 체크리스트

레지스트리 1건 + 로케일 카피 + 이미지를 넣고 `node scripts/build.mjs`를 돌리면 앱 페이지·카탈로그 카드·ItemList/SoftwareApplication/FAQ/Breadcrumb 스키마·`sitemap`이 생성된다.
   - 빌드는 **Node 23 이상**(현재 24)에서 실행한다 — 금지어 정규식이 `(?-i:…)` 문법을 쓴다. PATH를 시스템 기본으로 바꾸면 Node 19가 잡혀 wrangler·빌드 모두 실패한다.
**전제: 출시(ASC 승인·판매 개시) 후에만 진행한다. 미출시 앱 페이지는 만들지 않는다.**
정본 계획: `.claude/plans/drafts/20261025-app-pages-seo.md` (출시 앱은 예외 없이 전부 적용).

## 절차

1. [ ] ASC 승인·판매 개시 확인 (`hub asc-sync` 또는 `https://itunes.apple.com/lookup?id=<ID>&country=kr`)
2. [ ] **ASC 캠페인 링크 생성기**로 로케일별 링크 생성 (`ct=web-<slug>-<locale>`, 예: `web-slplayer-de`). **직접 조립 금지** — 생성기 결과를 그대로 `campaignLink`에 로케일 맵으로 붙여넣는다. 로케일마다 `ct=web-<slug>-<loc>`(소문자 코드, 기존 링크와 같은 형식)이며 **12개 로케일 전부** 채운다.
3. [ ] `data/apps.json`에 엔트리 추가 (`status: "live"`). `forbiddenClaims`에 미출시/제거 기능 기입. 스키마: `data/apps.schema.json`.
   - **`site` 객체 필수**(support/about 영역 생성용): `supportLabel`(칩 문구, 예 `Belvue · macOS`), `supportHref`(스토어 URL), `privacyName`, `privacyLangs`(`en`/`kr`/`ja` — `https://juki-j.github.io/privacy-policy/<slug>-<lang>.html`이 실제로 있어야 함), `about.{en,ko}`(`name`, `text` 한 줄 소개). 누락 시 빌드 실패.
   - slug는 루트 디렉토리명(`apps`, `guides`, `css`, `js`, `images` …)과 겹치면 안 된다 (빌드가 거부).
   - 사이트에 노출하지 않을 단계(예약)는 `status: "hidden"`.
   - **Android 병행 출시 앱**: `platforms`에 `"Android"` + `playUrl`(`https://play.google.com/store/apps/details?id=<applicationId>`, `curl` 200 확인) 기입 → Play 배지 자동 병기, h1·플랫폼 문구에 Android 포함. 출시 전 금지어로 넣어 둔 "Android/안드로이드"는 이때 `forbiddenClaims`에서 제거.
   - **`locales` = 고정 12개 언어 전부**: `en ko ja zh-hans zh-hant de fr es it pt-br ru tr`(소문자 코드 — 파일명·URL 세그먼트·배지 파일명 공통, hreflang은 build가 `zh-Hans`/`zh-Hant`/`pt-BR`로 매핑). 예외는 한 지역 전용 앱(예: 급식로그 ko)뿐이며 그 사실을 `locales`에 그대로 적는다(예외 사유는 Hub next/주석).
   - **`heroOrientation` 필수**(`landscape`=Mac 가로형 / `portrait`=폰 세로형), `minAndroid`는 Play 배지 앱만(예 `Android 10`).
4. [ ] 키워드: Google Ads 검색어 보고서·Apple Ads 검색어·ASC 키워드에서 로케일별 3–5개 → `keywords`. 12개 언어 키워드는 `planning/i18n-keywords/<slug>.json`(`{loc:[4개]}`)에 쓰면 build가 읽는다.
5. [ ] `data/i18n/<slug>.<locale>.json` 작성 — 로케일당 **350단어+**(ja는 글자수/3), 직역투 금지, 그 시장의 검색어로 쓴다. **12개 언어 전부** 만든다(예외는 지역 전용 앱뿐) — en 원문에서 랜딩+SEO 본문 전체를 번역·작성한다.
   - 금지: 가격·무료·체험·구독·평생·구매·요금 한도("Pro 없이 N개") 문구는 **페이지 전체**(랜딩·SEO 본문·FAQ·한계·사양 포함)에서 금지 — 12개 언어 어휘로 빌드가 검사해 실패시킨다. Pro는 "Pro에 포함" 식 기능 서술로만. 미출시 기능, 평점, 광고 코드도 금지.
   - 사양 표 요구사항·Pro 라벨은 `_ui.json`의 `spec.requires`·`proOptional`과 **정확히 일치**해야 한다(임의 번역 금지).
   - **랜딩 필드(live 앱 필수, 로케일별)** — 모두 `landing` 객체 아래 — `landing.hero{category,h1,sub,shots[]}` · `landing.pillars[3]{title,text}` · `landing.features[3]{h2,p,shot}` · `landing.midCta{h2,p}` · `landing.closeH2` · `landing.trust[]`. 기존 최상위 `features`(SEO 본문)는 그대로 유지된다. (별도 i18n 스키마 파일은 없음 — 이 명세와 빌드 검사가 정본. 정의: `.claude/plans/drafts/20261108-ad-landing-apple-style-with-language-detection.md` §2c)
     - `landing.hero.h1`: "The best <형용사> <카테고리> for <플랫폼>." 골격의 **완성 문장**(플랫폼 꼬리 포함, 언어별 어순 반영, 조합 금지). 형용사는 사실에 맞을 때만, 없으면 생략. `fast`·가격·free 금지.
     - 카테고리 단어(video player 등)는 스토어 부제(`storeNames`)·기존 본문에서만 가져온다. 새로 짓지 않는다. `landing.hero.category`는 `<title>`·eyebrow용.
     - `landing.hero.sub`는 핵심 기능 1문장 — 스토어 스크린샷 안 마케팅 문구를 h1/sub에 반복하지 않는다.
     - `trust`: 기존 본문·specs에서 검증된 문장만 2~4개. 평점·다운로드 수는 검증 전 금지.
     - "best"는 랜딩 페이지 전용 — 광고 문안(RSA)에는 쓰지 않는다.
6. [ ] 스크린샷: `/store-screenshots` 산출물에서 3–5장을 WebP로 변환 → `images/apps/<slug>/<locale>/NN.webp` (가로형 폭 ≤1000, 세로형 폭 ≤420, `cwebp -q 80`). JSON에 w/h·alt(화면에 보이는 것을 서술)·caption. **새 언어 디렉토리를 만들지 않는다** — 모든 로케일의 `screenshots[].src`는 en(primary) 경로를 그대로 쓴다.
   - **`landing.hero.shots`**: `heroOrientation`=landscape → 1장, portrait → 2~3장. 기존 스토어 스크린샷(`NN.webp`) 번호를 재사용하며 신규 캡처는 필요 없다. `landing.features[].shot`은 1장.
7. [ ] 아이콘 `images/<slug>-icon.png`.
   - **배지**: `images/badges/{apple|mac|play}-<lang>.svg`가 그 앱의 **모든 locales**에 존재하는지 확인(스토어 종류·`playUrl`에 맞는 것). 없는 로케일은 Apple 배지 생성기(developer.apple.com/app-store/marketing/guidelines) / Google Play 배지 페이지(play.google.com/intl/en_us/badges)에서 공식 SVG를 받는다. 자작 배지 금지 — 못 받으면 멈추고 보고.
8. [ ] `node scripts/build.mjs --check-live` 통과 (hero 필드 누락·가격/free 문구가 있으면 **빌드 실패**가 정상 동작. `--allow-legacy-hero`는 개발 중 전용, 머지 전 금지) (캠페인 링크 미입력 상태의 로컬 확인은 `--allow-plain-links`; **그 상태로 배포 금지**).
9. [ ] 로컬 미리보기: `npx wrangler pages dev .` → `curl -H 'Host: apps.setlog.net' http://localhost:8788/<slug>/` 등. Rich Results Test로 스키마, hreflang 확인.
10. [ ] 커밋·푸시(사용자 요청 시) → Pages 배포 → **배포 후 검증 curl 3종**
    - 언어 감지: `curl -sI -H 'Accept-Language: de' https://apps.setlog.net/<slug>/` → 302 `/<slug>/de/` (locales에 de가 있을 때)
    - 봇: `curl -sI -A Googlebot -H 'Accept-Language: de' https://apps.setlog.net/<slug>/` → 200
    - 이동: `curl -sI 'https://apps.setlog.net/go/<slug>?l=en&src=gads'` → 302, Location에 `ct=gads-<slug>-en`
11. [ ] GSC URL 검사 → 색인 요청(로케일별). 사이트맵: `https://setlog.net/sitemap.xml`, `https://apps.setlog.net/sitemap.xml`(= `apps-sitemap.xml`)
12. [ ] Bing/IndexNow: 배포 완료 후 `node scripts/build.mjs --indexnow --dry-run`으로 대상 확인 → `node scripts/build.mjs --indexnow` (오늘 바뀐 URL을 두 호스트별로 POST; 기간 지정 `--since=YYYY-MM-DD`). 키 파일 `/<32hex>.txt`는 공개용이며 저장소 루트에 하나만 둔다.
13. [ ] Hub: 프로젝트 next 갱신("웹 페이지 게시 완료")

## Google Ads 랜딩으로 쓸 때

- 최종 URL은 `https://apps.setlog.net/<slug>/?src=gads` 하나(`apps.apple.com` 직링크 금지). 업체명은 **Setlog**, 1번 제목은 **"<앱> for <플랫폼> by Setlog"** 고정. 문안에 "best"·가격·free 금지.

## 생성되는 것 / 손대지 않는 것

| 파일 | 방식 |
|---|---|
| `apps/<slug>/index.html`, `apps/<slug>/<locale>/index.html`, `apps/ko/index.html` | 전체 생성 (직접 수정 금지, 상단 주석 참고) |
| `apps/index.html` | `<!-- @gen:head -->`·`<!-- @gen:cards -->` 마커 사이만 생성, 나머지 수작업 영역 보존 |
| `sitemap.xml`, `apps-sitemap.xml`, `data/lastmod.json` | 생성 (lastmod = 파일 내용 해시가 바뀐 날) |
| `support.html` | `@gen:support-chips`·`@gen:support-privacy` 마커 사이만 생성(live 앱, 이름순). 물타기·ClaudeMiner·우리동네로또 칩/개인정보 행은 마커 밖 수작업 — 로또는 앱 심사용으로 접근 가능하되 발견면(카탈로그·about)에는 노출 안 함 |
| `about.html` | `@gen:about-en`·`@gen:about-ko` 마커 사이만 생성. 물타기·ClaudeMiner는 마커 밖 수작업 |
| `js/support.js` | 앱 slug 하드코딩 없음 — `<section id="<slug>">`가 있으면 `?app=<slug>` 문맥이 동작(앱별 지원 섹션은 수작업 추가) |
| `guides/*.html`, `{en,de,fr}/guides/*.html` | 수작업 (의도 가이드) — 빌드는 검증·사이트맵 등재만 |

URL 규칙: 기본 로케일은 `/<slug>/`, 나머지는 `/<slug>/<locale>/`. `x-default` = 기본 로케일.

## 리허설 (더미 앱으로 반복성 검증)

기존 앱 하나를 복제해 `dummyapp` 엔트리(+`site`)·`data/i18n/dummyapp.*.json`·`images/apps/dummyapp/`·`images/dummyapp-icon.png`를 만들고 빌드하면 카탈로그 카드(en/ko)·`apps-sitemap.xml`·support 칩·개인정보 행·about 항목·SoftwareApplication/FAQ/Breadcrumb/ItemList 스키마가 전부 반영된다. 삭제 후 재빌드하면 원상 복귀(`data/lastmod.json`의 사라진 apps URL도 자동 정리). 2026-10-25 Phase 3에서 수행·통과.

리허설 더미 i18n에는 위 **랜딩 필드(`landing.*`)와 `heroOrientation`을 포함한 예시**가 있어야 하며, 필드를 일부러 빼면 빌드가 실패하는지도 함께 확인한다.
