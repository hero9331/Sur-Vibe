# API 문서

프론트엔드와 백엔드가 서로 맞게 만들어지도록 정한 약속이에요. (9강 API 문서화)
**여기 적힌 형식을 바꾸고 싶으면 먼저 박영웅에게 말해 주세요.**

## 공통 규칙

- 주소는 모두 `/api`로 시작해요.
- 로그인이 필요한 API는 헤더에 `Authorization: Bearer <토큰>`을 붙여요. 화면에서는 `public/js/api.js`의 `api()`가 알아서 붙여 줘요.
- 주고받는 데이터는 JSON이에요.
- 날짜는 `"2026-11-03"`, 달은 `"2026-11"` 형식의 글자예요.
- 금액은 원 단위 정수예요. (`12000`)
- 실패하면 `{ "error": "사람이 읽을 수 있는 메시지" }`를 돌려줘요.
- 서버에서는 로그인한 사람의 id가 `req.userId`에 들어 있어요. **항상 자기 데이터만** 찾고 고쳐야 해요.

| 상태 코드 | 뜻 |
|---|---|
| 200 | 조회·수정 성공 |
| 201 | 새로 만들기 성공 |
| 204 | 삭제 성공 (응답 내용 없음) |
| 400 | 보낸 값이 잘못됨 |
| 401 | 로그인 필요 |
| 404 | 없음 |
| 409 | 이미 있음 |
| 501 | 아직 안 만든 기능 |

---

## F0 로그인 — 박영웅 ✅ 완성

### POST /api/auth/signup
```json
요청 { "username": "survibe01", "password": "password123" }
응답 201 { "token": "eyJ...", "username": "survibe01" }
```
- 아이디: 영어 소문자, 숫자, `_`로 4~20자 / 비밀번호: 8~72자 → 아니면 400
- 이미 있는 아이디 → 409

### POST /api/auth/login
```json
요청 { "username": "survibe01", "password": "password123" }
응답 200 { "token": "eyJ...", "username": "survibe01" }
```
- 틀리면 401

### GET /api/auth/me 🔒
```json
응답 200 { "username": "survibe01" }
```

## 카테고리 ✅ 완성

### GET /api/categories
```json
응답 200 [
  { "name": "학식", "isExpense": true, "examples": ["학생식당"] },
  ...
  { "name": "이체", "isExpense": false, "examples": ["내 계좌끼리 보낸 돈"] }
]
```
- 목록은 `data/categories.json`에서 관리해요.

---

## F1 계좌·카드 — 1학년 A 🔒

### GET /api/accounts
```json
응답 200 [
  { "id": "6730...", "name": "생활비 통장", "type": "bank", "institution": "토스뱅크", "purpose": "매일 쓰는 돈",
    "last4": "4821", "balance": 1284300, "balanceChange": { "amount": -16500, "since": "2026-11-17" },
    "interestRate": 2, "hidden": false, "createdAt": "...", "updatedAt": "..." }
]
```
- `last4`: 계좌·카드번호 끝 4자리 (없으면 `""`). 같은 은행 계좌를 구분해요
- `balance`: 직접 적은 잔액 (없으면 `null`). 은행 연동은 없어요
- `balanceChange`: 오늘 전 마지막 잔액 기록과 비교한 값. 보통 `since`가 어제예요. 기록이 없으면 `null`
- `interestRate`: 연 이자율(%) (없으면 `null`), `hidden`: 목록에서 숨기기. 숨겨도 캡처 읽기의 내 계좌 이체 구분에는 써요

### POST /api/accounts
```json
요청 { "name": "생활비 통장", "type": "bank", "institution": "토스뱅크", "purpose": "매일 쓰는 돈",
       "last4": "1000-12-3454821", "balance": 1284300, "interestRate": 2, "hidden": false }
응답 201 { "id": "6730...", "name": "생활비 통장", "last4": "4821", ... }
```
- `type`은 `"bank"`(은행 계좌), `"pay"`(페이머니: 카카오페이·네이버페이 등), `"card"`(카드) 중 하나. 화면에서는 셋을 묶어 "자산"이라고 불러요
- 잔액(`balance`)은 은행·페이머니에, 이자율(`interestRate`)은 은행에, 번호(`last4`)는 은행·카드에 써요
- `name`, `type`, `institution`은 꼭 필요 → 없으면 400. 나머지는 없어도 돼요
- `name`, `institution`은 30자, `purpose`는 50자까지 → 넘으면 400. 앞뒤 공백은 지워서 저장해요
- `last4`: 전체 번호를 보내도 **끝 4자리만 저장**해요 (개인정보). 숫자가 4개보다 적으면 400
- `balance`: 원 단위 정수 또는 `null` / `interestRate`: 0~100 숫자(소수 둘째 자리까지) 또는 `null` / `hidden`: true·false → 아니면 400

### PATCH /api/accounts/:id
```json
요청 { "purpose": "저축만" }        ← 바꿀 것만 보내요
응답 200 { "id": "6730...", ... }  ← 바뀐 전체
```
- 없거나 남의 것이면 404
- `balance`를 보내면 그날 잔액 기록이 남아요 (같은 날 여러 번 고치면 마지막 값만). 이 기록으로 `balanceChange`를 계산해요

### DELETE /api/accounts/:id
- 응답 204 / 없거나 남의 것이면 404

## F4 설정 — 1학년 A 🔒

### GET /api/settings
```json
응답 200 {
  "monthlyBudget": 500000,
  "fixedCosts": [
    { "name": "넷플릭스", "amount": 13500, "category": "구독", "billingDay": 1, "wholeCategory": false },
    { "name": "그 외 교통비", "amount": 75000, "category": "교통", "billingDay": null, "wholeCategory": true }
  ],
  "subscriptionAlert": { "enabled": true, "daysBefore": 3 }
}
```
- 아직 저장한 적 없으면 `{ "monthlyBudget": 0, "fixedCosts": [], "subscriptionAlert": { "enabled": true, "daysBefore": 3 } }`
- 고정비 `category`: 지출 카테고리 중 하나 또는 `null` / `billingDay`: 매달 결제일 1~31 또는 `null`
- `wholeCategory: true`인 고정비(예: "그 외 교통비")는 이름과 상관없이 **그 카테고리 결제를 모두 고정비로** 봐요
- `subscriptionAlert`: 구독(`category: "구독"`이고 `billingDay`가 있는 고정비) 결제 `daysBefore`일 전에 "계속 쓸까요?" 알림을 보여 줄지. 지금은 설정 화면 미리보기만 있고, 홈 화면 알림으로 쓰면 돼요

### PUT /api/settings
```json
요청 { "monthlyBudget": 500000, "fixedCosts": [ { "name": "넷플릭스", "amount": 13500, "category": "구독", "billingDay": 1 } ],
       "subscriptionAlert": { "enabled": true, "daysBefore": 3 } }
응답 200 (GET과 같은 형식)
```
- 통째로 바꿔요. 금액이 음수면 400
- 통째로 바꾸니까 `monthlyBudget`, `fixedCosts` 둘 다 보내요. 하나라도 없으면 400 (실수로 고정비가 지워지지 않게)
- `subscriptionAlert`는 안 보내면 그대로 둬요. 보내면 `enabled`(true·false)와 `daysBefore`(1~14) 둘 다 → 아니면 400
- 금액은 0 이상 정수, 고정비 이름은 1~30자, 고정비는 30개까지, 카테고리·결제일이 틀리면 → 400

### GET /api/settings/suggestions?months=2
지난 거래로 **다음 달 고정지출을 카테고리별로** 예상해요. 설정 화면의 "다음 달 고정지출 예상" 카드가 불러요. 저장은 하지 않아요.
```json
응답 200 {
  "months": 2,
  "from": "2026-09-01",
  "to": "2026-11-18",
  "averageMonths": ["2026-09", "2026-10"],
  "averageSpending": 239500,
  "expectedTotal": 172500,
  "categories": [
    { "category": "교통", "expected": 130000,
      "items": [ { "name": "티머니 정기권", "category": "교통", "amount": 55000, "billingDay": 1, "months": 3, "registered": false } ],
      "steady": { "category": "교통", "average": 75000, "min": 72000, "max": 78000, "registered": false } },
    { "category": "구독", "expected": 42500, "items": [ ... ], "steady": null }
  ]
}
```
- `months`: 이번 달 앞으로 몇 달을 볼지 (1~12, 없으면 2) → 틀리면 400. 2면 11월 기준 9월 1일 ~ 오늘
- `categories[].items`: 같은 가게에서 **한 달에 한 번씩, 두 달 이상, 금액 차이 10% 안**으로 나간 지출 (정기권, 구독료, 통신비)
  - `amount`는 가장 최근 금액, `billingDay`는 가장 최근 결제일, `months`는 나온 달 수, `registered`는 **이름으로** 이미 고정비에 있는지
- `categories[].steady`: 그 밖에 **다 끝난 달마다 평균 ±20% 안**으로 쓴 돈 (예: 버스·택시). 한 달 평균 1만 원 이상, 다 끝난 달이 2개 이상일 때만. `registered`는 같은 카테고리의 `wholeCategory` 고정비가 있는지
- `expected` = items 금액 합 + steady 평균. `expectedTotal`은 모든 카테고리의 합. 금액이 큰 카테고리부터
- 학식·외식·배달·카페·편의점·술·모임은 매일 쓰는 돈이라 고정지출로 보지 않아요
- `averageMonths`: 평균을 낸 달(거래가 있는 지난달들, 이번 달은 빼요). `averageSpending`은 그 달들의 전체 지출 평균
- 지출(`isExpense: true`)만, 내 거래만 봐요. 계산은 `src/services/budgetSuggest.js`

### GET /api/settings/membership
설정 화면 **계정 → 탈퇴하기** 시트가 먼저 불러요. 탈퇴하면 지워지는 내 기록 수를 알려 줘요.
```json
응답 200 {
  "username": "survibe01",
  "records": { "transactions": 40, "accounts": 4, "fixedCosts": 4, "rules": 2 },
  "blockedReason": null
}
```
- `blockedReason`: 탈퇴할 수 없는 이유. 시연 서버(임시 DB)의 연습 계정 `demo`만 막아요 (여러 사람이 같이 쓰는 계정이라서). 탈퇴할 수 있으면 `null`

### DELETE /api/settings/membership — 회원 탈퇴
```json
요청 { "password": "password123" }        ← DELETE지만 본문(JSON)을 보내요
응답 200 { "deleted": { "accounts": 4, "transactions": 40, "rules": 2, "settings": 1 } }
```
- 비밀번호를 한 번 더 확인해요. 없거나 틀리면 **400** (401이면 화면의 `api()`가 로그아웃시켜서 401을 쓰지 않아요)
- 연습 계정이면 403, 비밀번호를 15분 동안 10번 틀리면 429
- `user` 칸이 있는 **모든 모델**(거래, 자산, 분류 규칙, 설정)에서 내 기록을 지우고, 마지막에 계정을 지워요. `deleted`는 컬렉션마다 지운 개수
- 새 모델을 만들어도 `user: { type: ObjectId, ref: 'User' }` 칸만 있으면 탈퇴할 때 같이 지워져요 (`src/services/membership.js`)
- 지운 뒤에는 같은 아이디로 다시 가입할 수 있어요. 화면은 이 기기에 저장한 값(`budget.`으로 시작하는 localStorage: 로그인 토큰, 디자인 시안)도 지워요

---

## F2 캡처 읽기 — 박영웅 🔒

### POST /api/scans
- `multipart/form-data`, 필드 이름 `images`, 최대 5장, 장당 5MB, png·jpg·webp
- **저장하지 않고** 읽은 결과만 돌려줘요. 사용자가 확인한 뒤 `POST /api/transactions`로 저장해요.
```json
응답 200 {
  "items": [
    { "date": "2026-11-03", "merchant": "스타벅스 한양대점", "amount": 5600, "category": "카페", "isExpense": true, "categorySource": "rule" }
  ]
}
```
- `categorySource`: `"rule"`(전에 고친 규칙) 또는 `"ai"`
- 파일이 없거나 형식·크기·장수가 틀리면 400, AI가 읽지 못하면 422, 요청이 많으면 429, AI 응답 실패는 502, API 키가 없으면 503

---

## F3 거래 내역 — 1학년 B 🔒

### POST /api/transactions
여러 건을 한 번에 저장해요. (올리기 화면의 저장 버튼이 불러요)
```json
요청 {
  "items": [
    { "date": "2026-11-03", "merchant": "스타벅스 한양대점", "amount": 2800, "originalAmount": 5600, "splitCount": 2,
      "category": "카페", "accountId": null, "isExpense": true, "categoryEdited": false }
  ]
}
응답 201 { "saved": 1, "items": [ { "id": "6731...", ... } ] }
```
- `amount`는 내 몫, `originalAmount`는 원래 결제 금액, `splitCount`는 더치페이 사람 수 (없으면 1), `isExpense`는 없으면 `true`
- `categoryEdited: true`인 건은 `learnRule()`로 규칙을 저장해요
- 하나라도 형식이 틀리면 아무것도 저장하지 않고 400

### GET /api/transactions?month=2026-11
```json
응답 200 [
  { "id": "6731...", "date": "2026-11-03", "merchant": "스타벅스 한양대점", "amount": 2800, "originalAmount": 5600,
    "splitCount": 2, "category": "카페", "accountId": null, "isExpense": true, "source": "scan" }
]
```
- 날짜 최신순. `month`가 없거나 형식이 틀리면 400

### PATCH /api/transactions/:id
```json
요청 { "category": "학업" }   ← 바꿀 것만 (date, merchant, amount, category, isExpense)
응답 200 { "id": "6731...", ... }
```
- 카테고리를 바꾸면 `learnRule()`로 규칙도 저장해요
- 없거나 남의 것이면 404

### DELETE /api/transactions/:id
- 응답 204 / 없거나 남의 것이면 404

---

## F4·F5 요약 — 1학년 C 🔒

### GET /api/summary/today
```json
응답 200 {
  "date": "2026-11-06",
  "monthlyBudget": 500000,
  "fixedTotal": 13500,
  "spentBeforeToday": 120000,
  "spentToday": 8000,
  "remainingDays": 25,
  "dailyAllowance": 14660,
  "level": "ok"
}
```
- `dailyAllowance` = (월 예산 − 고정비 합계 − 어제까지 쓴 돈) ÷ 오늘 포함 남은 날짜, 원 단위 버림, 0보다 작으면 0
- `level`: 오늘 쓴 돈이 `dailyAllowance`의 80% 미만 `"ok"`, 80% 이상 `"warning"`, 100% 이상 `"over"`. 예산을 아직 안 정해서 둘 다 0이면 `"ok"`
- 지출(`isExpense: true`)만 더해요
- 고정비로 등록한 결제는 `spentBeforeToday`, `spentToday`에서 빼요. 예산에서 이미 뺐으니 두 번 계산하지 않아요. `src/services/fixedCosts.js`의 `isFixedCost(merchant, fixedCosts, category)`를 쓰면 돼요. 월별 합계에는 그대로 넣어요
  - 거래의 `category`도 같이 넘겨 주세요. "그 외 교통비"처럼 `wholeCategory`인 고정비는 카테고리로 비교해요

### GET /api/summary/monthly?month=2026-11
```json
응답 200 {
  "month": "2026-11",
  "total": 320000,
  "prevMonth": "2026-10",
  "prevTotal": 290000,
  "byCategory": [
    { "category": "배달", "amount": 90000, "prevAmount": 60000, "diff": 30000 }
  ]
}
```
- `byCategory`는 이번 달 지출이 있는 카테고리만, 금액이 큰 순서. 지출만 더해요

---

## F6 정책 추천 — 1학년 D 🔒

### GET /api/recommendations?month=2026-11
```json
응답 200 {
  "month": "2026-11",
  "targets": [
    { "category": "교통", "reason": "most", "amount": 80000, "diff": 5000 },
    { "category": "배달", "reason": "increased", "amount": 90000, "diff": 30000 }
  ],
  "items": [
    { "category": "교통", "type": "policy", "title": "K-패스", "description": "대중교통비 일부를 돌려받아요", "url": "https://..." }
  ]
}
```
- `targets`: 이번 달 가장 많이 쓴 카테고리(`most`) + 지난달보다 가장 많이 늘어난 카테고리(`increased`)
- `items`: `data/policies.json`에서 target 카테고리에 맞는 것

### data/policies.json 형식
```json
[
  { "category": "교통", "type": "policy", "title": "K-패스", "description": "한 줄 설명", "url": "출처 링크" },
  { "category": "배달", "type": "tip", "title": "학식 이용하기", "description": "한 줄 설명", "url": "" }
]
```
- `type`: `"policy"`(정책) 또는 `"tip"`(대안)
- `category`는 `data/categories.json`에 있는 이름이어야 해요
