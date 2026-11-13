const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const { connectDb, disconnectDb } = require('../src/db');
const { createApp } = require('../src/app');

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

test('진짜 DB 서버에서는 데모 로그인이 없다', async () => {
  const health = await (await call('GET', '/api/health')).json();
  assert.equal(health.demo, false);
  const res = await call('POST', '/api/auth/demo');
  assert.equal(res.status, 404);
});

function call(method, path, { body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(baseUrl + path, { method, headers, body: body && JSON.stringify(body) });
}

test('가입하면 201과 토큰을 받는다', async () => {
  const res = await call('POST', '/api/auth/signup', { body: { username: 'tester1', password: 'password123' } });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.username, 'tester1');
});

test('같은 아이디로 다시 가입하면 409', async () => {
  const res = await call('POST', '/api/auth/signup', { body: { username: 'tester1', password: 'password123' } });
  assert.equal(res.status, 409);
});

test('형식이 틀린 아이디·짧은 비밀번호는 400', async () => {
  assert.equal((await call('POST', '/api/auth/signup', { body: { username: 'A!', password: 'password123' } })).status, 400);
  assert.equal((await call('POST', '/api/auth/signup', { body: { username: 'tester2', password: 'short' } })).status, 400);
});

test('비밀번호가 틀리면 401, 맞으면 토큰으로 /me를 볼 수 있다', async () => {
  assert.equal((await call('POST', '/api/auth/login', { body: { username: 'tester1', password: 'wrongpass1' } })).status, 401);

  const login = await call('POST', '/api/auth/login', { body: { username: 'tester1', password: 'password123' } });
  assert.equal(login.status, 200);
  const { token } = await login.json();

  const me = await call('GET', '/api/auth/me', { token });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { username: 'tester1' });
});

test('로그인 없이 보호된 API를 부르면 401', async () => {
  assert.equal((await call('GET', '/api/accounts')).status, 401);
  assert.equal((await call('GET', '/api/transactions', { token: 'fake.token.value' })).status, 401);
});

test('카테고리 목록과 없는 주소', async () => {
  const res = await call('GET', '/api/categories');
  assert.equal(res.status, 200);
  const categories = await res.json();
  assert.ok(categories.some((c) => c.name === '카페'));

  assert.equal((await call('GET', '/api/nothing-here')).status, 404);
});

test('로그인을 너무 많이 시도하면 429와 JSON 오류를 준다', async () => {
  let res;
  for (let i = 0; i < 25; i += 1) {
    res = await call('POST', '/api/auth/login', { body: { username: 'nobody1', password: 'password123' } });
  }
  assert.equal(res.status, 429);
  assert.match((await res.json()).error, /너무 많아요/);
});

test('다른 아이디 로그인은 막히지 않고, 캡처 읽기 제한은 사람마다 따로다', async () => {
  const res = await call('POST', '/api/auth/login', { body: { username: 'tester1', password: 'password123' } });
  assert.equal(res.status, 200, '같은 와이파이의 다른 사람은 로그인할 수 있어야 해요');
  const { token: first } = await res.json();

  let scan;
  for (let i = 0; i < 31; i += 1) scan = await call('POST', '/api/scans', { token: first });
  assert.equal(scan.status, 429);
  assert.match((await scan.json()).error, /30번/);

  const signup = await call('POST', '/api/auth/signup', { body: { username: 'tester3', password: 'password123' } });
  const { token: second } = await signup.json();
  assert.notEqual((await call('POST', '/api/scans', { token: second })).status, 429);
});

test('개발 중에는 폰에서 http로 열어도 화면 파일이 막히지 않는다', async () => {
  const res = await call('GET', '/api/health');
  assert.doesNotMatch(res.headers.get('content-security-policy'), /upgrade-insecure-requests/);
});

test('JSON 형식이 깨지면 400', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{broken',
  });
  assert.equal(res.status, 400);
});
