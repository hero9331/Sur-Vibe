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
  { "id": "6730...", "name": "생활비 통장", "type": "bank", "institution": "토스뱅크", "purpose": "매일 쓰는 돈", "createdAt": "...", "updatedAt": "..." }
]
```

### POST /api/accounts
```json
요청 { "name": "생활비 통장", "type": "bank", "institution": "토스뱅크", "purpose": "매일 쓰는 돈" }
응답 201 { "id": "6730...", "name": "생활비 통장", ... }
```
- `type`은 `"bank"`(계좌) 또는 `"card"`(카드)
- `name`, `type`, `institution`은 꼭 필요 → 없으면 400

### PATCH /api/accounts/:id
```json
요청 { "purpose": "저축만" }        ← 바꿀 것만 보내요
응답 200 { "id": "6730...", ... }  ← 바뀐 전체
```
- 없거나 남의 것이면 404

### DELETE /api/accounts/:id
- 응답 204 / 없거나 남의 것이면 404

## F4 설정 — 1학년 A 🔒

### GET /api/settings
```json
응답 200 { "monthlyBudget": 500000, "fixedCosts": [ { "name": "넷플릭스", "amount": 13500 } ] }
```
- 아직 저장한 적 없으면 `{ "monthlyBudget": 0, "fixedCosts": [] }`

### PUT /api/settings
```json
요청 { "monthlyBudget": 500000, "fixedCosts": [ { "name": "넷플릭스", "amount": 13500 } ] }
응답 200 (요청과 같은 형식)
```
- 통째로 바꿔요. 금액이 음수면 400

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
- 고정비로 등록한 결제는 `spentBeforeToday`, `spentToday`에서 빼요. 예산에서 이미 뺐으니 두 번 계산하지 않아요. `src/services/fixedCosts.js`의 `isFixedCost()`를 쓰면 돼요. 월별 합계에는 그대로 넣어요

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
