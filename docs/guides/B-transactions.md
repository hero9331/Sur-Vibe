# 1학년 B 설명서 — F3 거래 내역

처음이면 [시작 안내](START-HERE.md)부터 봐요.

## 내가 만드는 것
1. 거래 여러 건을 한 번에 **저장**하는 API (올리기 화면의 저장 버튼이 불러요)
2. 거래 내역 화면에서 달마다 **보기, 고치기, 지우기**
3. 카테고리를 고치면 **"다음부터 이 가게는 이 카테고리"** 규칙 저장

9강 Todo CRUD랑 비슷해요. "할 일" 대신 "거래"를 다뤄요.

## 고칠 파일 (이것만 고쳐요)
- `src/routes/transactions.js` — 거래 API
- `public/transactions.html` — 내역 화면 (`transactions-section` 안쪽)
- `public/js/transactions.js` — 내역 화면 동작

이미 만들어진 것:
- `src/models/Transaction.js` (DB 모양)
- `src/services/rules.js`의 `learnRule(userId, merchant, category)` — 규칙 저장 함수. 불러서 쓰기만 하면 돼요.

## API 형식
`docs/API.md`의 **F3 거래 내역** 부분을 그대로 따라요.

## AI에게 줄 첫 지시 (3강 RCTF)

```
[Role] 너는 Node.js Express 개발자야.
[Context] 이 프로젝트의 AGENTS.md, docs/API.md, src/models/Transaction.js, src/services/rules.js를 먼저 읽어.
[Task] src/routes/transactions.js에 docs/API.md의 "F3 거래 내역" API 4개를 만들어 줘.
       notImplemented는 지우고, 모든 조회·수정·삭제에 user: req.userId 조건을 넣어 줘.
       POST는 items 중 하나라도 틀리면 아무것도 저장하지 말고 400을 돌려줘.
       카테고리가 바뀌는 경우(POST의 categoryEdited: true, PATCH의 category)에는 learnRule()을 불러 줘.
[Format] 코드를 고친 뒤 무엇을 바꿨는지 3줄로 알려 줘.
```

API가 되면 다음을 시켜요.
1. `public/transactions.html`과 `public/js/transactions.js`에 달 선택 + 거래 목록 만들기 (지금 예시 화면 모양 유지)
2. 목록에서 카테고리를 드롭다운으로 바꾸면 바로 저장, 삭제 버튼 만들기 (카테고리 목록은 `GET /api/categories`)

## 확인하는 법
1. `npm run dev`, 가입·로그인
2. **Thunder Client**(9강)
   - `POST /api/transactions` Body:
     `{"items":[{"date":"2026-11-03","merchant":"스타벅스","amount":5600,"category":"카페"}]}` → **201**
   - `GET /api/transactions?month=2026-11` → 방금 만든 거래가 보이면 성공
   - `PATCH /api/transactions/<id>` Body: `{"category":"학업"}` → **200**
3. 내역 화면에서 직접 고치고 지워 보기
4. `npm run lint` 경고 0개

## 다 됐다는 기준
- [ ] `npm test`에서 `[B]` 테스트가 건너뛰지 않고 모두 통과
- [ ] 달을 바꾸면 그 달 거래만 보임
- [ ] 카테고리를 고치면 저장되고, 규칙도 저장됨
- [ ] 삭제가 됨
- [ ] 잘못된 값(음수 금액, 없는 카테고리)은 400
- [ ] 다른 아이디로 로그인하면 내 거래가 안 보임
- [ ] 폰 크기 화면에서도 깨지지 않음

## Git
브랜치 이름: `feature/transactions`
