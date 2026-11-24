// 화면 코드가 서버를 부를 때 쓰는 public/js/api.js 의 api() 시험이에요.
// 브라우저의 fetch, localStorage, location 을 가짜로 바꿔서 node에서 돌려요.
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

let api;
let store;
let calls;
let nextResponse;

before(async () => {
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
  };
  globalThis.location = { href: '/' };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return nextResponse;
  };
  ({ api } = await import('../public/js/api.js'));
});

beforeEach(() => {
  store = {};
  calls = [];
  globalThis.location.href = '/';
  nextResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
});

test('토큰이 있으면 Authorization 머리말을 붙이고, 객체 본문은 JSON으로 보낸다', async () => {
  store['budget.token'] = 'abc';
  assert.deepEqual(await api('POST', '/api/accounts', { name: '통장' }), { ok: true });
  const { url, options } = calls[0];
  assert.equal(url, '/api/accounts');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Authorization, 'Bearer abc');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.body, JSON.stringify({ name: '통장' }));
});

test('토큰이 없고 본문도 없으면 머리말 없이 보낸다', async () => {
  await api('GET', '/api/health');
  assert.deepEqual(calls[0].options.headers, {});
  assert.equal(calls[0].options.body, undefined);
});

test('파일(FormData)은 JSON으로 바꾸지 않고 그대로 보낸다', async () => {
  const form = new FormData();
  form.append('images', new Blob(['x']), 'a.png');
  await api('POST', '/api/scans', form);
  assert.equal(calls[0].options.body, form);
  assert.equal(calls[0].options.headers['Content-Type'], undefined);
});

test('204면 null을 돌려준다', async () => {
  nextResponse = new Response(null, { status: 204 });
  assert.equal(await api('DELETE', '/api/accounts/1'), null);
});

test('실패하면 서버가 준 문구로 오류를 낸다', async () => {
  nextResponse = new Response(JSON.stringify({ error: '계좌를 찾을 수 없어요' }), { status: 404 });
  await assert.rejects(api('GET', '/api/accounts/1'), { message: '계좌를 찾을 수 없어요' });
});

test('실패 응답이 JSON이 아니면 상태 코드로 오류를 낸다', async () => {
  nextResponse = new Response('<html>', { status: 502 });
  await assert.rejects(api('GET', '/api/summary/today'), { message: '요청 실패 (502)' });
});

test('로그인한 상태에서 401이 오면 토큰을 지우고 로그인 화면으로 보낸다', async () => {
  store['budget.token'] = 'expired';
  nextResponse = new Response(JSON.stringify({ error: 'x' }), { status: 401 });
  await assert.rejects(api('GET', '/api/accounts'), { message: '로그인이 필요해요' });
  assert.equal(store['budget.token'], undefined);
  assert.equal(globalThis.location.href, '/login.html');
});

test('로그인 전 401(비밀번호 틀림)은 화면을 옮기지 않고 서버 문구를 보여 준다', async () => {
  nextResponse = new Response(JSON.stringify({ error: '아이디나 비밀번호가 맞지 않아요' }), { status: 401 });
  await assert.rejects(api('POST', '/api/auth/login', {}), { message: '아이디나 비밀번호가 맞지 않아요' });
  assert.equal(globalThis.location.href, '/');
});
