# 배포 순서 (11/24까지, 박영웅)

## 목업 시연용 데모 (Render, 무료)

발표 전까지 링크로 보여 주는 용도예요. 임시 DB라 서버가 다시 켜지면 데이터가 처음으로 돌아가요. 15분 동안 안 쓰면 잠들어서 첫 접속이 1분쯤 걸려요.

1. https://render.com 에 GitHub 계정으로 가입해요.
2. **New → Blueprint**에서 `Sur-Vibe` 저장소를 고르면 `render.yaml` 설정대로 만들어져요.
3. 알려 준 주소에서 **가입 없이 데모로 둘러보기**를 눌러요.

캡처 읽기는 데모에서 꺼 둬요. 링크가 공개라서 AI 키를 넣으면 누구나 써서 요금이 나갈 수 있어요.

아래는 발표용 진짜 배포예요.

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

## 6. 운영 (수업계획 13주차)

**요금 한도부터 걸어요.** Anthropic 콘솔의 Limits에서 월 사용 한도를 정해요. (예: 10달러) Google Cloud는 결제 → 예산 및 알림에서 예산 알림을 만들어요.

오류가 나면 서버 로그를 봐요.

```bash
gcloud run services logs read sur-vibe --region asia-northeast3 --limit 50
```

새로 배포한 버전이 고장 나면 이전 버전으로 되돌려요. 버전 이름은 Cloud Run 콘솔의 수정 버전 탭에 있어요.

```bash
gcloud run services update-traffic sur-vibe --region asia-northeast3 --to-revisions 이전버전이름=100
```

API 키가 새면 콘솔에서 폐기하고 새 키로 바꿔요. 다른 설정은 그대로 남아요.

```bash
gcloud run services update sur-vibe --region asia-northeast3 --update-env-vars ANTHROPIC_API_KEY=<새 키>
```
