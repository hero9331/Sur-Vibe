# 1학년 시작 안내 (제일 먼저 읽어요)

순서대로 따라 하면 돼요. 막히면 맨 아래 **막혔을 때**를 보고, 그래도 안 되면 단톡방에 화면을 캡처해서 올려요.

## 1. 설치 (회의 전에)

1. [Node.js](https://nodejs.org) LTS 버전
2. [Git](https://git-scm.com)
3. [VS Code](https://code.visualstudio.com)와 확장 프로그램 **Thunder Client**
4. Claude Code 또는 Codex 중 하나
5. GitHub에서 저장소 초대 메일을 **수락**해요.

설치가 됐는지 확인해요.

```bash
node -v
git -v
```

## 2. 내 이름으로 커밋되게 설정 (한 번만)

이걸 안 하면 내가 한 작업이 내 이름으로 남지 않아요. 이메일은 **GitHub에 등록한 이메일**을 써요.

```bash
git config --global user.name "내 이름"
```

```bash
git config --global user.email "GitHub에 등록한 이메일"
```

## 3. 코드 받고 실행

**한글이 없는 폴더**에서 해요. `바탕 화면` 안은 안 돼요. VS Code 터미널은 **Git Bash**로 바꿔서 써요.

```bash
mkdir -p /c/dev
```

```bash
cd /c/dev
```

```bash
git clone https://github.com/hero9331/Sur-Vibe.git
```

```bash
cd Sur-Vibe
```

```bash
npm install
```

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열고 연습 계정으로 로그인해요.

- 아이디 `demo`, 비밀번호 `demo1234`
- 내 컴퓨터의 임시 DB에만 있는 계정이에요. 계좌, 예산, 이번 달과 지난달 거래가 미리 들어 있어요.
- 서버를 껐다 켜면 처음 상태로 돌아가요.
- 지금 화면 숫자는 `예시 데이터`예요. 내 기능을 만들면 진짜 데이터로 바뀌어요.

## 4. 내 기능 고르기

| | 기능 | 하는 일 | 난이도 | 설명서 |
|---|---|---|---|---|
| A | 계좌·설정 | 계좌 등록, 월 예산, 고정비. 9강 Todo와 거의 같아요 | 쉬움 | [A](A-accounts-settings.md) |
| B | 거래 내역 | 거래 저장, 보기, 고치기, 지우기 | 보통 | [B](B-transactions.md) |
| C | 홈·월별 | 오늘 쓸 수 있는 돈 계산, 그래프 | 조금 어려움 | [C](C-summary.md) |
| D | 정책 추천 | 청년 정책을 직접 조사하고 추천. 우리 팀 차별점이에요 | 조사가 많음 | [D](D-recommendations.md) |

다른 사람 기능이 끝나길 기다리지 않아도 돼요. 연습 계정에 데이터가 있어서 각자 시작할 수 있어요.

## 5. 매번 하는 작업 순서

처음 한 번만 브랜치를 만들어요. 브랜치 이름은 내 설명서 맨 아래에 있어요.

```bash
git checkout main
```

```bash
git pull
```

```bash
git checkout -b feature/내기능
```

그다음부터는 이걸 반복해요.

1. 설명서의 **AI에게 줄 첫 지시**를 AI 도구에 붙여 넣어요. 한 번에 하나만 시켜요.
2. `npm run dev`로 직접 눌러 봐요.
3. `npm test`, `npm run lint`로 확인해요.
4. 작은 단위로 저장해요.

```bash
git add .
```

```bash
git commit -m "F1 계좌 목록 API 추가"
```

```bash
git push -u origin feature/내기능
```

5. 기능이 끝나면 GitHub에서 **Compare & pull request**를 눌러요. 체크리스트를 채우고 만들어요.
6. 자동 검사가 초록색이 되면 박영웅이 확인하고 합쳐요. 고쳐 달라고 하면 같은 브랜치에서 고쳐서 다시 push해요.

`npm test`에서 내 기능 시험이 `SKIP`이면 아직 안 만들었다는 뜻이에요. 다 만들면 전부 통과해야 해요. **시험지(`test/contract.test.js`)는 고치면 안 돼요.** 고치면 자동 검사가 막아요.

## 6. AI가 만든 코드, 내가 설명할 수 있어야 해요

발표 때 내 기능에 대해 질문을 받을 수 있어요. PR을 만들기 전에 AI에게 물어보고 내 말로 답할 수 있게 해 둬요.

1. 이 코드는 어떤 순서로 실행돼?
2. 왜 `user: req.userId` 조건이 필요해? 빼면 어떤 일이 생겨?
3. 잘못된 값을 보내면 어디서 막아?
4. 이 부분을 AI가 틀렸을 수 있다면 어디일까?

AI가 내 담당이 아닌 파일이나 시험지를 고치려고 하면 **거절**해요.

## 7. 절대 하면 안 되는 것

- `.env`, API 키, 비밀번호 올리기
- 진짜 결제내역 캡처 올리기 (이 저장소는 공개예요)
- `main`에 바로 올리기, 강제 푸시(`--force`)
- 새 패키지를 물어보지 않고 설치하기

## 막혔을 때

| 이런 일이 생기면 | 이렇게 해요 |
|---|---|
| `npm`이 PowerShell에서 안 돼요 | VS Code 터미널을 **Git Bash**로 바꿔요 |
| 서버가 갑자기 꺼져요 | 폴더 경로에 한글이 있는지 봐요. `C:\dev`로 옮겨요 |
| 처음 `npm run dev`가 오래 걸려요 | 임시 DB를 내려받는 중이에요. 1~2분 기다려요 |
| `EADDRINUSE` 오류 | 다른 터미널에 서버가 켜져 있어요. 그 터미널에서 `Ctrl + C` |
| API가 `501`을 줘요 | 아직 안 만든 기능이에요. 내 기능이면 만들면 돼요 |
| 캡처 읽기에서 키를 확인하라고 나와요 | 정상이에요. A~D 작업에는 AI 키가 필요 없어요 |
| 화면이 안 바뀌어요 | `Ctrl + Shift + R`로 새로고침해요 |
| 인라인 코드가 실행되지 않고 콘솔에 CSP 오류가 나요 | `<script>` 안쪽 코드와 `style="..."`는 막혀 있어요. 파일로 빼요 |
| push가 거절돼요 | `git pull origin main`을 한 뒤 다시 push해요 |
| `CONFLICT`가 떠요 | 혼자 지우지 말고 단톡방에 알려요 |
| 자동 검사가 빨간색이에요 | PR의 **Details**를 눌러 로그를 AI에게 보여 주고 원인을 물어봐요 |
