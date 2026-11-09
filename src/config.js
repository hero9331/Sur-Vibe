// 환경 변수(.env)를 한곳에서 읽어요. 키나 비밀번호를 코드에 직접 쓰지 않기 위해서예요. (8강, 9강)
require('dotenv').config({ quiet: true });

const isProd = process.env.NODE_ENV === 'production';

const config = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  mongodbUri: process.env.MONGODB_URI || '',
  // 개발할 때만 기본값을 써요. 배포할 때는 반드시 .env에 JWT_SECRET을 넣어야 해요.
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-only-secret-change-me'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
};

if (isProd && !config.jwtSecret) {
  throw new Error('JWT_SECRET이 없어요. .env를 확인해 주세요.');
}

module.exports = config;
