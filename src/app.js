const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { isMemoryDb } = require('./db');
const { requireAuth } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();

  // 배포 서버(Cloud Run, Vercel)는 프록시를 거쳐서 들어와요.
  // 이 설정이 없으면 모든 사용자를 같은 사람으로 봐서 Rate Limit이 전체에 걸려요.
  if (config.isProd || config.trustProxy) app.set('trust proxy', 1);

  // 보안 헤더 (9강 helmet). Bootstrap과 글꼴은 jsdelivr CDN에서 받아요.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
          'style-src': ["'self'", 'https://cdn.jsdelivr.net'],
          'font-src': ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'connect-src': ["'self'", 'https://cdn.jsdelivr.net'],
          // 개발 중에는 폰에서 http://내컴퓨터IP:3000 으로 열어 볼 수 있게 꺼 둬요.
          'upgrade-insecure-requests': config.isProd ? [] : null,
        },
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  // 캡처 읽기는 AI 요금이 나가서 사람마다, 그리고 앱 전체로 횟수를 제한해요. (9강 Rate Limiting)
  const hourlyLimit = (options) => rateLimit({ windowMs: 60 * 60 * 1000, standardHeaders: 'draft-8', legacyHeaders: false, ...options });
  const scanUserLimiter = hourlyLimit({
    limit: 30,
    keyGenerator: (req) => req.userId,
    message: { error: '캡처는 1시간에 30번까지 읽을 수 있어요. 잠시 후 다시 해 주세요' },
  });
  const scanTotalLimiter = hourlyLimit({
    limit: 200,
    keyGenerator: () => 'all-users',
    message: { error: '지금 사용자가 많아요. 잠시 후 다시 해 주세요' },
  });

  // demo: 임시 DB로 돌아가는 시연용 서버인지. 로그인 화면이 '데모로 둘러보기' 버튼을 보여 줄지 정해요.
  app.get('/api/health', (req, res) => res.json({ ok: true, demo: isMemoryDb() }));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/categories', require('./routes/categories'));
  app.use('/api/accounts', requireAuth, require('./routes/accounts'));
  app.use('/api/settings', requireAuth, require('./routes/settings'));
  app.use('/api/scans', requireAuth, scanUserLimiter, scanTotalLimiter, require('./routes/scans'));
  app.use('/api/transactions', requireAuth, require('./routes/transactions'));
  app.use('/api/summary', requireAuth, require('./routes/summary'));
  app.use('/api/recommendations', requireAuth, require('./routes/recommendations'));
  app.use('/api', notFound);

  // 화면 파일(public 폴더)도 같은 서버에서 보내요. 주소가 같아서 CORS 문제가 없어요.
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
  app.use((req, res) => res.status(404).sendFile(path.join(publicDir, '404.html')));

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
