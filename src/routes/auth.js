// F0 회원가입·로그인 — 담당: 박영웅
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { signToken, requireAuth } = require('../middleware/auth');
const { HttpError } = require('../utils/httpError');

const router = express.Router();

// 비밀번호를 짧은 시간에 여러 번 시도하는 공격을 막아요. (9강 Rate Limiting)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

const USERNAME_RULE = /^[a-z0-9_]{4,20}$/;

function readCredentials(body) {
  const username = String(body?.username ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  return { username, password };
}

router.post('/signup', loginLimiter, async (req, res) => {
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

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = readCredentials(req.body);
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, '아이디 또는 비밀번호가 틀렸어요');
  }
  res.json({ token: signToken(user), username: user.username });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, '로그인이 필요해요');
  res.json({ username: user.username });
});

module.exports = router;
