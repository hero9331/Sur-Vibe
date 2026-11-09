# 1학년 A 설명서 — F1 계좌·카드, 설정

## 내가 만드는 것
설정 화면에서
1. 내 계좌·카드를 **등록, 보기, 고치기, 지우기**
2. **월 예산**과 **고정비**(넷플릭스, 통신비 등) 저장하기

9강에서 만든 Todo의 추가·조회·수정·삭제(CRUD)랑 거의 같아요. "할 일" 대신 "계좌"를 다룬다고 생각하면 돼요.

## 고칠 파일 (이것만 고쳐요)
- `src/routes/accounts.js` — 계좌 API
- `src/routes/settings.js` — 설정 API
- `public/settings.html` — 설정 화면 (`accounts-section`, `budget-section` 안쪽)
- `public/js/settings.js` — 설정 화면 동작

이미 만들어진 것: `src/models/Account.js`, `src/models/Setting.js` (DB 모양)

## API 형식
`docs/API.md`의 **F1 계좌·카드**, **F4 설정** 부분을 그대로 따라요.

## AI에게 줄 첫 지시 (3강 RCTF)
Claude Code나 Codex에 그대로 붙여 넣어요.

```
[Role] 너는 Node.js Express 개발자야.
[Context] 이 프로젝트의 AGENTS.md, docs/API.md, src/models/Account.js, src/models/Setting.js를 먼저 읽어.
[Task] src/routes/accounts.js에 docs/API.md의 "F1 계좌·카드" API 4개를 만들어 줘.
       notImplemented는 지우고, 모든 조회·수정·삭제에 user: req.userId 조건을 넣어 줘.
[Format] 코드를 고친 뒤 무엇을 바꿨는지 3줄로 알려 줘.
```

API가 되면 다음 순서로 하나씩 시켜요.
1. `src/routes/settings.js`에 "F4 설정" API 2개 만들기
2. `public/settings.html`과 `public/js/settings.js`에 계좌 목록 + 추가 폼 만들기 (Bootstrap 사용)
3. 같은 화면에 월 예산, 고정비 입력 폼 만들기

## 확인하는 법
1. `npm run dev` 실행, 브라우저에서 가입·로그인
2. **Thunder Client**(9강)로 API 확인
   - 로그인 API로 받은 토큰을 Headers에 `Authorization: Bearer 토큰` 으로 넣기
   - `POST http://localhost:3000/api/accounts` Body(JSON): `{"name":"생활비 통장","type":"bank","institution":"토스뱅크"}` → **201**
   - `GET /api/accounts` → 방금 만든 계좌가 보이면 성공
3. 설정 화면에서 직접 추가·삭제해 보기
4. `npm run lint` 경고 0개

## 다 됐다는 기준
- [ ] 계좌·카드 추가, 목록, 수정, 삭제가 화면에서 됨
- [ ] 월 예산, 고정비를 저장하고 새로고침해도 남아 있음
- [ ] 이름 없이 추가하면 오류 메시지가 보임
- [ ] 다른 아이디로 로그인하면 내 계좌가 안 보임
- [ ] 폰 크기 화면에서도 깨지지 않음

## Git
브랜치 이름: `feature/accounts` (README의 Git 작업 순서 참고)
