// F4 오늘 예산, F5 월별 보기 — 담당: 1학년 C
// 설명서: docs/guides/C-summary.md / API 형식: docs/API.md
const express = require('express');
const { Transaction, Setting } = require('../models');
const { HttpError } = require('../utils/httpError');
const { isFixedCost } = require('../services/fixedCosts');

const router = express.Router();

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// ---------- 계산 함수 (DB 없이 테스트할 수 있어요) ----------

// 한국 시간 기준 오늘 날짜 "2026-11-19"
function kstToday(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now);
}

// "2026-11" → 30
function daysInMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

// "2027-01" → "2026-12"
function previousMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  return mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, '0')}`;
}

const sumAmount = (list) => list.reduce((total, item) => total + item.amount, 0);

// 오늘 쓴 돈이 하루 예산의 몇 %인지에 따라 ok / warning / over
function budgetLevel(spentToday, dailyAllowance) {
  if (dailyAllowance <= 0) return spentToday > 0 ? 'over' : 'ok';
  const ratio = spentToday / dailyAllowance;
  if (ratio >= 1) return 'over';
  if (ratio >= 0.8) return 'warning';
  return 'ok';
}

// today: "2026-11-19", setting: { monthlyBudget, fixedCosts } 또는 null,
// transactions: 이번 달 거래 목록 (지출이 아닌 것, 다른 달 것이 섞여 있어도 걸러요)
function calcToday({ today, setting, transactions }) {
  const month = today.slice(0, 7);
  const monthlyBudget = setting?.monthlyBudget || 0;
  const fixedCosts = setting?.fixedCosts || [];
  const fixedTotal = sumAmount(fixedCosts);

  // 고정비는 예산에서 이미 뺐으니 쓴 돈에서는 빼요 (두 번 계산 방지)
  const spent = transactions.filter((t) =>
    t.isExpense && t.date.startsWith(month) && t.date <= today && !isFixedCost(t.merchant, fixedCosts, t.category));
  const spentBeforeToday = sumAmount(spent.filter((t) => t.date < today));
  const spentToday = sumAmount(spent.filter((t) => t.date === today));

  const remainingDays = daysInMonth(month) - Number(today.slice(8, 10)) + 1;
  const dailyAllowance = Math.max(0, Math.floor((monthlyBudget - fixedTotal - spentBeforeToday) / remainingDays));

  return {
    date: today,
    monthlyBudget,
    fixedTotal,
    spentBeforeToday,
    spentToday,
    remainingDays,
    dailyAllowance,
    level: budgetLevel(spentToday, dailyAllowance),
  };
}

// 지출만 카테고리별로 더해요 → { 카페: 12000, ... }
function totalsByCategory(transactions) {
  const totals = {};
  for (const t of transactions) {
    if (!t.isExpense) continue;
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  return totals;
}

// current: 이번 달 거래, previous: 지난달 거래
function calcMonthly({ month, current, previous }) {
  const now = totalsByCategory(current);
  const prev = totalsByCategory(previous);
  const byCategory = Object.entries(now)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => {
      const prevAmount = prev[category] || 0;
      return { category, amount, prevAmount, diff: amount - prevAmount };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    month,
    total: Object.values(now).reduce((s, v) => s + v, 0),
    prevMonth: previousMonth(month),
    prevTotal: Object.values(prev).reduce((s, v) => s + v, 0),
    byCategory,
  };
}

// ---------- DB 조회 ----------

// 그 달의 내 지출 거래만 가져와요
function findMonthExpenses(userId, month) {
  return Transaction.find({
    user: userId,
    isExpense: true,
    date: { $gte: `${month}-01`, $lte: `${month}-31` },
  }).lean();
}

// ---------- 라우터 ----------

router.get('/today', async (req, res) => {
  const today = kstToday();
  const [setting, transactions] = await Promise.all([
    Setting.findOne({ user: req.userId }).lean(),
    findMonthExpenses(req.userId, today.slice(0, 7)),
  ]);
  res.json(calcToday({ today, setting, transactions }));
});

router.get('/monthly', async (req, res) => {
  const { month } = req.query;
  if (typeof month !== 'string' || !MONTH_PATTERN.test(month)) {
    throw new HttpError(400, '달은 2026-11처럼 보내 주세요');
  }
  const [current, previous] = await Promise.all([
    findMonthExpenses(req.userId, month),
    findMonthExpenses(req.userId, previousMonth(month)),
  ]);
  res.json(calcMonthly({ month, current, previous }));
});

module.exports = router;
module.exports.calc = { kstToday, daysInMonth, previousMonth, budgetLevel, calcToday, calcMonthly };
