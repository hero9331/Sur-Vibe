// 설정 화면 추가 시험 — 담당: 1학년 A
// contract.test.js(시험지)에 없는 것: 고정지출 예상 API, 계좌 잔액·번호·숨기기, 구독 알림, 입력값 검사, 회원 탈퇴
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const { connectDb, disconnectDb } = require('../src/db');
const { createApp } = require('../src/app');
const { signToken } = require('../src/middleware/auth');
const { User, Transaction, Account, Setting, Rule } = require('../src/models');
const { suggestBudget } = require('../src/services/budgetSuggest');
const { isFixedCost } = require('../src/services/fixedCosts');
const { userOwnedModels, leaveBlockReason } = require('../src/services/membership');
const { shiftMonth, kstToday } = require('../src/utils/dates');
const { seedDemoData, DEMO_USERNAME } = require('../src/devSeed');

let mongo;
let server;
let baseUrl;

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

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function newUser(username) {
  const user = await User.create({ username, passwordHash: 'test' });
  return { token: signToken(user), id: user.id };
}

// [날짜, 가게, 금액, 카테고리, 지출 여부]
function addRows(userId, rows) {
  return Transaction.insertMany(
    rows.map(([date, merchant, amount, category, isExpense = true]) => ({ user: userId, date, merchant, amount, category, isExpense })),
  );
}

const TODAY = '2026-11-18';
const NETFLIX = { name: '넷플릭스', amount: 13500, category: '구독', billingDay: 3, wholeCategory: false };

// 9~10월은 다 끝난 달, 11월은 이번 달. 8월은 2달 범위 밖이에요.
const ROWS = [
  ['2026-08-02', '헬스장', 30000, '문화·여가'],
  ['2026-09-02', '헬스장', 30000, '문화·여가'],
  ['2026-09-02', '티머니 정기권', 55000, '교통'],
  ['2026-10-02', '티머니 정기권', 55000, '교통'],
  ['2026-11-01', '티머니 정기권', 55000, '교통'],
  ['2026-09-03', '넷플릭스', 13500, '구독'],
  ['2026-10-03', '넷플릭스', 13500, '구독'],
  ['2026-11-01', '넷플릭스', 13500, '구독'],
  ['2026-09-20', 'ChatGPT Plus', 29000, '구독'],
  ['2026-10-20', 'ChatGPT Plus', 29000, '구독'],
  ['2026-09-08', '카카오T 택시', 21000, '교통'],
  ['2026-09-21', '카카오T 택시', 18000, '교통'],
  ['2026-09-15', '코레일 KTX', 25000, '교통'],
  ['2026-09-27', '티머니 충전', 14000, '교통'],
  ['2026-10-10', '카카오T 택시', 23500, '교통'],
  ['2026-10-17', '코레일 KTX', 24500, '교통'],
  ['2026-10-24', '티머니 충전', 24000, '교통'],
  ['2026-11-12', '코레일 KTX', 28000, '교통'], // KTX는 25,000 / 24,500 / 28,000으로 들쭉날쭉해서 정기 결제가 아니에요
  ['2026-09-05', '메가커피', 2000, '카페'],
  ['2026-10-05', '메가커피', 2000, '카페'],
  ['2026-09-15', '무신사', 10000, '쇼핑'],
  ['2026-10-15', '무신사', 90000, '쇼핑'],
  ['2026-10-20', '내 저축 통장', 100000, '이체', false],
  ['2026-11-25', '아직 안 온 날', 99999, '기타'],
];

test('[A 날짜] 달 계산은 해가 바뀌어도 맞다', () => {
  assert.equal(shiftMonth('2026-11', -3), '2026-08');
  assert.equal(shiftMonth('2027-01', -1), '2026-12');
  assert.equal(shiftMonth('2026-02', -14), '2024-12');
});

test('[A 예상] 지난 2달 고정지출을 카테고리별로 모은다 (정기 결제 + 매달 비슷한 지출)', async () => {
  const a = await newUser('suggest_a1');
  const b = await newUser('suggest_b1');
  await addRows(a.id, ROWS);
  await addRows(b.id, [['2026-09-01', '월세', 400000, '생활'], ['2026-10-01', '월세', 400000, '생활']]);

  const result = await suggestBudget(a.id, { fixedCosts: [NETFLIX], today: TODAY });

  assert.equal(result.months, 2);
  assert.equal(result.from, '2026-09-01');
  assert.deepEqual(result.averageMonths, ['2026-09', '2026-10']);
  assert.equal(result.averageSpending, (217500 + 261500) / 2);
  // 커피(매일 쓰는 분야), 택시(한 달에 여러 번), 무신사(금액이 다름), 헬스장(범위 안에서 한 번), 이체, 남의 월세는 빠져요.
  assert.deepEqual(result.categories, [
    {
      category: '교통',
      expected: 130000,
      items: [{ name: '티머니 정기권', category: '교통', amount: 55000, billingDay: 1, months: 3, registered: false }],
      steady: { category: '교통', average: 75000, min: 72000, max: 78000, registered: false },
    },
    {
      category: '구독',
      expected: 42500,
      items: [
        { name: 'ChatGPT Plus', category: '구독', amount: 29000, billingDay: 20, months: 2, registered: false },
        { name: '넷플릭스', category: '구독', amount: 13500, billingDay: 1, months: 3, registered: true },
      ],
      steady: null,
    },
  ]);
  assert.equal(result.expectedTotal, 172500);
});

test('[A 예상] "그 외 교통비"를 넣어도 정기권은 따로 넣어야 등록된 것으로 본다', async () => {
  const a = await newUser('suggest_a2');
  await addRows(a.id, ROWS);
  const others = { name: '그 외 교통비', amount: 75000, category: '교통', billingDay: null, wholeCategory: true };
  const [transport] = (await suggestBudget(a.id, { fixedCosts: [others], today: TODAY })).categories;
  assert.equal(transport.steady.registered, true);
  assert.equal(transport.items[0].registered, false);
});

test('[A 예상] 금액이 10% 넘게 바뀌면 정기 결제로 보지 않는다', async () => {
  const a = await newUser('suggest_a3');
  await addRows(a.id, [
    ['2026-09-03', '헬스장', 50000, '문화·여가'],
    ['2026-10-03', '헬스장', 54000, '문화·여가'],
    ['2026-09-04', '스터디카페', 40000, '학업'],
    ['2026-10-04', '스터디카페', 60000, '학업'],
  ]);
  const { categories } = await suggestBudget(a.id, { today: TODAY });
  const items = categories.flatMap((group) => group.items);
  assert.deepEqual(items.map((x) => x.name), ['헬스장']);
  assert.equal(items[0].amount, 54000, '가장 최근 금액을 써요');
});

test('[A 예상] API: 로그인 필요, 기간 검사, 거래가 없어도 오류 없음, 저장한 고정비는 registered', async () => {
  assert.equal((await call('GET', '/api/settings/suggestions')).status, 401);

  const a = await newUser('suggest_a4');
  assert.equal((await call('GET', '/api/settings/suggestions?months=0', { token: a.token })).status, 400);
  assert.equal((await call('GET', '/api/settings/suggestions?months=abc', { token: a.token })).status, 400);

  const empty = await call('GET', '/api/settings/suggestions', { token: a.token });
  assert.equal(empty.status, 200);
  assert.equal(empty.data.months, 2);
  assert.deepEqual(empty.data.categories, []);
  assert.deepEqual(empty.data.averageMonths, []);
  assert.equal(empty.data.expectedTotal, 0);

  const thisMonth = kstToday().slice(0, 7);
  await addRows(a.id, [
    [`${shiftMonth(thisMonth, -2)}-05`, '넷플릭스', 13500, '구독'],
    [`${shiftMonth(thisMonth, -1)}-05`, '넷플릭스', 13500, '구독'],
  ]);
  const beforeSave = await call('GET', '/api/settings/suggestions', { token: a.token });
  assert.equal(beforeSave.data.categories[0].items[0].registered, false);

  await call('PUT', '/api/settings', { token: a.token, body: { monthlyBudget: 300000, fixedCosts: [NETFLIX] } });
  const afterSave = await call('GET', '/api/settings/suggestions', { token: a.token });
  assert.equal(afterSave.data.categories[0].items[0].registered, true);
  assert.equal(afterSave.data.averageSpending, 13500);
});

test('[A 예상] 연습 계정은 교통 약 13만 원(정기권 + 그 외)과 등록된 구독료·통신비를 보여 준다', async () => {
  await seedDemoData('2026-11-15');
  const demo = await User.findOne({ username: DEMO_USERNAME });
  const setting = await Setting.findOne({ user: demo.id });
  const { categories } = await suggestBudget(demo.id, { fixedCosts: setting.fixedCosts, today: '2026-11-15' });

  const transport = categories.find((group) => group.category === '교통');
  assert.equal(transport.expected, 130000);
  assert.equal(transport.items[0].registered, false, '정기권은 추가 버튼을 눌러 볼 수 있게 비워 둬요');
  const subs = categories.find((group) => group.category === '구독');
  assert.deepEqual(subs.items.map((x) => [x.name, x.registered]).sort(), [['ChatGPT Plus', true], ['넷플릭스', true], ['유튜브 프리미엄', true]]);
  assert.ok(categories.find((group) => group.category === '생활').items.every((x) => x.registered));
});

test('[A 고정비] wholeCategory 고정비는 그 카테고리 결제를 모두 고정비로 본다', () => {
  const costs = [{ name: '넷플릭스' }, { name: '그 외 교통비', category: '교통', wholeCategory: true }];
  assert.equal(isFixedCost('넷플릭스코리아', costs), true);
  assert.equal(isFixedCost('카카오T 택시', costs, '교통'), true);
  assert.equal(isFixedCost('카카오T 택시', costs), false, '카테고리를 안 넘기면 이름으로만 비교해요');
  assert.equal(isFixedCost('메가커피', costs, '카페'), false);
});

test('[A 설정] 카테고리·결제일·구독 알림을 저장하고, 알림을 안 보내면 그대로 둔다', async () => {
  const a = await newUser('setting_v0');
  const first = await call('GET', '/api/settings', { token: a.token });
  assert.deepEqual(first.data.subscriptionAlert, { enabled: true, daysBefore: 3 });

  const body = {
    monthlyBudget: 300000,
    fixedCosts: [NETFLIX, { name: '그 외 교통비', amount: 75000, category: '교통', wholeCategory: true }],
    subscriptionAlert: { enabled: false, daysBefore: 7 },
  };
  const put = await call('PUT', '/api/settings', { token: a.token, body });
  assert.deepEqual(put.data.fixedCosts, [NETFLIX, { name: '그 외 교통비', amount: 75000, category: '교통', billingDay: null, wholeCategory: true }]);
  assert.deepEqual(put.data.subscriptionAlert, { enabled: false, daysBefore: 7 });

  await call('PUT', '/api/settings', { token: a.token, body: { monthlyBudget: 1000, fixedCosts: [] } });
  assert.deepEqual((await call('GET', '/api/settings', { token: a.token })).data.subscriptionAlert, { enabled: false, daysBefore: 7 });
});

test('[A 설정] 다른 탭의 알림 시점과 스위치 변경을 각각 유지한다', async () => {
  const { token } = await newUser('setting_alert');
  const patch = (body) => call('PATCH', '/api/settings/subscription-alert', { token, body });

  const firstTab = await patch({ daysBefore: 7 });
  assert.equal(firstTab.status, 200);
  assert.deepEqual(firstTab.data, { enabled: true, daysBefore: 7 });
  assert.deepEqual((await patch({ enabled: false })).data, { enabled: false, daysBefore: 7 });
  assert.deepEqual((await patch({ daysBefore: 1 })).data, { enabled: false, daysBefore: 1 });
  assert.deepEqual((await patch({ enabled: true })).data, { enabled: true, daysBefore: 1 });

  for (const body of [{}, { enabled: 'true' }, { daysBefore: 15 }, { enabled: false, daysBefore: 3 }]) {
    assert.equal((await patch(body)).status, 400);
  }
});

test('[A 설정] 고정비 목록이 없거나, 이름·금액·카테고리·결제일·알림이 틀리면 400', async () => {
  const a = await newUser('setting_v1');
  const fixed = (extra) => ({ monthlyBudget: 300000, fixedCosts: [{ name: '통신비', amount: 33000, ...extra }] });
  const bad = [
    { monthlyBudget: 300000 },
    { monthlyBudget: '300000', fixedCosts: [] },
    { monthlyBudget: 1.5, fixedCosts: [] },
    { monthlyBudget: 300000, fixedCosts: [null] },
    fixed({ name: '  ' }),
    fixed({ name: '가'.repeat(31) }),
    fixed({ amount: '33000' }),
    fixed({ category: '없는분류' }),
    fixed({ category: '이체' }),
    fixed({ billingDay: 0 }),
    fixed({ billingDay: 32 }),
    fixed({ billingDay: '5' }),
    { monthlyBudget: 1, fixedCosts: [], subscriptionAlert: { enabled: 'yes', daysBefore: 3 } },
    { monthlyBudget: 1, fixedCosts: [], subscriptionAlert: { enabled: true, daysBefore: 30 } },
  ];
  for (const body of bad) {
    assert.equal((await call('PUT', '/api/settings', { token: a.token, body })).status, 400, JSON.stringify(body));
  }
  assert.equal((await call('GET', '/api/settings', { token: a.token })).data.monthlyBudget, 0, '틀린 요청은 저장되지 않아요');
});

test('[A 설정] 고정비 이름의 앞뒤 공백을 지우고, 정해진 값만 저장한다', async () => {
  const a = await newUser('setting_v2');
  const res = await call('PUT', '/api/settings', {
    token: a.token,
    body: { monthlyBudget: 300000, fixedCosts: [{ name: ' 통신비 ', amount: 33000, hacked: true }], user: 'someone' },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, {
    monthlyBudget: 300000,
    fixedCosts: [{ name: '통신비', amount: 33000, category: null, billingDay: null, wholeCategory: false }],
    subscriptionAlert: { enabled: true, daysBefore: 3 },
  });
});

test('[A 계좌] 이름 30자 초과, 용도 50자 초과, 글자가 아닌 값, 틀린 번호·잔액·이자율·숨기기는 400', async () => {
  const a = await newUser('account_v1');
  const base = { name: '생활비 통장', type: 'bank', institution: '토스뱅크' };
  const bad = [
    { ...base, name: '가'.repeat(31) },
    { ...base, purpose: '가'.repeat(51) },
    { ...base, institution: 123 },
    { ...base, last4: '12' },
    { ...base, last4: 1234 },
    { ...base, balance: 1000.5 },
    { ...base, balance: '1000' },
    { ...base, interestRate: 101 },
    { ...base, interestRate: '2' },
    { ...base, hidden: 'yes' },
  ];
  for (const body of bad) {
    assert.equal((await call('POST', '/api/accounts', { token: a.token, body })).status, 400, JSON.stringify(body));
  }
  const created = await call('POST', '/api/accounts', { token: a.token, body: { ...base, name: '  생활비 통장  ' } });
  assert.equal(created.data.name, '생활비 통장');
  assert.equal((await call('PATCH', `/api/accounts/${created.data.id}`, { token: a.token, body: { name: '' } })).status, 400);
  assert.equal((await call('PATCH', `/api/accounts/${created.data.id}`, { token: a.token, body: { type: 'cash' } })).status, 400);
});

test('[A 계좌] 페이머니(pay)도 잔액과 함께 넣을 수 있다', async () => {
  const a = await newUser('account_pay');
  const created = await call('POST', '/api/accounts', { token: a.token, body: { name: '카카오페이 머니', type: 'pay', institution: '카카오페이', balance: 23500 } });
  assert.equal(created.status, 201);
  assert.equal(created.data.type, 'pay');
  assert.equal(created.data.balance, 23500);
  const moved = await call('PATCH', `/api/accounts/${created.data.id}`, { token: a.token, body: { type: 'card' } });
  assert.equal(moved.data.type, 'card');
});

test('[A 계좌] 번호는 끝 4자리만 저장하고, 숨기기·이자율을 바꿀 수 있다', async () => {
  const a = await newUser('account_v2');
  const created = await call('POST', '/api/accounts', {
    token: a.token,
    body: { name: '생활비 통장', type: 'bank', institution: '토스뱅크', last4: '1000-12-3456789', interestRate: 2.345 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.last4, '6789');
  assert.equal(created.data.interestRate, 2.35);
  assert.equal(created.data.hidden, false);
  assert.equal(created.data.balance, null);
  assert.equal(created.data.balanceHistory, undefined, '잔액 기록은 응답에 넣지 않아요');

  const patched = await call('PATCH', `/api/accounts/${created.data.id}`, { token: a.token, body: { hidden: true, interestRate: null, last4: '' } });
  assert.equal(patched.data.hidden, true);
  assert.equal(patched.data.interestRate, null);
  assert.equal(patched.data.last4, '');
});

test('[A 계좌] 잔액을 고치면 오늘 기록이 남고, 오늘 전 기록과 비교해 늘거나 준 금액을 알려 준다', async () => {
  const a = await newUser('account_v3');
  const today = kstToday();
  const created = await call('POST', '/api/accounts', { token: a.token, body: { name: '저축 통장', type: 'bank', institution: '카카오뱅크', balance: 100000 } });
  assert.equal(created.data.balance, 100000);
  assert.equal(created.data.balanceChange, null, '비교할 지난 기록이 없어요');

  // 어제 90,000원이었던 것처럼 기록을 바꿔요.
  const [y, m, d] = today.split('-').map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  await Account.updateOne({ _id: created.data.id }, { balanceHistory: [{ date: yesterday, amount: 90000 }, { date: today, amount: 100000 }] });

  const listed = await call('GET', '/api/accounts', { token: a.token });
  assert.deepEqual(listed.data[0].balanceChange, { amount: 10000, since: yesterday });

  const patched = await call('PATCH', `/api/accounts/${created.data.id}`, { token: a.token, body: { balance: 85000 } });
  assert.deepEqual(patched.data.balanceChange, { amount: -5000, since: yesterday });
  const saved = await Account.findById(created.data.id);
  assert.deepEqual(saved.balanceHistory.map((h) => [h.date, h.amount]), [[yesterday, 90000], [today, 85000]], '오늘 기록은 하나만 남아요');
});

// ── 회원 탈퇴 ──────────────────────────────────────

async function newMember(username, password = 'password123') {
  const user = await User.create({ username, passwordHash: await bcrypt.hash(password, 4) });
  return { token: signToken(user), id: user.id, username, password };
}

// 거래 2건, 자산 1개, 분류 규칙 1개, 고정비 1개
async function fillRecords(member) {
  await addRows(member.id, [['2026-11-01', '넷플릭스', 13500, '구독'], ['2026-11-02', '메가커피', 2000, '카페']]);
  await call('POST', '/api/accounts', { token: member.token, body: { name: '생활비 통장', type: 'bank', institution: '토스뱅크' } });
  await Rule.create({ user: member.id, merchant: '메가커피', category: '카페' });
  await call('PUT', '/api/settings', { token: member.token, body: { monthlyBudget: 500000, fixedCosts: [NETFLIX] } });
}

// user 칸이 있는 모든 모델에서 그 사람 기록 수
async function recordsOf(userId) {
  const entries = await Promise.all(userOwnedModels().map(async (Model) => [Model.modelName, await Model.countDocuments({ user: userId })]));
  return Object.fromEntries(entries);
}

test('[A 탈퇴] user 칸이 있는 모델은 모두 지우는 대상이다', () => {
  const names = userOwnedModels().map((Model) => Model.modelName);
  for (const name of ['Transaction', 'Account', 'Rule', 'Setting']) assert.ok(names.includes(name), name);
  assert.ok(!names.includes('User'), '계정은 기록을 다 지운 뒤 따로 지워요');
});

test('[A 탈퇴] 탈퇴 화면에 지워질 기록 수를 알려 준다', async () => {
  assert.equal((await call('GET', '/api/settings/membership')).status, 401);
  const a = await newMember('leave_count');
  await fillRecords(a);
  const res = await call('GET', '/api/settings/membership', { token: a.token });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, {
    username: 'leave_count',
    records: { transactions: 2, accounts: 1, fixedCosts: 1, rules: 1 },
    blockedReason: null,
  });
});

test('[A 탈퇴] 비밀번호가 없거나 틀리면 400이고 아무것도 지우지 않는다', async () => {
  const a = await newMember('leave_wrong');
  await fillRecords(a);
  const before = await recordsOf(a.id);
  assert.equal((await call('DELETE', '/api/settings/membership', { body: { password: a.password } })).status, 401);
  assert.equal((await call('DELETE', '/api/settings/membership', { token: a.token, body: {} })).status, 400);
  const wrong = await call('DELETE', '/api/settings/membership', { token: a.token, body: { password: 'not-my-password' } });
  assert.equal(wrong.status, 400, '401이면 화면이 로그아웃돼서 400으로 알려요');
  assert.equal(wrong.data.error, '비밀번호가 맞지 않아요');
  assert.deepEqual(await recordsOf(a.id), before);
  assert.ok(await User.exists({ _id: a.id }));
});

test('[A 탈퇴] 탈퇴하면 내 기록과 계정이 모두 지워지고, 남의 기록은 그대로다', async () => {
  const a = await newMember('leave_ok');
  const b = await newMember('leave_other');
  await fillRecords(a);
  await fillRecords(b);
  const othersBefore = await recordsOf(b.id);

  const res = await call('DELETE', '/api/settings/membership', { token: a.token, body: { password: a.password } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.deleted, { accounts: 1, transactions: 2, rules: 1, settings: 1 });
  assert.deepEqual(await recordsOf(a.id), { Account: 0, Transaction: 0, Rule: 0, Setting: 0 });
  assert.equal(await User.exists({ _id: a.id }), null);
  assert.deepEqual(await recordsOf(b.id), othersBefore, '다른 사람 기록은 그대로예요');

  // 남은 토큰은 401(화면이 로그인으로 돌아가요), 예전 비밀번호로 로그인 안 됨, 같은 아이디로 다시 가입은 돼요.
  assert.equal((await call('GET', '/api/auth/me', { token: a.token })).status, 401);
  assert.equal((await call('GET', '/api/settings/membership', { token: a.token })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { body: { username: a.username, password: a.password } })).status, 401);
  assert.equal((await call('POST', '/api/auth/signup', { body: { username: a.username, password: a.password } })).status, 201);
});

test('[A 탈퇴] 시연 서버의 연습 계정만 탈퇴를 막는다', () => {
  assert.match(leaveBlockReason(DEMO_USERNAME, true), /연습 계정/);
  assert.equal(leaveBlockReason(DEMO_USERNAME, false), null, '진짜 서버에서 demo로 가입한 사람은 탈퇴할 수 있어요');
  assert.equal(leaveBlockReason('survibe01', true), null);
});

test('[A 탈퇴] 비밀번호를 10번 틀리면 15분 동안 막는다', async () => {
  const a = await newMember('leave_limit');
  for (let i = 0; i < 10; i += 1) {
    const res = await call('DELETE', '/api/settings/membership', { token: a.token, body: { password: `wrong-${i}` } });
    assert.equal(res.status, 400);
  }
  const blocked = await call('DELETE', '/api/settings/membership', { token: a.token, body: { password: a.password } });
  assert.equal(blocked.status, 429);
  assert.ok(await User.exists({ _id: a.id }), '막힌 동안에는 지우지 않아요');
});
