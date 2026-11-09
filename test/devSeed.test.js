const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const { connectDb, disconnectDb } = require('../src/db');
const { User, Account, Setting, Transaction } = require('../src/models');
const { seedDemoData, DEMO_USERNAME, DEMO_PASSWORD } = require('../src/devSeed');

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
});

after(async () => {
  await disconnectDb();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Account.deleteMany({}), Setting.deleteMany({}), Transaction.deleteMany({})]);
});

test('연습 계정으로 로그인할 수 있고 계좌, 설정, 거래가 들어 있다', async () => {
  await seedDemoData('2026-11-15');
  const user = await User.findOne({ username: DEMO_USERNAME });
  assert.equal(await bcrypt.compare(DEMO_PASSWORD, user.passwordHash), true);
  assert.equal(await Account.countDocuments({ user: user.id }), 2);
  assert.equal((await Setting.findOne({ user: user.id })).monthlyBudget, 500000);
  assert.ok(await Transaction.countDocuments({ user: user.id, date: /^2026-11-/ }) > 0);
  assert.ok(await Transaction.countDocuments({ user: user.id, date: /^2026-10-/ }) > 0);
});

test('매달 1일에도 미래 날짜가 생기지 않고, 1월이면 지난달은 작년 12월이다', async () => {
  await seedDemoData('2027-01-01');
  const dates = (await Transaction.find({})).map((t) => t.date);
  assert.ok(dates.every((date) => date <= '2027-01-01'));
  assert.ok(dates.some((date) => date.startsWith('2026-12-')));
});

test('이체와 입금은 지출로 세지 않는다', async () => {
  await seedDemoData('2026-11-15');
  const notExpense = await Transaction.find({ isExpense: false });
  assert.deepEqual(notExpense.map((t) => t.category).sort(), ['이체', '입금'].sort());
});

test('추천을 시험할 수 있게 가장 많이 쓴 분야와 가장 많이 늘어난 분야가 다르다', async () => {
  await seedDemoData('2026-11-15');
  const totals = async (month) => {
    const sum = {};
    for (const t of await Transaction.find({ isExpense: true, date: new RegExp(`^${month}-`) })) sum[t.category] = (sum[t.category] || 0) + t.amount;
    return sum;
  };
  const [now, before_] = await Promise.all([totals('2026-11'), totals('2026-10')]);
  const top = (entries) => entries.sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(top(Object.entries(now)), '교통');
  assert.equal(top(Object.entries(now).map(([name, amount]) => [name, amount - (before_[name] || 0)])), '배달');
});

test('두 번 실행해도 거래가 늘지 않는다', async () => {
  await seedDemoData('2026-11-15');
  const count = await Transaction.countDocuments({});
  await seedDemoData('2026-11-15');
  assert.equal(await Transaction.countDocuments({}), count);
});
