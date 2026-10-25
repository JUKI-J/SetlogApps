# Setlog Apps - 앱 소개 웹사이트

Cloudflare Pages 단일 프로젝트(`setlogapps`)가 두 호스트를 서빙하는 정적 사이트입니다.

- `setlog.net` — 콘텐츠 허브(`index.html`, `guides/*`, `{en,de,fr}/guides/*`, about/faq/support/contact/privacy/terms)
- `apps.setlog.net` — 앱 카탈로그(`/`, `/ko/`)와 **앱별 의도 검색 랜딩**(`/<slug>/`, `/<slug>/<locale>/`)
- 호스트 라우팅은 `functions/_middleware.js`: apps 호스트의 `/<slug>/…`를 `/apps/<slug>/…`로 리라이트, `sitemap.xml`은 정적 `apps-sitemap.xml`, 콘텐츠 경로는 setlog.net으로 301

## 프로젝트 구조

```
SetlogApps/
├── data/apps.json            # 앱 레지스트리(단일 정본) + apps.schema.json
├── data/i18n/<slug>.<locale>.json   # 로케일별 앱 페이지 카피, _ui.json = 공통 UI 문구
├── data/lastmod.json         # sitemap lastmod 상태(파일 해시 → 날짜), 빌드가 갱신
├── scripts/build.mjs         # 생성기 + 검증기 (Node 표준 라이브러리만, 로컬에서 실행 후 커밋)
├── templates/                # app-page.html, catalog.html
├── apps/                     # apps.setlog.net 정적 파일 (index.html=카탈로그, <slug>/** 생성물)
├── guides/ en/ de/ fr/       # 가이드(수작업)
├── images/apps/<slug>/<locale>/NN.webp   # 앱 페이지 스크린샷
├── sitemap.xml, apps-sitemap.xml         # 생성물
└── docs/new-app-checklist.md # 신규 앱 추가 절차
```

## 앱 추가 · 페이지 생성

```bash
node scripts/build.mjs                       # 검증 + 생성 (campaignLink가 null이면 실패)
node scripts/build.mjs --allow-plain-links   # 로컬 미리보기 전용(평문 App Store 링크로 폴백, 배포 금지)
node scripts/build.mjs --check-live          # appStoreId를 iTunes Lookup으로 확인(네트워크)
```

- 캠페인 링크는 **ASC 캠페인 링크 생성기 결과를 그대로** `data/apps.json`의 `campaignLink`(로케일 맵)에 붙여넣는다. `ct=web-<slug>-<locale>`. 직접 조립 금지.
- 절차 전체: `docs/new-app-checklist.md`. 계획 정본: `.claude/plans/drafts/20261025-app-pages-seo.md`.
- 생성 파일(`apps/<slug>/**`, `apps/ko/`, 사이트맵)은 직접 수정하지 말고 `data/`를 고친다. `apps/index.html`은 `@gen` 마커 사이만 생성된다.
- 앱 페이지에는 광고 코드를 넣지 않는다.

## 🚀 Cloudflare Pages 배포 가이드

### 1단계: GitHub 리포지토리 생성

1. GitHub에 새 리포지토리 생성
   - 리포지토리 이름: `setlog-apps` (또는 원하는 이름)
   - Public 또는 Private 선택

2. 로컬 프로젝트를 GitHub에 푸시
   ```bash
   cd /Users/Juki/Documents/claude_workspace/SetlogApps
   git init
   git add .
   git commit -m "Initial commit: Setlog Apps landing page"
   git branch -M main
   git remote add origin https://github.com/JUKI-J/setlog-apps.git
   git push -u origin main
   ```

### 2단계: Cloudflare Pages 설정

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com/ 로그인
   - 좌측 메뉴에서 "Workers & Pages" 선택

2. **새 프로젝트 생성**
   - "Create application" 버튼 클릭
   - "Pages" 탭 선택
   - "Connect to Git" 선택

3. **GitHub 연결**
   - GitHub 계정 연결 (처음인 경우)
   - `setlog-apps` 리포지토리 선택

4. **빌드 설정**
   - Project name: `setlog-apps`
   - Production branch: `main`
   - Build command: (비워두기 - 정적 사이트)
   - Build output directory: `/` (루트 디렉토리)

5. **배포 시작**
   - "Save and Deploy" 클릭
   - 배포 완료까지 대기 (약 1-2분)

### 3단계: 커스텀 도메인 연결 (apps.setlog.net)

1. **Cloudflare Pages 설정**
   - 배포된 프로젝트 페이지에서 "Custom domains" 탭 선택
   - "Set up a custom domain" 클릭

2. **서브도메인 입력**
   - 도메인: `apps.setlog.net` 입력
   - "Continue" 클릭

3. **DNS 레코드 확인**
   - Cloudflare가 자동으로 DNS 레코드를 추가할 것인지 물어봄
   - "Activate domain" 클릭 (자동 설정)
   - 또는 수동으로 CNAME 레코드 추가:
     ```
     Type: CNAME
     Name: apps
     Content: setlog-apps.pages.dev (Cloudflare Pages URL)
     Proxy status: Proxied (주황색 구름)
     ```

4. **SSL/TLS 설정 확인**
   - Cloudflare Dashboard → SSL/TLS 메뉴
   - 암호화 모드: "Full" 또는 "Full (strict)" 권장
   - 무료 SSL 인증서 자동 발급 (약 5-10분 소요)

5. **도메인 활성화 확인**
   - https://apps.setlog.net 접속하여 확인
   - DNS 전파 시간: 최대 24시간 (보통 몇 분 내)

## 🔄 업데이트 방법

코드를 수정한 후 GitHub에 푸시하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Update: 변경 내용 설명"
git push
```

Cloudflare Pages가 자동으로 감지하여 재배포합니다 (약 1-2분 소요).

## 💰 Google AdSense 추가 방법

### 1단계: AdSense 계정 준비

1. Google AdSense 계정 생성 및 승인 대기
2. `apps.setlog.net` 도메인을 AdSense에 등록

### 2단계: 광고 코드 받기

1. AdSense Dashboard → 광고 → 디스플레이 광고 생성
2. 광고 단위 생성 후 코드 복사
3. 클라이언트 ID 확인: `ca-pub-XXXXXXXXXXXXXXXX`
4. 광고 슬롯 ID 확인: `XXXXXXXXXX`

### 3단계: 코드 수정

`index.html` 파일에서 다음 부분을 수정:

```html
<!-- 수정 전 -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=YOUR_ADSENSE_CLIENT_ID"
     crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="YOUR_ADSENSE_CLIENT_ID"
     data-ad-slot="YOUR_AD_SLOT_ID"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>

<!-- 수정 후 (예시) -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"
     crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-1234567890123456"
     data-ad-slot="9876543210"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
```

### 4단계: 재배포

```bash
git add index.html
git commit -m "Add Google AdSense integration"
git push
```

## 🎨 기능

- ✅ 반응형 디자인 (모바일, 태블릿, 데스크톱)
- ✅ 다크모드 자동 지원 (시스템 설정 감지)
- ✅ 앱 아이콘 및 스토어 배지 표시
- ✅ GitHub 프로필 링크
- ✅ Google AdSense 준비 완료
- ✅ 접근성 고려 (키보드 네비게이션, 스크린 리더)
- ✅ SEO 최적화

## 🔧 로컬 테스트

미들웨어(호스트 라우팅)까지 확인하려면 Wrangler를 쓴다:

```bash
npx wrangler pages dev . --port 8788
curl -s -o /dev/null -w "%{http_code}\n" -H 'Host: apps.setlog.net' http://localhost:8788/slplayer/de/
curl -s -o /dev/null -w "%{http_code}\n" -H 'Host: setlog.net'      http://localhost:8788/guides/slplayer
```

단순 정적 확인은 `python3 -m http.server 8000`(미들웨어 없음 — `/apps/<slug>/`로 접근).

## 📱 포함된 앱

현재 목록과 스토어 정보는 `data/apps.json`이 정본입니다(판매 중 10개: zipda, slplayer, charcoalplayer, belvue, intervalrunner, runvue, lunchlog, laplync, timerlync, onesync). 수작업 카드: 물타기(스토어 조회 불가 — 점검 필요), ClaudeMiner(GitHub).

## 📄 라이선스

© 2025 Setlog. All rights reserved.

---

## 🐛 문제 해결

### 도메인이 연결되지 않을 때

1. DNS 전파 시간 대기 (최대 24시간)
2. Cloudflare DNS 설정 확인
   - CNAME 레코드가 올바른지 확인
   - Proxy 상태가 활성화(주황색)되어 있는지 확인

### 광고가 표시되지 않을 때

1. AdSense 계정 승인 상태 확인
2. 도메인이 AdSense에 등록되어 있는지 확인
3. 광고 코드가 올바르게 삽입되었는지 확인
4. 브라우저 광고 차단기 비활성화 후 테스트

### 다크모드가 작동하지 않을 때

- 브라우저가 `prefers-color-scheme` 미디어 쿼리를 지원하는지 확인
- 시스템 설정에서 다크모드 활성화 후 테스트

## 📞 지원

문제가 발생하면 GitHub Issues를 통해 문의해주세요:
https://github.com/JUKI-J/setlog-apps/issues
