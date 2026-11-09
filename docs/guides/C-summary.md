# 1학년 C 설명서 — F4 홈 예산 경고, F5 월별 보기

## 내가 만드는 것
1. **홈 화면**: "오늘 쓸 수 있는 돈"을 크게 보여 주고, 많이 쓰면 노란색·빨간색 경고
2. **월별 보기 화면**: 카테고리별 지출 그래프 + 지난달과 비교

## 고칠 파일 (이것만 고쳐요)
- `src/routes/summary.js` — 요약 API 2개
- `public/index.html` — 홈 화면 (`today-section` 안쪽)
- `public/js/home.js`
- `public/monthly.html` — **`monthly-section` 안쪽만** (`recommendations-section`은 1학년 D 담당)
- `public/js/monthly.js`

이미 만들어진 것: `src/models/Transaction.js`, `src/models/Setting.js`

## 계산 방법
- 오늘 쓸 수 있는 돈 = (월 예산 − 고정비 합계 − 어제까지 쓴 돈) ÷ 오늘 포함 남은 날짜
- 오늘 쓴 돈이 그 금액의 80% 이상이면 `"warning"`(노랑), 100% 이상이면 `"over"`(빨강)
- 지출(`isExpense: true`)만 더해요. 이체·입금은 빼요.
- 고정비로 등록한 결제(예: 넷플릭스)는 "쓴 돈"에서 빼요. 안 그러면 고정비가 두 번 빠져요. `src/services/fixedCosts.js`의 `isFixedCost(가게이름, 고정비목록)`을 쓰면 돼요.

자세한 응답 모양은 `docs/API.md`의 **F4·F5 요약**을 그대로 따라요.

## AI에게 줄 첫 지시 (3강 RCTF)

```
[Role] 너는 Node.js Express 개발자야.
[Context] 이 프로젝트의 AGENTS.md, docs/API.md, src/models/Transaction.js, src/models/Setting.js를 먼저 읽어.
[Task] src/routes/summary.js에 docs/API.md의 "F4·F5 요약" API 2개를 만들어 줘.
       notImplemented는 지우고, 항상 user: req.userId 조건으로 계산해 줘.
       날짜 계산은 한국 시간(Asia/Seoul) 기준으로 해 줘.
       오늘 예산의 쓴 돈에서는 src/services/fixedCosts.js의 isFixedCost()로 고정비 결제를 빼 줘.
       계산 부분은 따로 함수로 빼서 테스트하기 쉽게 해 줘.
[Format] 코드를 고친 뒤 무엇을 바꿨는지 3줄로 알려 줘.
```

API가 되면 다음을 시켜요.
1. 홈 화면: 지금 예시 화면 모양은 유지하고, `mock.js` 대신 `/api/summary/today`로 불러오기
2. 월별 보기: 지금 있는 가로 막대 그래프를 유지하고, `/api/summary/monthly`로 불러오기

## 확인하는 법
1. `npm run dev`, 가입·로그인
2. 테스트 데이터 넣기: 1학년 B의 API가 아직 없으면, AI에게 "테스트용 거래 데이터를 넣는 스크립트를 만들어 줘"라고 시켜요
3. **Thunder Client**(9강): `GET /api/summary/today`, `GET /api/summary/monthly?month=2026-11`
4. 계산이 맞는지 손으로 한 번 계산해서 비교하기
5. `npm run lint` 경고 0개

## 다 됐다는 기준
- [ ] `npm test`에서 `[C]` 테스트가 건너뛰지 않고 모두 통과
- [ ] 홈에 오늘 쓸 수 있는 돈과 경고 색이 보임
- [ ] 월별 그래프가 보이고, 지난달보다 늘어난 건 빨간색, 줄어든 건 초록색
- [ ] 거래가 하나도 없어도 오류 없이 "아직 내역이 없어요"
- [ ] 폰 크기 화면에서도 깨지지 않음

## Git
브랜치 이름: `feature/summary`
