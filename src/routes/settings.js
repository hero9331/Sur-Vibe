// F4 설정(월 예산, 고정비, 구독 알림, 회원 탈퇴) — 담당: 1학년 A
// 설명서: docs/guides/A-accounts-settings.md / API 형식: docs/API.md
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { Setting, User } = require('../models');
const { HttpError } = require('../utils/httpError');
const { categories } = require('../categories');
const { suggestBudget } = require('../services/budgetSuggest');
const { countUserData, deleteUserData, leaveBlockReason } = require('../services/membership');

const router = express.Router();

// 탈퇴 비밀번호를 여러 번 틀리면 15분 동안 막아요. 틀린 시도만 세요. (9강 Rate Limiting)
const leaveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.userId,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: '비밀번호를 너무 많이 틀렸어요. 15분 뒤에 다시 해 주세요' },
});

const MAX_AMOUNT = 1000000000; // 10억 원. 이보다 크면 잘못 누른 값으로 봐요
const MAX_FIXED_COSTS = 30;
const NAME_MAX = 30;
const EXPENSE_CATEGORIES = categories.filter((c) => c.isExpense).map((c) => c.name);
const DEFAULT_ALERT = { enabled: true, daysBefore: 3 };

function readAmount(value, message) {
  if (!Number.isInteger(value) || value < 0 || value > MAX_AMOUNT) throw new HttpError(400, message);
  return value;
}

function readCategory(value) {
  if (value === undefined || value === null) return null;
  if (!EXPENSE_CATEGORIES.includes(value)) throw new HttpError(400, '고정비 카테고리가 없는 카테고리예요');
  return value;
}

function readBillingDay(value) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 31) throw new HttpError(400, '결제일은 1~31일 중에서 골라 주세요');
  return value;
}

function readFixedCost(cost) {
  const name = typeof cost?.name === 'string' ? cost.name.trim() : '';
  if (!name) throw new HttpError(400, '고정비 이름을 입력해 주세요');
  if (name.length > NAME_MAX) throw new HttpError(400, `고정비 이름은 ${NAME_MAX}자까지 쓸 수 있어요`);
  return {
    name,
    amount: readAmount(cost.amount, '고정비 금액은 0원 이상인 숫자로 적어 주세요'),
    category: readCategory(cost.category),
    billingDay: readBillingDay(cost.billingDay),
    wholeCategory: cost.wholeCategory === true,
  };
}

function readAlert(alert) {
  if (alert === undefined) return undefined; // 안 보내면 그대로 둬요
  const ok = typeof alert?.enabled === 'boolean' && Number.isInteger(alert.daysBefore) && alert.daysBefore >= 1 && alert.daysBefore <= 14;
  if (!ok) throw new HttpError(400, '구독 알림은 켜기 여부와 1~14일 전 중 하나로 보내 주세요');
  return { enabled: alert.enabled, daysBefore: alert.daysBefore };
}

// PUT은 예산과 고정비를 통째로 바꿔요. 그래서 둘 다 있어야 해요. (실수로 고정비가 지워지지 않게)
function readSettings(body = {}) {
  if (!Array.isArray(body.fixedCosts)) throw new HttpError(400, '고정비 목록(fixedCosts)을 같이 보내 주세요');
  if (body.fixedCosts.length > MAX_FIXED_COSTS) throw new HttpError(400, `고정비는 ${MAX_FIXED_COSTS}개까지 넣을 수 있어요`);
  const update = {
    monthlyBudget: readAmount(body.monthlyBudget, '월 예산은 0원 이상인 숫자로 적어 주세요'),
    fixedCosts: body.fixedCosts.map(readFixedCost),
  };
  const alert = readAlert(body.subscriptionAlert);
  if (alert) update.subscriptionAlert = alert;
  return update;
}

function toFixedCost(cost) {
  return {
    name: cost.name,
    amount: cost.amount,
    category: cost.category ?? null,
    billingDay: cost.billingDay ?? null,
    wholeCategory: Boolean(cost.wholeCategory),
  };
}

function toAlert(alert) {
  return { enabled: alert?.enabled ?? DEFAULT_ALERT.enabled, daysBefore: alert?.daysBefore ?? DEFAULT_ALERT.daysBefore };
}

// docs/API.md 형식 그대로
function toResponse(setting) {
  return {
    monthlyBudget: setting?.monthlyBudget ?? 0,
    fixedCosts: (setting?.fixedCosts ?? []).map(toFixedCost),
    subscriptionAlert: toAlert(setting?.subscriptionAlert),
  };
}

function readMonths(value) {
  if (value === undefined) return 2;
  const months = Number(value);
  if (!Number.isInteger(months) || months < 1 || months > 12) throw new HttpError(400, '기간은 1~12달 사이로 골라 주세요');
  return months;
}

router.get('/', async (req, res) => {
  res.json(toResponse(await Setting.findOne({ user: req.userId })));
});

router.put('/', async (req, res) => {
  const setting = await Setting.findOneAndUpdate({ user: req.userId }, readSettings(req.body), {
    upsert: true,
    returnDocument: 'after',
    runValidators: true,
    setDefaultsOnInsert: true,
  });
  res.json(toResponse(setting));
});

// 지난 몇 달 거래로 예상한 카테고리별 고정지출
router.get('/suggestions', async (req, res) => {
  const months = readMonths(req.query.months);
  const setting = await Setting.findOne({ user: req.userId });
  res.json(await suggestBudget(req.userId, { months, fixedCosts: toResponse(setting).fixedCosts }));
});

// ── 회원 탈퇴 ──
// 토큰은 살아 있는데 계정이 없으면(이미 탈퇴) 401이라 화면이 로그인으로 돌아가요.
async function currentUser(req) {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, '로그인이 필요해요');
  return user;
}

// 탈퇴하면 지워지는 기록 수. 탈퇴 화면이 먼저 불러요.
router.get('/membership', async (req, res) => {
  const user = await currentUser(req);
  res.json({ username: user.username, records: await countUserData(user._id), blockedReason: leaveBlockReason(user.username) });
});

// 비밀번호를 한 번 더 확인하고, 내 기록과 계정을 모두 지워요.
// 비밀번호가 틀리면 401이 아니라 400이에요. (401이면 화면의 api()가 로그아웃시켜요)
router.delete('/membership', leaveLimiter, async (req, res) => {
  const user = await currentUser(req);
  const blocked = leaveBlockReason(user.username);
  if (blocked) throw new HttpError(403, blocked);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) throw new HttpError(400, '비밀번호를 입력해 주세요');
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(400, '비밀번호가 맞지 않아요');
  res.json({ deleted: await deleteUserData(user._id) });
});

module.exports = router;
