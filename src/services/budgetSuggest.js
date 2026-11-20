// 지난 몇 달 거래로 다음 달 고정지출을 카테고리별로 예상해요 — 담당: 1학년 A
// GET /api/settings/suggestions 가 불러요. (docs/API.md F4 설정)
//
// 카테고리마다 두 가지를 더해요. 예) 교통 = 티머니 정기권 55,000 + 그 외 교통비 평균 71,750
// 1) items: 같은 가게에서 한 달에 한 번씩, 두 달 이상, 거의 같은 금액으로 나간 돈 (정기권, 구독료, 통신비)
// 2) steady: 그 밖에 다 끝난 달마다 비슷하게 쓴 돈 (버스·택시처럼 매번 다르게 내지만 한 달 합계는 비슷한 것)
const { Transaction } = require('../models');
const { normalizeMerchant } = require('./rules');
const { isFixedCost } = require('./fixedCosts');
const { kstToday, shiftMonth } = require('../utils/dates');

// 매일 쓰는 분야는 금액이 비슷해도 고정지출로 보지 않아요. (예: 두 달 동안 한 번씩 마신 2,000원 커피)
const DAILY_CATEGORIES = new Set(['학식', '외식', '배달', '카페', '편의점', '술·모임']);
const SAME_AMOUNT_RATE = 0.1; // 가장 큰 금액과 10% 안쪽으로 차이 나면 같은 금액
const STEADY_RATE = 0.2; // 달마다 평균에서 20% 안쪽이면 꾸준한 지출
const MIN_STEADY_AVERAGE = 10000; // 한 달 평균 1만 원보다 적으면 알려 줄 만큼 크지 않아요
const NAME_MAX = 30; // 고정비 이름 최대 길이 (models/Setting.js)

const monthOf = (t) => t.date.slice(0, 7);
const sum = (list) => list.reduce((total, t) => total + t.amount, 0);

function groupBy(list, keyOf) {
  const groups = new Map();
  for (const item of list) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

// 한 가게의 결제 목록(날짜순) → 고정지출 항목 또는 null
// fixedCosts는 이름으로 등록한 고정비만 받아요. ("그 외 교통비"가 있어도 정기권은 따로 넣어야 금액이 예산에 잡혀요)
function toRecurring(payments, fixedCosts) {
  const monthCount = groupBy(payments, monthOf).size;
  if (monthCount < 2 || monthCount !== payments.length) return null; // 두 달 이상, 한 달에 한 번
  const amounts = payments.map((t) => t.amount);
  const max = Math.max(...amounts);
  if (max - Math.min(...amounts) > max * SAME_AMOUNT_RATE) return null;

  const latest = payments[payments.length - 1];
  return {
    name: latest.merchant.slice(0, NAME_MAX).trim(),
    category: latest.category,
    amount: latest.amount, // 값이 오른 구독료도 있어서 가장 최근 금액을 써요
    billingDay: Number(latest.date.slice(8)), // 가장 최근에 결제한 날
    months: monthCount,
    registered: isFixedCost(latest.merchant, fixedCosts),
  };
}

function findRecurring(expenses, fixedCosts) {
  const found = [];
  for (const payments of groupBy(expenses, (t) => normalizeMerchant(t.merchant)).values()) {
    const item = toRecurring(payments, fixedCosts);
    if (item) found.push(item);
  }
  return found.sort((a, b) => b.amount - a.amount);
}

// 분야마다 달별 합계를 내서, 모든 달이 평균 ±20% 안쪽이면 꾸준한 지출이에요.
function findSteady(expenses, fullMonths) {
  if (fullMonths.length < 2) return [];
  const steady = [];
  for (const [category, items] of groupBy(expenses, (t) => t.category)) {
    const totals = fullMonths.map((month) => sum(items.filter((t) => monthOf(t) === month)));
    const average = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    const isSteady = average >= MIN_STEADY_AVERAGE && totals.every((v) => Math.abs(v - average) <= average * STEADY_RATE);
    if (isSteady) steady.push({ category, average, min: Math.min(...totals), max: Math.max(...totals) });
  }
  return steady;
}

// 카테고리별로 모아요. 이미 "그 외 교통비"처럼 카테고리 전체 고정비가 있으면 steady.registered = true
function buildForecast(recurring, steady, fixedCosts) {
  const groups = new Map();
  const groupOf = (category) => {
    if (!groups.has(category)) groups.set(category, { category, expected: 0, items: [], steady: null });
    return groups.get(category);
  };
  for (const item of recurring) {
    const group = groupOf(item.category);
    group.items.push(item);
    group.expected += item.amount;
  }
  for (const part of steady) {
    const group = groupOf(part.category);
    group.steady = { ...part, registered: fixedCosts.some((c) => c.wholeCategory && c.category === part.category) };
    group.expected += part.average;
  }
  return [...groups.values()].sort((a, b) => b.expected - a.expected);
}

// months: 이번 달 앞으로 몇 달을 볼지. 2면 11월 기준 9월 1일 ~ 오늘.
// 고정지출 항목은 이번 달까지 보고(월초 결제가 이미 찍혀 있어서), 평균은 다 끝난 달만으로 내요.
async function suggestBudget(userId, { months = 2, fixedCosts = [], today = kstToday() } = {}) {
  const thisMonth = today.slice(0, 7);
  const from = `${shiftMonth(thisMonth, -months)}-01`;
  const expenses = await Transaction.find({
    user: userId,
    isExpense: true,
    amount: { $gt: 0 },
    date: { $gte: from, $lte: today },
  })
    .sort({ date: 1, _id: 1 })
    .lean();

  const past = expenses.filter((t) => monthOf(t) < thisMonth);
  const fullMonths = [...new Set(past.map(monthOf))].sort(); // 거래가 있는 지난달들 (평균은 이 달들로만 내요)

  const isFixedLike = (t) => !DAILY_CATEGORIES.has(t.category);
  const namedFixed = fixedCosts.filter((c) => !c.wholeCategory);
  const recurring = findRecurring(expenses.filter(isFixedLike), namedFixed);
  // 정기 결제와 이름으로 등록한 고정비를 뺀 나머지에서 꾸준한 지출을 찾아요.
  const variable = past.filter((t) => isFixedLike(t) && !isFixedCost(t.merchant, [...namedFixed, ...recurring]));
  const categories = buildForecast(recurring, findSteady(variable, fullMonths), fixedCosts);

  return {
    months,
    from,
    to: today,
    averageMonths: fullMonths,
    averageSpending: fullMonths.length ? Math.round(sum(past) / fullMonths.length) : 0,
    expectedTotal: categories.reduce((total, group) => total + group.expected, 0),
    categories,
  };
}

module.exports = { suggestBudget };
