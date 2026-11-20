# 운영 배포용 이미지예요. 자세한 순서는 docs/DEPLOY.md
# 멀티스테이지 빌드: 1단계에서 실행에 필요한 패키지만 설치하고, 2단계에는 결과물만 담아 크기를 줄여요. (12강)

# 1단계: 실행에 필요한 패키지만 설치
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 2단계: 실제로 실행할 이미지
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
COPY data ./data

USER node
CMD ["node", "src/server.js"]
