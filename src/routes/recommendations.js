// F6 청년 정책·대안 추천 — 담당: 1학년 D
// 설명서: docs/guides/D-recommendations.md / API 형식: docs/API.md
// 정책 목록은 data/policies.json에 넣어요.
const express = require('express');
const { Transaction } = require('../models');
const { HttpError } = require('../utils/httpError');
const policies = require('../../data/policies.json');

const router = express.Router();

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// 한국 시간 기준 이번 달 ("2026-11")
function currentMonth() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 7);
}

// "2026-01" → "2025-12"
function previousMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  return mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, '0')}`;
}

// month가 없으면 이번 달, 형식이 틀리면 400
function readMonth(query) {
  if (query.month === undefined) return currentMonth();
  if (typeof query.month !== 'string' || !MONTH_PATTERN.test(query.month)) {
    throw new HttpError(400, '월은 2026-11 같은 형식으로 보내 주세요');
  }
  return query.month;
}

// 내 거래 중 그 달의 지출만 카테고리별로 더해요. ({ 교통: 80000, 배달: 50000 })
// 이체·입금처럼 지출이 아닌 거래(isExpense: false)는 빼요.
async function spendingByCategory(userId, month) {
  const list = await Transaction.find({
    user: userId,
    isExpense: true,
    date: { $gte: `${month}-01`, $lte: `${month}-31` },
  }).select('category amount').lean();

  const totals = {};
  for (const t of list) {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  return totals;
}

// 이번 달 지출이 있는 카테고리마다 금액과 지난달 대비 차이를 만들어요.
function compareMonths(current, previous) {
  return Object.entries(current).map(([category, amount]) => ({
    category,
    amount,
    diff: amount - (previous[category] || 0),
  }));
}

// 가장 많이 쓴 카테고리(most)와 가장 많이 늘어난 카테고리(increased)를 골라요.
// 두 개가 같은 카테고리면 겹치지 않게, increased는 그다음으로 많이 늘어난 카테고리로 골라요.
function pickTargets(rows) {
  if (rows.length === 0) return [];

  const most = [...rows].sort((a, b) => b.amount - a.amount)[0];
  const targets = [{ category: most.category, reason: 'most', amount: most.amount, diff: most.diff }];

  const increased = rows
    .filter((r) => r.category !== most.category && r.diff > 0)
    .sort((a, b) => b.diff - a.diff)[0];
  if (increased) {
    targets.push({ category: increased.category, reason: 'increased', amount: increased.amount, diff: increased.diff });
  }
  return targets;
}

// targets 카테고리에 맞는 정책·대안만, targets 순서대로 돌려줘요.
function pickItems(targets) {
  return targets.flatMap((t) => policies.filter((p) => p.category === t.category));
}

router.get('/', async (req, res) => {
  const month = readMonth(req.query);
  const [current, previous] = await Promise.all([
    spendingByCategory(req.userId, month),
    spendingByCategory(req.userId, previousMonth(month)),
  ]);

  const targets = pickTargets(compareMonths(current, previous));
  res.json({ month, targets, items: pickItems(targets) });
});

module.exports = router;
