# 워크스페이스 훅 제안 (적용은 사용자 승인 후 — 이 파일만 수정했고 워크스페이스 문서는 건드리지 않음)

## 1. 워크스페이스 `CLAUDE.md` — "출시(앱)" 흐름 맨 끝 (`스토어 메타데이터 → 제출` 다음, 승인·판매 개시 후)

```
→ (승인 후) **SetlogApps 페이지 세트** — `SetlogApps/docs/new-app-checklist.md` 수행(`data/apps.json` 엔트리+`site`·i18n·스크린샷 → `node scripts/build.mjs` → 배포 → `--indexnow`). 신규 프로젝트는 `/create-project`에서 slug만 `status:hidden`으로 예약
```

## 2. `/deploy` 스킬 — 앱 타입 완료 보고 마지막 줄

```
- 앱(스토어 판매 개시) 배포였다면: "SetlogApps 레지스트리 엔트리(data/apps.json + site + i18n)를 추가했나? → SetlogApps/docs/new-app-checklist.md" 를 사용자에게 1줄로 묻는다.
```
