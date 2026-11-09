# AI 코딩 도구용 프로젝트 규칙

Claude Code와 Codex가 이 프로젝트에서 코드를 만들 때 지켜야 하는 규칙이에요. (1강 컨텍스트 프라이밍)

## 프로젝트
- 자동 분류 가계부 웹 앱 (대학생용). 요구사항은 `docs/requirements.md`, API 형식은 `docs/API.md`.
- 백엔드: Node.js + Express 5 (CommonJS, `require`). DB: MongoDB + Mongoose. 로그인: JWT.
- 프론트엔드: `public/` 폴더의 HTML + Bootstrap 5 + 바닐라 JavaScript (ES 모듈, `import`). 프레임워크(React 등) 쓰지 않음.

## 꼭 지킬 것
1. **자기 담당 파일만 고친다.** 각 파일 맨 위 주석에 담당자가 적혀 있다. 다른 사람 파일을 고쳐야 하면 고치지 말고 사용자에게 알린다.
2. **`docs/API.md`의 요청·응답 형식을 그대로 따른다.** 형식을 바꾸지 않는다.
3. 서버에서는 로그인한 사람의 id가 `req.userId`에 있다. DB를 찾거나 고칠 때 **항상 `user: req.userId` 조건을 넣는다.** 남의 데이터는 404.
4. 클라이언트가 보낸 값은 믿지 않는다. 서버에서 다시 검사하고 틀리면 `throw new HttpError(400, '메시지')` (`src/utils/httpError.js`).
5. Express 5라서 async 라우터에서 throw하면 `src/middleware/error.js`가 알아서 응답한다. try/catch로 직접 응답하지 않는다.
6. 모델은 `require('../models')`에서 가져온다. 카테고리 목록은 `src/categories.js`.
7. 화면에서 서버를 부를 때는 `public/js/api.js`의 `api(method, url, body)`를 쓴다. 금액 표시는 `won()`.
8. 화면 요소는 `public/js/ui.js`의 `el()`로 만든다. 사용자 입력을 `innerHTML`에 넣지 않는다. (XSS)
   - HTML의 `style="..."` 속성은 보안 정책(CSP) 때문에 막힌다. 스타일은 `public/css/style.css`에 클래스로 추가한다.
   - 지금 화면은 `public/js/mock.js`의 예시 데이터로 그린 목업이다. API를 만들면 예시 데이터 대신 `api()`로 불러온다. 화면 모양은 최대한 유지한다.
9. HTML에 `<script>` 안쪽 코드(인라인)를 쓰지 않는다. 보안 정책(CSP) 때문에 실행되지 않는다. JS는 `public/js/` 파일로 만든다.
10. 새 npm 패키지가 필요하면 설치 전에 사용자에게 먼저 물어본다.
11. API 키, 비밀번호를 코드에 쓰지 않는다. `.env`와 `src/config.js`를 쓴다.
12. 화면 글자와 오류 메시지는 한국어, 쉬운 말로 쓴다.
13. 디자인 콘셉트는 **영수증·통장**이다. 화면이 따로 놀지 않게 아래를 지킨다.
    - 색은 `public/css/style.css`의 토큰만 쓴다. 새 색을 만들지 않는다.
    - 이모지를 쓰지 않는다. 그림자, 그라데이션, 크게 둥근 모서리를 넣지 않는다.
    - 금액은 오른쪽에 크게, 항목은 `receipt-line`처럼 이름과 금액을 한 줄로 놓는다. 합계는 `receipt-total`을 쓴다.
    - 숫자 카드를 3~4개 나란히 놓는 대시보드 모양은 만들지 않는다.

## 확인 방법
- `npm run dev` → http://localhost:3000
- `npm run lint` → 경고 0개
- `npm test` → 실패 0개. 내 기능의 `[A]`~`[D]` 시험은 건너뛰지 않고 통과해야 한다. `test/contract.test.js`는 고치지 않는다.
