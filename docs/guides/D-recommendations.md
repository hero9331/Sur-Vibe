# 1학년 D 설명서 — F6 청년 정책·대안 추천 (차별점)

처음이면 [시작 안내](START-HERE.md)부터 봐요.

## 내가 만드는 것
우리 앱의 **차별점**이에요. 교수님이 다른 팀과 비교해서 평가한다고 하셨으니 제일 눈에 띄어야 해요.

1. **정책 조사**: 카테고리마다 돈을 아낄 수 있는 청년 정책이나 대안을 찾아서 `data/policies.json`에 정리
2. **추천 API**: 이번 달 많이 쓴 카테고리를 찾아서 맞는 정책을 돌려주기
3. **추천 화면**: 월별 보기 화면 아래에 추천 카드 보여 주기

## 고칠 파일 (이것만 고쳐요)
- `data/policies.json` — 정책·대안 목록
- `src/routes/recommendations.js` — 추천 API
- `public/monthly.html` — **`recommendations-section` 안쪽만** (`monthly-section`은 1학년 C 담당)
- `public/js/recommendations.js`

## 1단계: 정책 조사 (코딩 전에 먼저)
- 카테고리 목록은 `data/categories.json`에 있어요. 최소 **교통, 학식·외식·배달, 생활, 문화·여가, 학업** 5개 분야
- 분야마다 **정책 2개 이상 + 대안 1개 이상**
- 예: 교통 → K-패스 / 식비 → 천원의 아침밥
- **출처 링크를 꼭** 넣어요. (정부 사이트, 학교 공지 등) AI가 지어낸 정책일 수 있으니 직접 링크를 열어서 진짜인지 확인해요. (12주 환각 대응)
- 하나 넣을 때마다 네 가지를 확인해요.
  1. 지금도 운영하나요? (올해 공고가 있는지)
  2. 대학생이나 청년이 받을 수 있나요? (나이, 소득, 지역 조건)
  3. 공식 사이트 링크가 열리나요?
  4. 설명을 출처 복사가 아니라 내 말로 한 줄로 썼나요?
- 형식은 `docs/API.md` 맨 아래 **data/policies.json 형식**을 따라요.

## AI에게 줄 첫 지시 (3강 RCTF)

```
[Role] 너는 Node.js Express 개발자야.
[Context] 이 프로젝트의 AGENTS.md, docs/API.md, src/models/Transaction.js, data/policies.json을 먼저 읽어.
[Task] src/routes/recommendations.js에 docs/API.md의 "F6 정책 추천" API를 만들어 줘.
       notImplemented는 지우고, 항상 user: req.userId 조건으로 계산해 줘.
       targets는 이번 달 가장 많이 쓴 카테고리와 지난달보다 가장 많이 늘어난 카테고리야.
       items는 data/policies.json에서 targets 카테고리에 맞는 것만 골라 줘.
[Constraints] 담당 파일만 고치고 새 패키지는 설치하지 마. test/contract.test.js는 고치지 마.
       이번 달 거래가 없을 때, 지난달 거래가 없을 때, 맞는 정책이 없는 카테고리일 때도 오류 없이 답하게 해.
[Format] 코드를 고친 뒤 무엇을 바꿨는지 3줄로 알려 줘.
```

API가 되면 다음을 시켜요.
- `public/js/recommendations.js`로 `recommendations-section` 안에 추천 카드 만들기 (제목, 설명, "자세히 보기" 링크)

## 확인하는 법
1. `npm run dev`, 연습 계정 `demo` / `demo1234`로 로그인
2. 테스트 거래는 이미 들어 있어요. 이번 달 교통비를 가장 많이 썼고, 배달비가 지난달보다 늘어난 모습이에요
3. **Thunder Client**(9강): `GET /api/recommendations?month=2026-11`
4. `npm run lint` 경고 0개

## 다 됐다는 기준
- [ ] `npm test`에서 `[D]` 테스트가 건너뛰지 않고 모두 통과
- [ ] 정책·대안 15개 이상, 모두 출처 링크 확인함
- [ ] 많이 쓴 카테고리에 맞는 추천이 보임
- [ ] 거래가 없어도 오류 없이 "내역이 쌓이면 추천해 드려요"
- [ ] 폰 크기 화면에서도 깨지지 않음

## Git
브랜치 이름: `feature/recommendations`
