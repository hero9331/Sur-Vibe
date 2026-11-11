# 수업 내용 반영표

강의에서 배운 것이 이 프로젝트의 어디에 들어갔는지 정리했어요. 발표와 보고서에서 근거로 써요.

| 강의 | 배운 것 | 우리 프로젝트 | 어디서 보나요 |
|---|---|---|---|
| 1강 | 의도 표현 → 생성 → 검증 → 정제, 이해 없는 신뢰의 위험 | AI 코드는 작성자가 줄마다 설명, 사람이 PR 확인 | `CONTRIBUTING.md`, `docs/REVIEW.md` |
| 2강 | API 키, AI 코드의 보안 취약점, 정적 분석을 CI에 | Claude API 키는 `.env`에만, CodeQL이 PR마다 보안 검사 | `.github/workflows/codeql.yml` |
| 3강 | RCTF, 입출력 계약, 제약 조건, 한 번에 한 지시, 프롬프트 인젝션 | 설명서마다 RCTF + 제약 조건 지시문, AI 답을 JSON 스키마로 고정, 캡처 속 지시 무시 | `docs/guides/`, `src/services/scanner.js` |
| 4강 | Git 기본, GitHub, 배포 | 공개 저장소, 기능별 브랜치 | `README.md` |
| 5강 | 코드 읽기와 검증, 코드 스멜, 리팩터링, 오류 전달법, 정적 분석 | ESLint 경고 0개와 복잡도 10 이하, 자동 시험, 커버리지, 오류 전달 양식 | `eslint.config.js`, `test/`, `START-HERE.md` |
| 6강 | 관심사 분리, Never trust the client, 디자인 토큰, 콘솔 0, Lighthouse 90, 모바일 | 서버에서 다시 검사, 영수증 디자인 토큰, 6개 화면 Lighthouse 96점 이상, 폰 하단 탭 | `docs/DESIGN.md`, `public/css/style.css` |
| 7강 | 명세서, TODO로 계획, MongoDB Atlas, Cloud Run, `.env.example`, MCP | 명세서 v1.3, TODO, Atlas + Cloud Run 배포 순서, Context7 안내 | `docs/requirements.md`, `TODO.md`, `docs/DEPLOY.md` |
| 8강 | `.env` 분리, API 호출의 타임아웃·재시도, 429 대응, JSON | Claude 호출 타임아웃 120초·재시도 1번, 429를 쉬운 말로 안내, CSV 내보내기는 다음 후보 | `src/services/scanner.js`, `docs/requirements.md` 13장 |
| 9강 | Express, 미들웨어, REST, 상태 코드, Validation, 중앙 오류 처리, JWT, helmet, Rate Limit, API 문서 | 전부 사용. 캡처 읽기는 사람별·전체 횟수 제한 | `src/app.js`, `docs/API.md` |
| 10강 | GitHub Flow, 커밋 컨벤션, WBS와 칸반, 충돌 해결, PR 템플릿, AI 셀프 리뷰, API 계약과 Mock, 문서화, 짝 검증, CI와 브랜치 보호, KPT 회고, 이슈 양식, 키 유출 대응 | 전부 반영. main 보호와 키 업로드 차단을 켬 | `CONTRIBUTING.md`, `docs/WBS.md`, `docs/ARCHITECTURE.md`, `docs/RETRO.md` |
| 12주차 (계획서) | 개인정보, 라이선스, 표절, 환각 대응 | 캡처 저장 안 함, 오픈소스 라이선스 표, 정책은 사람이 출처 확인 | `docs/RESPONSIBLE-AI.md` |
| 13주차 (계획서) | 배포와 운영, 데모 준비 | 로그, 되돌리기, 요금 한도, 시연 대비책 | `docs/DEPLOY.md`, `docs/PRESENTATION.md` |

## 일부러 다르게 한 것

| 강의 내용 | 우리 선택 | 이유 |
|---|---|---|
| Next.js + Hono + Prisma (7강 예시) | Express + Mongoose | 9강 Express로 1학년이 배운 방식 그대로 만들 수 있어요 |
| Flask, FastAPI (6강) | Node.js | 프론트와 백엔드를 JavaScript 하나로 맞췄어요 |
| Git Flow (10강) | GitHub Flow | 팀이 작고 기간이 짧아서 단순한 쪽을 골랐어요 |
| Prettier (10강) | 아직 안 씀 | 지금 넣으면 파일 26개 모양이 한꺼번에 바뀌어 작업 중인 브랜치와 충돌해요. 기능을 다 합친 뒤 검토해요 |
| Vercel 배포 (4강) | Cloud Run (7강) | Vercel은 요청 크기 제한이 작아서 캡처 여러 장을 못 올려요 |
