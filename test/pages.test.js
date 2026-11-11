const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

let server;
let baseUrl;

before(() => {
  server = createApp().listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => {
  server.close();
});

test('없는 화면 주소는 안내 페이지를 404로 보여 준다', async () => {
  const res = await fetch(`${baseUrl}/nothing-here`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /페이지를 찾을 수 없어요/);
});

test('없는 API 주소는 계속 JSON으로 답한다', async () => {
  const res = await fetch(`${baseUrl}/api/nothing-here`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
});
