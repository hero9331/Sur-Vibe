# Cloud Run 배포용이에요. 자세한 순서는 docs/DEPLOY.md
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public
COPY data ./data

USER node
CMD ["node", "src/server.js"]
