# 리팩터링 기록

5강 "AI 보조 리팩터링 4단계"를 그대로 따랐어요. 기능은 하나도 바꾸지 않았어요. (두 개의 모자 원칙)

- 날짜: 2026-11-24
- 대상: 팀장 담당 코드만 (1학년 담당 파일은 손대지 않았어요)
- 다시 재는 법: `npm run quality` (복잡도, 줄 수), `npm run coverage` (시험 범위)

## 1. 스멜 찾기 (사람)

ESLint 복잡도 기준을 5강 목표인 **5**로 낮춰서 돌렸더니 함수 9개가 걸렸어요.

| 함수 | 파일 | 복잡도 | 스멜 |
|---|---|---:|---|
| `normalizeItems` 안의 화살표 함수 | `src/services/scanner.js` | 10 | 검사 조건이 한 줄에 몰림 |
| `detectImageType` | `src/services/scanner.js` | 10 | 의미 없는 숫자(매직 바이트)가 if문에 그대로 |
| `readCaptures` | `src/services/scanner.js` | 9 | 요청, 결과 확인, JSON 읽기가 한 함수에 |
| `toHttpError` | `src/services/scanner.js` | 7 | 같은 모양 if문 반복 |
| `api` | `public/js/api.js` | 10 | 요청 만들기와 응답 읽기가 한 함수에 |
| `errorHandler` | `src/middleware/error.js` | 7 | if-else 이어짐, 변수 덮어쓰기 |
| `prepareCapture` | `public/js/capture.js` | 7 | 사진 열기, 그리기, 압축이 한 함수에 |
| `main` | `eval/run.js` | 6 | 읽기와 결과 출력이 한 함수에 |
| `setAttr` | `public/js/ui.js` | 6 | (고치지 않음, 아래 참고) |

## 2. 시험 먼저 (사람)

시험 없는 리팩터링은 하지 않는다는 원칙대로, 고치기 **전에** 지금 동작을 시험으로 고정했어요.

| 새 시험 | 고정한 동작 |
|---|---|
| `test/error.test.js` (6개) | 깨진 JSON 400, DB 검사 오류 400, 잘못된 id 404, 예상 못 한 오류는 500이고 속 내용 숨김 |
| `test/api.test.js` (8개) | 토큰 머리말, JSON/파일 본문, 204, 오류 문구, 로그인 풀리면 로그인 화면으로 |
| `test/capture.test.js` (+5개) | 보통 캡처는 그대로, 긴 캡처는 jpg로, 무거우면 화질 한 번 더 낮춤 |
| `test/scan.test.js` (+1개) | Claude 권한 오류 503, 요청 초과 429, 서버 오류 502 |

새 시험은 모두 **고치기 전 코드에서 먼저 통과**한 걸 확인했어요. `eval/run.js`는 시험 대신 가짜 서버로 고치기 전후 출력을 비교해서 똑같은 걸 확인했어요.

## 3. 기법 이름을 정해서 고치기 (사람 → AI)

"고쳐 줘" 대신 Fowler 기법 이름을 콕 집어서 시켰어요. 한 번에 기법 하나씩 고치고, 고칠 때마다 시험을 돌렸어요. 커밋도 기법마다 하나예요.

| 함수 | 기법 | 바뀐 모양 |
|---|---|---|
| `normalizeItems` | 함수 추출 (Extract Function) | `cleanItem`, `cleanMerchant`, `cleanAmount`, `pickCategory`로 나눔 |
| `detectImageType` | 매직 리터럴 교체 (Replace Magic Literal) | 바이트를 `IMAGE_SIGNATURES` 표로, 비교는 `hasBytesAt` 하나로 |
| `toHttpError` | 중복 코드 통합 (Consolidate Duplicate Conditional Fragments) | if문 4개를 `API_ERROR_RESPONSES` 표 하나로 |
| `readCaptures` | 단계 쪼개기 (Split Phase) | 요청 → `checkStopReason` → `parseItems` → `normalizeItems` |
| `api` | 단계 쪼개기 (Split Phase) | `buildRequest` → `fetch` → `readResponse` |
| `errorHandler` | 함수 추출 + 보호절 (Guard Clause) | `describeError`로 분류, 400대는 바로 응답하고 끝 |
| `prepareCapture` | 함수 추출 + 매직 리터럴 교체 | `openBitmap`, `drawResized`, `compressToJpeg`, 화질 0.9/0.7을 상수로 |
| `main` (eval) | 단계 쪼개기 (Split Phase) | `readAllCases` → `scoreCases` → `printReport` |

AI에게 준 지시 예:

```
src/services/scanner.js 의 readCaptures 함수에 Split Phase 기법을 적용해 줘.
AI 요청 / 끝까지 답했는지 확인 / JSON 읽기를 각각 함수로 나눠.
외부 동작(응답 코드, 문구, 돌려주는 값)은 절대 바꾸지 마. 새 기능도 넣지 마.
```

## 4. 전후 비교 (사람)

### 고친 파일 5개

| 지표 | 전 | 후 | 변화 |
|---|---:|---:|---|
| 평균 복잡도 (CC) | 2.80 | 2.08 | **26% 감소** |
| 최대 복잡도 | 10 | 5 | 5강 목표(최대 5 이하) 달성 |
| 복잡도 5 넘는 함수 | 8개 | 0개 | |
| 함수 수 | 51 | 72 | 큰 함수가 작은 함수로 나뉨 |
| 코드 줄 수 (빈 줄·주석 뺌) | 357 | 386 | 8% 늘어남 (함수 이름과 상수 표가 생겨서) |

### 프로젝트 전체

| 지표 | 전 | 후 |
|---|---:|---:|
| 평균 복잡도 (CC) | 1.99 | 1.85 |
| 최대 복잡도 | 10 | 6 |
| 복잡도 5 넘는 함수 | 9개 | 1개 |
| 시험 (통과 / 실패) | 47 / 0 | 67 / 0 |
| 시험 범위: 줄 | 90.87% | 93.54% |
| 시험 범위: 분기 | 86.76% | 89.74% |
| ESLint 경고 (팀 기준 10) | 0 | 0 |

시험 12개는 아직 안 합친 1학년 기능(B 거래 내역) 시험이라 건너뛴 거예요.

### 5강 성공 기준과 비교

| 기준 | 결과 |
|---|---|
| 시험 통과율 유지 (동작 보존) | 통과. 실패 0개, 고치기 전 시험이 그대로 통과 |
| 평균 CC 10% 이상 감소 | 고친 파일 26% 감소. 전체는 7% 감소 (손대지 않은 파일이 대부분이라서) |
| 유지보수성(MI) 5점 이상 증가 | **재지 못함.** 강의의 `radon mi`는 파이썬 도구라서 자바스크립트에는 못 써요 |
| ESLint 경고 감소 | 팀 기준(10)으로는 전에도 0개. 강의 목표 기준(5)으로 재면 9개 → 1개 |

## 일부러 고치지 않은 것

- `public/js/ui.js`의 `setAttr` (복잡도 6): 경우 4개를 한 줄씩 나눈 짧은 함수라 지금이 더 읽기 쉬워요. 5강 말처럼 "코드 스멜은 즉시 수정 명령이 아니에요."
- 1학년 담당 파일: 각자 설명할 수 있어야 하는 코드라 손대지 않았어요. 고칠 점은 리뷰 댓글로 남겨요.
- 줄 수가 8% 늘었어요. 5강은 "줄거나 **분산**"을 목표로 해요. 큰 함수가 작은 함수로 나뉜 거라 분산에 해당해요.
