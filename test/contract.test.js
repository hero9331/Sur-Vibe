// 1학년 기능 A~D가 docs/API.md대로 동작하는지 확인하는 시험지예요.
// 아직 안 만든 기능(501)은 건너뛰고, 만들면 자동으로 채점돼요.
// 이 파일은 고치지 말고, 실패하면 내 코드를 고쳐요. 테스트가 이상하면 박영웅에게 말해 주세요.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const { connectDb, disconnectDb } = require('../src/db');
const { createApp } = require('../src/app');
const { signToken } = require('../src/middleware/auth');
const { User, Transaction, Setting } = require('../src/models');
const { findRuleCategory } = require('../src/services/rules');
const { CATEGORY_NAMES } = require('../src/categories');
const policies = require('../data/policies.json');

const MISSING_ID = '507f1f77bcf86cd799439011';

let mongo;
let server;
let baseUrl;

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

function notBuilt(t, res) {
  if (res.status !== 501) return false;
  t.skip('아직 만들지 않은 기능');
  return true;
}

async function newUser(username) {
  const user = await User.create({ username, passwordHash: 'test' });
  return { token: signToken(user), id: user.id };
}

function addTransactions(userId, list) {
  return Transaction.insertMany(list.map((t) => ({ user: userId, merchant: '테스트', category: '기타', isExpense: true, ...t })));
}

function kstToday() {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
  const [year, month, day] = today.split('-').map(Number);
  return { today, day, month: today.slice(0, 7), remainingDays: new Date(year, month, 0).getDate() - day + 1 };
}

function previousMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  return mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, '0')}`;
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
  server = createApp().listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await disconnectDb();
  await mongo.stop();
});

const ACCOUNT = { name: '생활비 통장', type: 'bank', institution: '토스뱅크', purpose: '매일 쓰는 돈' };

test('[A 계좌] 추가, 목록, 수정, 삭제', async (t) => {
  const a = await newUser('account_a1');

  const created = await call('POST', '/api/accounts', { token: a.token, body: ACCOUNT });
  if (notBuilt(t, created)) return;
  assert.equal(created.status, 201);
  assert.ok(created.data.id);
  assert.equal(created.data.name, ACCOUNT.name);
  assert.equal(created.data.user, undefined, '응답에 user를 넣지 않아요');

  const list = await call('GET', '/api/accounts', { token: a.token });
  assert.equal(list.status, 200);
  assert.deepEqual(list.data.map((x) => x.id), [created.data.id]);

  const patched = await call('PATCH', `/api/accounts/${created.data.id}`, { token: a.token, body: { purpose: '저축만' } });
  assert.equal(patched.status, 200);
  assert.equal(patched.data.purpose, '저축만');
  assert.equal(patched.data.name, ACCOUNT.name, '보낸 값만 바뀌어야 해요');

  assert.equal((await call('DELETE', `/api/accounts/${created.data.id}`, { token: a.token })).status, 204);
  assert.deepEqual((await call('GET', '/api/accounts', { token: a.token })).data, []);
  assert.equal((await call('DELETE', `/api/accounts/${created.data.id}`, { token: a.token })).status, 404);
});

test('[A 계좌] 잘못된 값은 400', async (t) => {
  const a = await newUser('account_a2');
  const first = await call('POST', '/api/accounts', { token: a.token, body: { ...ACCOUNT, name: '' } });
  if (notBuilt(t, first)) return;
  assert.equal(first.status, 400);
  assert.equal((await call('POST', '/api/accounts', { token: a.token, body: { ...ACCOUNT, type: 'cash' } })).status, 400);
  assert.equal((await call('POST', '/api/accounts', { token: a.token, body: { name: '이름만' } })).status, 400);
});

test('[A 계좌] 남의 계좌는 보이지도, 고쳐지지도, 지워지지도 않는다', async (t) => {
  const owner = await newUser('account_a3');
  const other = await newUser('account_b3');

  const created = await call('POST', '/api/accounts', { token: owner.token, body: ACCOUNT });
  if (notBuilt(t, created)) return;
  const id = created.data.id;

  assert.deepEqual((await call('GET', '/api/accounts', { token: other.token })).data, []);
  assert.equal((await call('PATCH', `/api/accounts/${id}`, { token: other.token, body: { name: '해킹' } })).status, 404);
  assert.equal((await call('DELETE', `/api/accounts/${id}`, { token: other.token })).status, 404);
  assert.equal((await call('GET', '/api/accounts', { token: owner.token })).data[0].name, ACCOUNT.name);

  assert.equal((await call('PATCH', `/api/accounts/${MISSING_ID}`, { token: owner.token, body: { name: 'x' } })).status, 404);
  assert.equal((await call('DELETE', '/api/accounts/not-an-id', { token: owner.token })).status, 404);
});

test('[A 계좌] 요청으로 주인(user)을 바꿀 수 없다', async (t) => {
  const owner = await newUser('account_a4');
  const other = await newUser('account_b4');

  const created = await call('POST', '/api/accounts', { token: owner.token, body: { ...ACCOUNT, user: other.id } });
  if (notBuilt(t, created)) return;
  assert.equal((await call('GET', '/api/accounts', { token: owner.token })).data.length, 1);
  assert.equal((await call('GET', '/api/accounts', { token: other.token })).data.length, 0);

  await call('PATCH', `/api/accounts/${created.data.id}`, { token: owner.token, body: { user: other.id } });
  assert.equal((await call('GET', '/api/accounts', { token: owner.token })).data.length, 1);
  assert.equal((await call('GET', '/api/accounts', { token: other.token })).data.length, 0);
});

test('[A 설정] 처음엔 기본값, 저장하면 남고 사람마다 따로다', async (t) => {
  const a = await newUser('setting_a1');
  const b = await newUser('setting_b1');

  const initial = await call('GET', '/api/settings', { token: a.token });
  if (notBuilt(t, initial)) return;
  assert.equal(initial.status, 200);
  assert.equal(initial.data.monthlyBudget, 0);
  assert.deepEqual(initial.data.fixedCosts, []);

  const body = { monthlyBudget: 500000, fixedCosts: [{ name: '넷플릭스', amount: 13500 }] };
  const put = await call('PUT', '/api/settings', { token: a.token, body });
  assert.equal(put.status, 200);
  assert.equal(put.data.monthlyBudget, 500000);

  await call('PUT', '/api/settings', { token: a.token, body: { monthlyBudget: 300000, fixedCosts: [] } });
  const saved = await call('GET', '/api/settings', { token: a.token });
  assert.equal(saved.data.monthlyBudget, 300000);
  assert.deepEqual(saved.data.fixedCosts, [], '통째로 바뀌어야 해요');

  assert.equal((await call('GET', '/api/settings', { token: b.token })).data.monthlyBudget, 0);
});

test('[A 설정] 음수 금액은 400', async (t) => {
  const a = await newUser('setting_a2');
  const res = await call('PUT', '/api/settings', { token: a.token, body: { monthlyBudget: -1, fixedCosts: [] } });
  if (notBuilt(t, res)) return;
  assert.equal(res.status, 400);
  assert.equal((await call('PUT', '/api/settings', { token: a.token, body: { monthlyBudget: 1, fixedCosts: [{ name: 'x', amount: -5 }] } })).status, 400);
});

const ITEM = { date: '2026-11-03', merchant: '스타벅스', amount: 5600, category: '카페' };

test('[B 거래] 여러 건 저장, 더치페이 값 유지', async (t) => {
  const a = await newUser('trans_a1');
  const res = await call('POST', '/api/transactions', {
    token: a.token,
    body: { items: [ITEM, { ...ITEM, merchant: '교촌치킨', category: '배달', amount: 12000, originalAmount: 24000, splitCount: 2, isExpense: true }] },
  });
  if (notBuilt(t, res)) return;
  assert.equal(res.status, 201);
  assert.equal(res.data.saved, 2);
  assert.ok(res.data.items[0].id);
  assert.equal(res.data.items[0].user, undefined, '응답에 user를 넣지 않아요');

  const list = await call('GET', '/api/transactions?month=2026-11', { token: a.token });
  const split = list.data.find((x) => x.merchant === '교촌치킨');
  assert.equal(split.amount, 12000);
  assert.equal(split.originalAmount, 24000);
  assert.equal(split.splitCount, 2);
});

test('[B 거래] 하나라도 틀리면 아무것도 저장하지 않고 400', async (t) => {
  const a = await newUser('trans_a2');
  const bad = [
    { ...ITEM, category: '없는분류' },
    { ...ITEM, amount: -100 },
    { ...ITEM, date: '11월 3일' },
    { ...ITEM, merchant: '' },
  ];
  for (const item of bad) {
    const res = await call('POST', '/api/transactions', { token: a.token, body: { items: [ITEM, item] } });
    if (notBuilt(t, res)) return;
    assert.equal(res.status, 400, JSON.stringify(item));
  }
  assert.equal((await call('POST', '/api/transactions', { token: a.token, body: { items: 'nope' } })).status, 400);
  assert.deepEqual((await call('GET', '/api/transactions?month=2026-11', { token: a.token })).data, []);
});

test('[B 거래] 그 달 것만 최신순으로, month가 틀리면 400', async (t) => {
  const a = await newUser('trans_a3');
  const first = await call('GET', '/api/transactions?month=2026-11', { token: a.token });
  if (notBuilt(t, first)) return;

  await addTransactions(a.id, [
    { date: '2026-11-01', amount: 1000 },
    { date: '2026-11-20', amount: 2000 },
    { date: '2026-10-31', amount: 3000 },
    { date: '2026-12-01', amount: 4000 },
  ]);
  const list = await call('GET', '/api/transactions?month=2026-11', { token: a.token });
  assert.deepEqual(list.data.map((x) => x.date), ['2026-11-20', '2026-11-01']);

  assert.equal((await call('GET', '/api/transactions', { token: a.token })).status, 400);
  assert.equal((await call('GET', '/api/transactions?month=abc', { token: a.token })).status, 400);
});

test('[B 거래] 고친 분류만 규칙으로 기억한다', async (t) => {
  const a = await newUser('trans_a4');
  const res = await call('POST', '/api/transactions', {
    token: a.token,
    body: { items: [{ ...ITEM, merchant: '한양서점', category: '학업', categoryEdited: true }, { ...ITEM, merchant: '메가커피', categoryEdited: false }] },
  });
  if (notBuilt(t, res)) return;
  assert.equal(await findRuleCategory(a.id, '한양서점'), '학업');
  assert.equal(await findRuleCategory(a.id, '메가커피'), null);

  const id = res.data.items.find((x) => x.merchant === '메가커피').id;
  const patched = await call('PATCH', `/api/transactions/${id}`, { token: a.token, body: { category: '학업' } });
  assert.equal(patched.status, 200);
  assert.equal(patched.data.category, '학업');
  assert.equal(await findRuleCategory(a.id, '메가커피'), '학업');
});

test('[B 거래] 수정, 삭제, 잘못된 수정은 400', async (t) => {
  const a = await newUser('trans_a5');
  const res = await call('POST', '/api/transactions', { token: a.token, body: { items: [ITEM] } });
  if (notBuilt(t, res)) return;
  const { id } = res.data.items[0];

  const patched = await call('PATCH', `/api/transactions/${id}`, { token: a.token, body: { amount: 7000 } });
  assert.equal(patched.data.amount, 7000);
  assert.equal(patched.data.merchant, ITEM.merchant, '보낸 값만 바뀌어야 해요');

  assert.equal((await call('PATCH', `/api/transactions/${id}`, { token: a.token, body: { category: '없는분류' } })).status, 400);
  assert.equal((await call('PATCH', `/api/transactions/${id}`, { token: a.token, body: { amount: -1 } })).status, 400);

  assert.equal((await call('DELETE', `/api/transactions/${id}`, { token: a.token })).status, 204);
  assert.equal((await call('DELETE', `/api/transactions/${id}`, { token: a.token })).status, 404);
});

test('[B 거래] 남의 거래는 보이지도, 고쳐지지도, 지워지지도 않는다', async (t) => {
  const owner = await newUser('trans_a6');
  const other = await newUser('trans_b6');
  const res = await call('POST', '/api/transactions', { token: owner.token, body: { items: [ITEM] } });
  if (notBuilt(t, res)) return;
  const { id } = res.data.items[0];

  assert.deepEqual((await call('GET', '/api/transactions?month=2026-11', { token: other.token })).data, []);
  assert.equal((await call('PATCH', `/api/transactions/${id}`, { token: other.token, body: { amount: 1 } })).status, 404);
  assert.equal((await call('DELETE', `/api/transactions/${id}`, { token: other.token })).status, 404);
  assert.equal((await call('PATCH', `/api/transactions/${MISSING_ID}`, { token: owner.token, body: { amount: 1 } })).status, 404);
  assert.equal((await call('PATCH', '/api/transactions/not-an-id', { token: owner.token, body: { amount: 1 } })).status, 404);

  await call('PATCH', `/api/transactions/${id}`, { token: owner.token, body: { user: other.id } });
  assert.equal((await call('GET', '/api/transactions?month=2026-11', { token: owner.token })).data.length, 1);
  assert.equal((await call('GET', '/api/transactions?month=2026-11', { token: other.token })).data.length, 0);
});

test('[C 오늘] 하루 예산을 명세대로 계산하고, 지출만 내 것만 더한다', async (t) => {
  const a = await newUser('summary_a1');
  const b = await newUser('summary_b1');
  const first = await call('GET', '/api/summary/today', { token: a.token });
  if (notBuilt(t, first)) return;

  const { today, day, month, remainingDays } = kstToday();
  await Setting.create({ user: a.id, monthlyBudget: 500000, fixedCosts: [{ name: '넷플릭스', amount: 13500 }] });

  const spentBeforeToday = day > 1 ? 120000 : 0;
  if (day > 1) await addTransactions(a.id, [{ date: `${month}-01`, amount: 120000 }]);
  await addTransactions(a.id, [
    { date: today, amount: 8000 },
    { date: today, amount: 999999, category: '이체', isExpense: false },
    { date: `${previousMonth(month)}-15`, amount: 777777 },
  ]);
  await addTransactions(b.id, [{ date: today, amount: 555555 }]);

  const { status, data } = await call('GET', '/api/summary/today', { token: a.token });
  assert.equal(status, 200);
  assert.equal(data.date, today);
  assert.equal(data.monthlyBudget, 500000);
  assert.equal(data.fixedTotal, 13500);
  assert.equal(data.spentBeforeToday, spentBeforeToday);
  assert.equal(data.spentToday, 8000);
  assert.equal(data.remainingDays, remainingDays);
  assert.equal(data.dailyAllowance, Math.floor((500000 - 13500 - spentBeforeToday) / remainingDays));
  assert.equal(data.level, 'ok');
});

test('[C 오늘] 고정비로 등록한 결제는 쓴 돈에서 빼서 두 번 계산하지 않는다', async (t) => {
  const a = await newUser('summary_a6');
  const first = await call('GET', '/api/summary/today', { token: a.token });
  if (notBuilt(t, first)) return;

  const { today } = kstToday();
  await Setting.create({ user: a.id, monthlyBudget: 500000, fixedCosts: [{ name: '넷플릭스', amount: 13500 }] });
  await addTransactions(a.id, [
    { date: today, merchant: '넷플릭스코리아', amount: 13500, category: '구독' },
    { date: today, merchant: '메가커피', amount: 2000, category: '카페' },
  ]);

  const { data } = await call('GET', '/api/summary/today', { token: a.token });
  assert.equal(data.spentToday, 2000);
});

test('[C 오늘] 80%면 warning, 100%면 over', async (t) => {
  const a = await newUser('summary_a2');
  await Setting.create({ user: a.id, monthlyBudget: 3100000, fixedCosts: [] });
  const first = await call('GET', '/api/summary/today', { token: a.token });
  if (notBuilt(t, first)) return;
  assert.equal(first.data.level, 'ok');
  const allowance = first.data.dailyAllowance;
  const { today } = kstToday();

  const eighty = Math.ceil(allowance * 0.8);
  await addTransactions(a.id, [{ date: today, amount: eighty - 1 }]);
  assert.equal((await call('GET', '/api/summary/today', { token: a.token })).data.level, 'ok');

  await addTransactions(a.id, [{ date: today, amount: 1 }]);
  assert.equal((await call('GET', '/api/summary/today', { token: a.token })).data.level, 'warning');

  await addTransactions(a.id, [{ date: today, amount: allowance - eighty }]);
  assert.equal((await call('GET', '/api/summary/today', { token: a.token })).data.level, 'over');
});

test('[C 오늘] 설정이 없거나 예산을 넘어도 오류 없이 0 아래로 내려가지 않는다', async (t) => {
  const a = await newUser('summary_a3');
  const empty = await call('GET', '/api/summary/today', { token: a.token });
  if (notBuilt(t, empty)) return;
  assert.equal(empty.status, 200);
  assert.equal(empty.data.dailyAllowance, 0);
  assert.equal(empty.data.level, 'ok', '예산을 안 정한 사람에게 빨간 경고를 띄우지 않아요');

  await Setting.create({ user: a.id, monthlyBudget: 1000, fixedCosts: [{ name: '월세', amount: 5000 }] });
  assert.equal((await call('GET', '/api/summary/today', { token: a.token })).data.dailyAllowance, 0);
});

test('[C 월별] 큰 순서, 지난달 비교, 해가 바뀌어도 맞고 지출만 센다', async (t) => {
  const a = await newUser('summary_a4');
  const b = await newUser('summary_b4');
  const first = await call('GET', '/api/summary/monthly?month=2027-01', { token: a.token });
  if (notBuilt(t, first)) return;

  await addTransactions(a.id, [
    { date: '2027-01-05', amount: 10000, category: '카페' },
    { date: '2027-01-06', amount: 50000, category: '배달' },
    { date: '2027-01-07', amount: 900000, category: '입금', isExpense: false },
    { date: '2026-12-31', amount: 30000, category: '배달' },
    { date: '2026-12-30', amount: 2000, category: '카페' },
  ]);
  await addTransactions(b.id, [{ date: '2027-01-05', amount: 123456, category: '카페' }]);

  const { status, data } = await call('GET', '/api/summary/monthly?month=2027-01', { token: a.token });
  assert.equal(status, 200);
  assert.equal(data.month, '2027-01');
  assert.equal(data.total, 60000);
  assert.equal(data.prevMonth, '2026-12');
  assert.equal(data.prevTotal, 32000);
  assert.deepEqual(data.byCategory.filter((c) => c.amount > 0), [
    { category: '배달', amount: 50000, prevAmount: 30000, diff: 20000 },
    { category: '카페', amount: 10000, prevAmount: 2000, diff: 8000 },
  ]);
});

test('[C 월별] 거래가 없어도 오류 없이 0', async (t) => {
  const a = await newUser('summary_a5');
  const res = await call('GET', '/api/summary/monthly?month=2026-11', { token: a.token });
  if (notBuilt(t, res)) return;
  assert.equal(res.status, 200);
  assert.equal(res.data.total, 0);
  assert.deepEqual(res.data.byCategory, []);
});

test('[D 추천] 가장 많이 쓴 분야와 가장 늘어난 분야를 고른다', async (t) => {
  const a = await newUser('recommend_a1');
  const b = await newUser('recommend_b1');
  const first = await call('GET', '/api/recommendations?month=2026-10', { token: a.token });
  if (notBuilt(t, first)) return;

  await addTransactions(a.id, [
    { date: '2026-10-05', amount: 80000, category: '교통' },
    { date: '2026-10-06', amount: 50000, category: '배달' },
    { date: '2026-10-07', amount: 999999, category: '이체', isExpense: false },
    { date: '2026-09-05', amount: 75000, category: '교통' },
    { date: '2026-09-06', amount: 10000, category: '배달' },
  ]);
  await addTransactions(b.id, [{ date: '2026-10-05', amount: 9999999, category: '쇼핑' }]);

  const { status, data } = await call('GET', '/api/recommendations?month=2026-10', { token: a.token });
  assert.equal(status, 200);
  assert.equal(data.month, '2026-10');
  assert.deepEqual(data.targets.find((x) => x.reason === 'most'), { category: '교통', reason: 'most', amount: 80000, diff: 5000 });
  assert.deepEqual(data.targets.find((x) => x.reason === 'increased'), { category: '배달', reason: 'increased', amount: 50000, diff: 40000 });

  const targetCategories = data.targets.map((x) => x.category);
  assert.ok(data.items.every((item) => targetCategories.includes(item.category)), 'targets에 맞는 추천만 돌려줘요');
});

test('[D 추천] 거래가 없어도 오류가 나지 않는다', async (t) => {
  const a = await newUser('recommend_a2');
  const res = await call('GET', '/api/recommendations?month=2026-11', { token: a.token });
  if (notBuilt(t, res)) return;
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.targets, []);
  assert.deepEqual(res.data.items, []);
});

test('[D 추천] policies.json 형식이 맞고 정책에는 출처 링크가 있다', () => {
  for (const policy of policies) {
    const label = policy.title || JSON.stringify(policy);
    assert.ok(CATEGORY_NAMES.includes(policy.category), `없는 카테고리: ${label}`);
    assert.ok(['policy', 'tip'].includes(policy.type), `type이 틀려요: ${label}`);
    assert.ok(policy.title && policy.description, `제목이나 설명이 없어요: ${label}`);
    if (policy.type === 'policy') assert.match(policy.url, /^https:\/\//, `정책에는 출처 링크가 필요해요: ${label}`);
  }
});
