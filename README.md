# Setlog Apps - 앱 소개 웹사이트

Setlog 앱(물타기, OneSync, ClaudeMiner, Charcoal Player, TimerLync, LapLync, 우리동네로또)을 소개하는 정적 웹페이지입니다.

## 📦 프로젝트 구조

```
SetlogApps/
├── index.html          # 메인 페이지
├── css/
│   └── styles.css     # 스타일시트
└── README.md          # 이 파일
```

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

로컬에서 웹사이트를 미리보기하려면:

```bash
# Python 3 사용
cd /Users/Juki/Documents/claude_workspace/SetlogApps
python3 -m http.server 8000

# 브라우저에서 열기
open http://localhost:8000
```

또는

```bash
# Node.js의 http-server 사용
npx http-server -p 8000

# 브라우저에서 열기
open http://localhost:8000
```

## 📱 포함된 앱

1. **물타기**
   - App Store: https://apps.apple.com/kr/app/물타기/id1521767089

2. **OneSync**
   - Google Play: https://play.google.com/store/apps/details?id=setlog.onesync.android
   - App Store: https://apps.apple.com/kr/app/onesync-file-share/id6753986352

3. **ClaudeMiner**
   - GitHub: https://github.com/JUKI-J/claudeminer

4. **Charcoal Player** (macOS)
   - Mac App Store: https://apps.apple.com/kr/app/charcoal-player/id1212179275?mt=12

5. **TimerLync**
   - App Store: https://apps.apple.com/kr/app/timerlync-sync/id6795109124

6. **LapLync**
   - App Store: https://apps.apple.com/kr/app/laplync/id6793554365

7. **우리동네로또 (LottoTown)**
   - App Store: https://apps.apple.com/kr/app/id6755963369
   - Google Play: https://play.google.com/store/apps/details?id=net.setlog.lottotown

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
