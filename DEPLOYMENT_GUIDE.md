# Cloudflare Pages 배포 가이드

## 1단계: GitHub 저장소 생성 및 푸시

### 방법 A: GitHub 웹사이트에서 생성
1. https://github.com/new 접속
2. Repository name: `SetlogApps`
3. Description: `Showcase website for Setlog apps - 물타기 and OneSync`
4. Public 선택
5. **"Add a README file", ".gitignore", "license" 체크 해제** (이미 로컬에 있음)
6. "Create repository" 클릭
7. 아래 명령어 실행:
```bash
cd /Users/Juki/Documents/claude_workspace/SetlogApps
git remote add origin https://github.com/JUKI-J/SetlogApps.git
git branch -M main
git push -u origin main
```

### 방법 B: 기존 저장소가 있다면
```bash
cd /Users/Juki/Documents/claude_workspace/SetlogApps
git remote add origin https://github.com/JUKI-J/SetlogApps.git
git branch -M main
git push -u origin main
```

---

## 2단계: Cloudflare Pages 배포

### 2-1. Cloudflare Pages 접속
1. https://dash.cloudflare.com 로그인
2. 왼쪽 메뉴에서 **"Workers & Pages"** 클릭
3. **"Create application"** 클릭
4. **"Pages"** 탭 선택
5. **"Connect to Git"** 클릭

### 2-2. GitHub 연동
1. **"Connect GitHub"** 클릭 (처음이면 권한 승인)
2. `SetlogApps` 저장소 선택
3. **"Begin setup"** 클릭

### 2-3. 빌드 설정
- **Project name**: `setlogapps` (또는 원하는 이름)
- **Production branch**: `main`
- **Build settings**:
  - Framework preset: **None** (정적 사이트)
  - Build command: (비워두기)
  - Build output directory: `/` (루트 디렉토리)
- **"Save and Deploy"** 클릭

### 2-4. 배포 확인
- 배포가 완료되면 자동으로 URL이 생성됩니다
- 형식: `https://setlogapps.pages.dev`
- 배포 상태를 확인하고 사이트가 정상 작동하는지 테스트

---

## 3단계: 커스텀 도메인 설정 (apps.setlog.net)

### 3-1. Cloudflare Pages에서 커스텀 도메인 추가
1. Cloudflare Pages 프로젝트 페이지에서
2. **"Custom domains"** 탭 클릭
3. **"Set up a custom domain"** 클릭
4. 도메인 입력: `apps.setlog.net`
5. **"Continue"** 클릭

### 3-2. DNS 레코드 자동 설정
Cloudflare가 `setlog.net` 도메인을 관리하고 있다면:
- Cloudflare가 자동으로 CNAME 레코드를 추가합니다
- **"Activate domain"** 클릭하면 완료

### 3-3. DNS 레코드 수동 설정 (필요시)
만약 자동 설정이 안 되면:
1. Cloudflare Dashboard에서 **"DNS"** 메뉴로 이동
2. **"Add record"** 클릭
3. 다음 정보 입력:
   - Type: `CNAME`
   - Name: `apps`
   - Target: `setlogapps.pages.dev` (또는 Pages에서 제공한 URL)
   - Proxy status: **Proxied** (주황색 구름 아이콘)
4. **"Save"** 클릭

### 3-4. SSL/TLS 설정 확인
1. Cloudflare Dashboard의 **"SSL/TLS"** 메뉴
2. Encryption mode: **Full** 또는 **Full (strict)** 권장
3. 자동으로 SSL 인증서가 발급됩니다 (몇 분 소요)

---

## 4단계: 최종 확인

### 확인 사항
- ✅ https://apps.setlog.net 접속 확인
- ✅ SSL 인증서 정상 작동 (자물쇠 아이콘)
- ✅ 다크모드 토글 작동
- ✅ 언어 전환 작동
- ✅ 앱 아이콘 정상 표시
- ✅ 모바일 반응형 디자인 확인

### DNS 전파 시간
- 보통 **5-10분** 이내에 전파됩니다
- 최대 24시간까지 걸릴 수 있습니다
- 확인: https://dnschecker.org/#CNAME/apps.setlog.net

---

## 5단계: Google AdSense 설정 (선택사항)

### ads.txt 파일 업데이트
1. Google AdSense 계정에서 Publisher ID 확인 (형식: `pub-XXXXXXXXXXXXXXXX`)
2. `ads.txt` 파일 수정:
```bash
# 6번째 줄 수정
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```
3. 변경사항 커밋 및 푸시:
```bash
git add ads.txt
git commit -m "Update AdSense Publisher ID"
git push
```
4. Cloudflare Pages가 자동으로 재배포합니다
5. https://apps.setlog.net/ads.txt 접속하여 확인

---

## 트러블슈팅

### 문제: 사이트가 표시되지 않음
- DNS 전파 대기 (5-10분)
- 브라우저 캐시 삭제 (Cmd+Shift+R)
- Cloudflare Pages 배포 로그 확인

### 문제: SSL 오류
- Cloudflare SSL/TLS 설정을 **Full** 이상으로 변경
- 인증서 발급 대기 (최대 24시간)

### 문제: CSS/JS 파일이 로드되지 않음
- Build output directory가 `/` 로 설정되었는지 확인
- 상대 경로가 올바른지 확인

---

## 자동 배포 설정

### GitHub Push 시 자동 배포
- Cloudflare Pages는 GitHub와 연동되어 있어
- `main` 브랜치에 push하면 **자동으로 재배포**됩니다
- 배포 상태는 Cloudflare Dashboard에서 확인 가능

### 브랜치별 미리보기
- 다른 브랜치에 push하면 미리보기 URL 생성
- PR을 만들면 자동으로 미리보기 환경 제공

---

## 도움이 필요하다면
- Cloudflare Pages 문서: https://developers.cloudflare.com/pages/
- Cloudflare Community: https://community.cloudflare.com/
