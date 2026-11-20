// F1 계좌·카드 — 담당: 1학년 A
// 설명서: docs/guides/A-accounts-settings.md / API 형식: docs/API.md
// 로그인한 사람의 id는 req.userId에 들어 있어요. 꼭 자기 데이터만 다루세요.
const express = require('express');
const { Account } = require('../models');
const { HttpError } = require('../utils/httpError');
const { kstToday } = require('../utils/dates');

const router = express.Router();

const TYPES = ['bank', 'pay', 'card']; // 은행, 페이머니(카카오페이 등), 카드
const MAX_BALANCE = 100000000000; // 1000억 원. 이보다 크면 잘못 누른 값으로 봐요
const HISTORY_DAYS = 60; // 잔액 기록은 최근 60번만 남겨요

// 글자로 받는 값. 요청에 있어도 여기와 아래 EXTRA_FIELDS에 없는 값(user 등)은 쓰지 않아요. (Never trust the client)
const TEXT_FIELDS = {
  name: { max: 30, required: true, empty: '이름을 입력해 주세요', long: '이름은 30자까지 쓸 수 있어요' },
  institution: { max: 30, required: true, empty: '은행·카드사를 입력해 주세요', long: '은행·카드사는 30자까지 쓸 수 있어요' },
  purpose: { max: 50, required: false, empty: '', long: '용도는 50자까지 쓸 수 있어요' },
};

function notFound() {
  return new HttpError(404, '계좌·카드를 찾을 수 없어요');
}

// 값이 없으면 undefined. partial(PATCH)일 때는 필수 값이 빠져도 괜찮아요.
function readText(body, key, partial) {
  const rule = TEXT_FIELDS[key];
  const value = body[key];
  if (value === undefined) {
    if (rule.required && !partial) throw new HttpError(400, rule.empty);
    return undefined;
  }
  if (typeof value !== 'string') throw new HttpError(400, '글자로 보내 주세요');
  const text = value.trim();
  if (rule.required && !text) throw new HttpError(400, rule.empty);
  if (text.length > rule.max) throw new HttpError(400, rule.long);
  return text;
}

// 번호는 끝 4자리만 남겨요. 전체 번호를 보내도 나머지는 저장하지 않아요.
function readLast4(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return '';
  if (typeof value !== 'string') throw new HttpError(400, '번호는 글자로 보내 주세요');
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) throw new HttpError(400, '계좌·카드번호는 숫자 4자리 이상 적어 주세요');
  return digits.slice(-4);
}

// null을 보내면 잔액을 지워요.
function readBalance(value) {
  if (value === undefined || value === null) return value;
  if (!Number.isInteger(value) || Math.abs(value) > MAX_BALANCE) throw new HttpError(400, '잔액은 원 단위 숫자로 적어 주세요');
  return value;
}

function readRate(value) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'number' || !(value >= 0 && value <= 100)) throw new HttpError(400, '이자율은 0~100 사이 숫자로 적어 주세요');
  return Math.round(value * 100) / 100;
}

function readHidden(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new HttpError(400, '숨기기는 true 또는 false로 보내 주세요');
  return value;
}

function readType(value, partial) {
  if (partial && value === undefined) return undefined;
  if (!TYPES.includes(value)) throw new HttpError(400, '종류는 은행(bank), 페이머니(pay), 카드(card) 중에서 골라 주세요');
  return value;
}

// 칸마다 검사 함수. 여기 없는 값(user 등)은 요청에 있어도 쓰지 않아요.
const READERS = {
  name: (body, partial) => readText(body, 'name', partial),
  institution: (body, partial) => readText(body, 'institution', partial),
  purpose: (body, partial) => readText(body, 'purpose', partial),
  type: (body, partial) => readType(body.type, partial),
  last4: (body) => readLast4(body.last4),
  balance: (body) => readBalance(body.balance),
  interestRate: (body) => readRate(body.interestRate),
  hidden: (body) => readHidden(body.hidden),
};

function readAccount(body = {}, { partial = false } = {}) {
  const account = {};
  for (const [key, read] of Object.entries(READERS)) {
    const value = read(body, partial);
    if (value !== undefined) account[key] = value;
  }
  return account;
}

// 오늘 잔액을 기록해요. 같은 날 여러 번 고치면 마지막 값만 남아요.
function recordBalance(account, today) {
  if (account.balance === null || account.balance === undefined) {
    account.balanceHistory = [];
    return;
  }
  const history = account.balanceHistory.filter((entry) => entry.date < today);
  history.push({ date: today, amount: account.balance });
  account.balanceHistory = history.slice(-HISTORY_DAYS);
}

// 오늘 전 마지막 기록과 비교해요. 보통 "어제", 오래 안 고쳤으면 그 날짜(since)와 비교해요.
function balanceChange(account, today) {
  if (account.balance === null || account.balance === undefined) return null;
  const before = account.balanceHistory
    .filter((entry) => entry.date < today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  return before ? { amount: account.balance - before.amount, since: before.date } : null;
}

function toJson(account, today) {
  const json = account.toJSON();
  delete json.balanceHistory;
  return { ...json, balanceChange: balanceChange(account, today) };
}

// 내 것만 찾는 조건. id 모양이 틀리면 찾을 필요도 없이 404예요.
function mine(req) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw notFound();
  return { _id: req.params.id, user: req.userId };
}

router.get('/', async (req, res) => {
  const today = kstToday();
  const accounts = await Account.find({ user: req.userId }).sort({ createdAt: 1 });
  res.json(accounts.map((account) => toJson(account, today)));
});

router.post('/', async (req, res) => {
  const today = kstToday();
  const account = new Account({ ...readAccount(req.body), user: req.userId });
  recordBalance(account, today);
  await account.save();
  res.status(201).json(toJson(account, today));
});

router.patch('/:id', async (req, res) => {
  const filter = mine(req);
  const changes = readAccount(req.body, { partial: true });
  const account = await Account.findOne(filter);
  if (!account) throw notFound();
  const today = kstToday();
  account.set(changes);
  if ('balance' in changes) recordBalance(account, today);
  await account.save();
  res.json(toJson(account, today));
});

router.delete('/:id', async (req, res) => {
  const account = await Account.findOneAndDelete(mine(req));
  if (!account) throw notFound();
  res.status(204).end();
});

module.exports = router;
