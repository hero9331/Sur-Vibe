# 배포 순서 (11/24까지, 박영웅)

7강에서 배운 **Cloud Run**에 올려요. 캡처를 여러 장 올려야 해서 요청 크기 제한이 작은 Vercel은 맞지 않아요.

## 1. MongoDB Atlas
1. https://account.mongodb.com 에서 무료 클러스터(M0)를 만들어요. (7강)
2. Database Access에서 사용자를 만들어요.
3. Network Access에 `0.0.0.0/0`을 추가해요. Cloud Run은 주소가 고정되지 않아요.
4. Connect → Drivers에서 주소를 복사해요. `mongodb+srv://...` 뒤에 DB 이름 `budget`을 넣어요.

## 2. Google Cloud
1. https://cloud.google.com 에서 가입하고 프로젝트를 만들어요.
2. [gcloud CLI](https://cloud.google.com/sdk/docs/install)를 설치해요.
3. 터미널에서 로그인해요.

```bash
gcloud auth login
```

## 3. 비밀 키 만들기

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. 배포
프로젝트 폴더에서 실행해요. `<...>`는 내 값으로 바꿔요. 이 명령은 키가 들어가니 어디에도 공유하지 않아요.

```bash
gcloud run deploy sur-vibe --source . --region asia-northeast3 --allow-unauthenticated --max-instances 1 --set-env-vars "NODE_ENV=production,JWT_SECRET=<비밀 키>,MONGODB_URI=<Atlas 주소>,ANTHROPIC_API_KEY=<Claude 키>"
```

`NODE_ENV=production`을 빼면 임시 DB와 개발용 비밀 키를 쓰게 되니 꼭 넣어요.

## 5. 확인
- 알려 준 주소 뒤에 `/api/health`를 붙여 열면 `{"ok":true}`가 나와요.
- 폰으로 가입 → 캡처 올리기 → 저장 → 내역 → 월별까지 처음부터 끝까지 해 봐요.
- 발표 직전에 한 번 열어 둬요. 한동안 안 쓰면 첫 화면이 느려요.
- 크롬 개발자 도구에서 Lighthouse를 돌려 90점이 넘는지 봐요. (6강)
