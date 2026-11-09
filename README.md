# 자동 분류 가계부 · 팀 Sur-Vibe

결제내역 캡처만 올리면 AI가 알아서 분류·기록해 주고, 돈을 많이 쓴 분야를 줄일 수 있는 청년 정책·대안을 추천해 주는 대학생 가계부 웹 앱이에요.

- 요구사항: [docs/requirements.md](docs/requirements.md)
- API 형식: [docs/API.md](docs/API.md)
- 할 일: [TODO.md](TODO.md)
- 기능별 설명서: [docs/guides/](docs/guides/)

## 처음 실행하기

1. [Node.js](https://nodejs.org) LTS 버전 설치
2. 프로젝트 폴더를 **경로에 한글이 없는 곳**에 둬요. (예: `C:\dev\budget-app`)
   - `바탕 화면` 같은 한글 폴더 안에 두면 Node가 갑자기 꺼질 수 있어요.
3. 터미널에서:
   ```bash
   npm install
   npm run dev
   ```
4. 브라우저에서 http://localhost:3000 → 회원가입 → 로그인

`.env` 파일이 없으면 **임시 메모리 DB**로 실행돼요. 서버를 끄면 데이터가 사라지지만 개발하기엔 충분해요. (처음 실행할 때 테스트용 DB를 내려받느라 1~2분 걸려요)

## 명령어

| 명령어 | 하는 일 |
|---|---|
| `npm run dev` | 서버 실행 (코드를 고치면 자동으로 다시 시작) |
| `npm test` | 테스트 실행 |
| `npm run lint` | 코드 검사 (ESLint) |

## 폴더 구조

```
src/
  app.js            서버 설정 (미들웨어, 라우터 연결)
  server.js         서버 시작
  config.js         .env 읽기
  db.js             MongoDB 연결
  categories.js     카테고리 목록
  middleware/       로그인 확인(auth.js), 오류 처리(error.js)
  models/           DB 모양 (User, Account, Transaction, Rule, Setting)
  routes/           API (기능마다 파일 하나)
  services/rules.js 고친 분류 기억하기
  utils/            HttpError
public/             화면 (HTML, CSS, JS)
data/               카테고리, 청년 정책 목록 (JSON)
docs/               요구사항, API 문서, 설명서
test/               테스트
```

## 누가 어떤 파일을 고치나요?

| 담당 | 기능 | 고칠 파일 |
|---|---|---|
| 박영웅 | F0 로그인, F2 캡처 → AI 분류, 뼈대 | `routes/auth.js`, `routes/scans.js`, `upload.html`, `js/upload.js`, `js/layout.js` 등 |
| 1학년 A | F1 계좌·카드, 설정 | `routes/accounts.js`, `routes/settings.js`, `settings.html`, `js/settings.js` |
| 1학년 B | F3 거래 내역 | `routes/transactions.js`, `transactions.html`, `js/transactions.js` |
| 1학년 C | F4 홈 예산 경고, F5 월별 보기 | `routes/summary.js`, `index.html`, `js/home.js`, `js/monthly.js` |
| 1학년 D | F6 정책 추천 | `routes/recommendations.js`, `data/policies.json`, `js/recommendations.js` |

다른 사람 파일을 고쳐야 할 것 같으면 먼저 단톡방에 말해 주세요.

## Git 작업 순서 (4강)

```bash
git checkout main
git pull
git checkout -b feature/내기능이름    # 처음 한 번만
# ... AI와 같이 코드 만들기 ...
git add .
git commit -m "F1 계좌 목록 API 추가"
git push -u origin feature/내기능이름
```

GitHub에서 Pull Request를 만들면 박영웅이 확인하고 main에 합쳐요.

## 보안 규칙

- `.env`는 절대 GitHub에 올리지 않아요. (`.gitignore`에 등록돼 있어요)
- 테스트용 결제내역 캡처는 이름, 카드번호, 계좌번호를 가린 것만 써요.
