// F0 회원가입·로그인 — 담당: 박영웅
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { signToken, requireAuth } = require('../middleware/auth');
const { HttpError } = require('../utils/httpError');
const { isMemoryDb } = require('../db');
const { DEMO_USERNAME } = require('../devSeed');

const router = express.Router();

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TOO_MANY = { error: '시도가 너무 많아요. 15분 뒤에 다시 해 주세요' };

function limiter(options) {
  return rateLimit({ windowMs: FIFTEEN_MINUTES, standardHeaders: 'draft-8', legacyHeaders: false, message: TOO_MANY, ...options });
}

// 비밀번호를 여러 번 시도하는 공격은 아이디마다 막아요. (9강 Rate Limiting)
// 강의실처럼 와이파이 하나를 같이 쓰면 IP가 같아서, IP 제한은 넉넉하게 둬요.
const loginAttemptLimiter = limiter({ limit: 10, keyGenerator: (req) => readCredentials(req.body).username });
const loginIpLimiter = limiter({ limit: 200 });
const signupLimiter = limiter({ limit: 60 });

const USERNAME_RULE = /^[a-z0-9_]{4,20}$/;

function readCredentials(body) {
  const username = String(body?.username ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  return { username, password };
}

router.post('/signup', signupLimiter, async (req, res) => {
  const { username, password } = readCredentials(req.body);
  if (!USERNAME_RULE.test(username)) {
    throw new HttpError(400, '아이디는 영어 소문자, 숫자, _로 4~20자예요');
  }
  if (password.length < 8 || password.length > 72) {
    throw new HttpError(400, '비밀번호는 8~72자예요');
  }
  if (await User.exists({ username })) {
    throw new HttpError(409, '이미 있는 아이디예요');
  }
  const user = await User.create({ username, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: signToken(user), username: user.username });
});

router.post('/login', loginIpLimiter, loginAttemptLimiter, async (req, res) => {
  const { username, password } = readCredentials(req.body);
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, '아이디 또는 비밀번호가 틀렸어요');
  }
  res.json({ token: signToken(user), username: user.username });
});

// 시연용 서버(임시 DB)에서만 연습 계정으로 바로 들어가요. Atlas를 쓰는 진짜 서버에서는 없는 주소예요.
router.post('/demo', loginIpLimiter, async (req, res) => {
  const user = isMemoryDb() ? await User.findOne({ username: DEMO_USERNAME }) : null;
  if (!user) throw new HttpError(404, '없는 주소예요');
  res.json({ token: signToken(user), username: user.username });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, '로그인이 필요해요');
  res.json({ username: user.username });
});

module.exports = router;
