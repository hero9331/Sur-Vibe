// F2 캡처 읽기 테스트. 진짜 Claude 대신 가짜 서버를 띄워서 돈이 나가지 않아요.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
const config = require('../src/config');
const { connectDb, disconnectDb } = require('../src/db');
const { createApp } = require('../src/app');
const { learnRule } = require('../src/services/rules');
const { User, Account } = require('../src/models');
const { normalizeItems, detectImageType } = require('../src/services/scanner');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

let mongo;
let server;
let baseUrl;
let fakeClaude;
let token;
let lastRequest;
let nextReply;

function replyWith(items, stopReason = 'end_turn') {
  nextReply = {
    status: 200,
    body: {
      id: 'msg_test', type: 'message', role: 'assistant', model: 'test', stop_reason: stopReason,
      content: [{ type: 'text', text: JSON.stringify({ items }) }],
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  };
}

function upload(files, authToken = token) {
  const form = new FormData();
  files.forEach((bytes, i) => form.append('images', new Blob([bytes], { type: 'image/png' }), `shot${i}.png`));
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  return fetch(`${baseUrl}/api/scans`, { method: 'POST', headers, body: form });
}

before(async () => {
  fakeClaude = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      lastRequest = { url: req.url, headers: req.headers, body: JSON.parse(raw) };
      res.writeHead(nextReply.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(nextReply.body));
    });
  });
  await new Promise((resolve) => { fakeClaude.listen(0, resolve); });
  process.env.ANTHROPIC_BASE_URL = `http://localhost:${fakeClaude.address().port}`;
  config.anthropicApiKey = 'test-key';

  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
  server = createApp().listen(0);
  baseUrl = `http://localhost:${server.address().port}`;

  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'scanner1', password: 'password123' }),
  });
  ({ token } = await res.json());
});

beforeEach(() => {
  config.anthropicApiKey = 'test-key';
  config.anthropicModel = 'claude-haiku-5-5';
  lastRequest = undefined;
  replyWith([]);
});

after(async () => {
  server.close();
  fakeClaude.close();
  await disconnectDb();
  await mongo.stop();
});

test('형식이 틀린 AI 답은 빼고, 금액은 양수로, 없는 카테고리는 기타로 바꾼다', () => {
  const items = normalizeItems([
    { date: '2026-11-03', merchant: ' 스타벅스 ', amount: -5600, category: '카페' },
    { date: '2026-11-03', merchant: '이상한 분류', amount: 1000, category: '해킹' },
    { date: '2026-02-30', merchant: '없는 날짜', amount: 1000, category: '카페' },
    { date: '2026-11-03', merchant: '', amount: 1000, category: '카페' },
    { date: '2026-11-03', merchant: '금액 0', amount: 0, category: '카페' },
    null,
  ]);
  assert.deepEqual(items, [
    { date: '2026-11-03', merchant: '스타벅스', amount: 5600, category: '카페', isExpense: true },
    { date: '2026-11-03', merchant: '이상한 분류', amount: 1000, category: '기타', isExpense: true },
  ]);
});

test('파일 앞부분을 보고 이미지 종류를 판단한다', () => {
  assert.equal(detectImageType(PNG), 'image/png');
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(detectImageType(Buffer.from('RIFF0000WEBPVP8 ', 'latin1')), 'image/webp');
  assert.equal(detectImageType(Buffer.from('<script>alert(1)</script>')), null);
});

test('로그인 없이 올리면 401', async () => {
  assert.equal((await upload([PNG], null)).status, 401);
});

test('파일이 없거나, 이미지가 아니거나, 6장이면 400이고 AI를 부르지 않는다', async () => {
  assert.equal((await upload([])).status, 400);
  assert.equal((await upload([Buffer.from('not an image')])).status, 400);
  assert.equal((await upload(Array(6).fill(PNG))).status, 400);
  assert.equal(lastRequest, undefined);
});

test('5MB가 넘는 캡처는 400', async () => {
  const res = await upload([Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])]);
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /5MB/);
});

test('API 키가 없으면 503과 알아볼 수 있는 안내를 준다', async () => {
  config.anthropicApiKey = '';
  const res = await upload([PNG]);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /ANTHROPIC_API_KEY/);
});

test('캡처를 Claude에 보내고 읽은 결과를 저장 없이 돌려준다', async () => {
  replyWith([
    { date: '2026-11-03', merchant: '메가커피', amount: 2000, category: '카페' },
    { date: '2026-11-04', merchant: '엄마', amount: 100000, category: '입금' },
  ]);

  const res = await upload([PNG, PNG]);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    items: [
      { date: '2026-11-03', merchant: '메가커피', amount: 2000, category: '카페', isExpense: true, categorySource: 'ai' },
      { date: '2026-11-04', merchant: '엄마', amount: 100000, category: '입금', isExpense: false, categorySource: 'ai' },
    ],
  });

  const sent = lastRequest.body;
  assert.equal(lastRequest.headers.authorization, 'Bearer test-key');
  assert.equal(sent.model, 'claude-haiku-5-5');
  assert.equal(sent.fallbacks, undefined);
  assert.equal(sent.output_config.format.type, 'json_schema');
  const imageBlocks = sent.messages[0].content.filter((b) => b.type === 'image');
  assert.equal(imageBlocks.length, 2);
  assert.equal(imageBlocks[0].source.media_type, 'image/png');
  assert.equal(imageBlocks[0].source.data, PNG.toString('base64'));
});

test('내가 고친 규칙이 AI 분류보다 먼저 적용되고, 남의 규칙은 적용되지 않는다', async () => {
  const me = await User.findOne({ username: 'scanner1' });
  await learnRule(me.id, '한양서점  본점', '학업');

  const other = await User.create({ username: 'someone2', passwordHash: 'x' });
  await learnRule(other.id, '김밥천국', '학식');

  replyWith([
    { date: '2026-11-05', merchant: '한양서점 본점', amount: 15000, category: '쇼핑' },
    { date: '2026-11-05', merchant: '김밥천국', amount: 5000, category: '외식' },
  ]);

  const { items } = await (await upload([PNG])).json();
  assert.equal(items[0].category, '학업');
  assert.equal(items[0].categorySource, 'rule');
  assert.equal(items[1].category, '외식');
  assert.equal(items[1].categorySource, 'ai');
});

test('내 계좌 이름만 AI에게 알려 주고, 내 계좌 이체와 남에게 보낸 돈을 구분하게 한다', async () => {
  const me = await User.findOne({ username: 'scanner1' });
  const other = await User.findOne({ username: 'someone2' });
  await Account.create({ user: me.id, name: '저축 통장', type: 'bank', institution: '카카오뱅크' });
  await Account.create({ user: other.id, name: '남의 비밀통장', type: 'bank', institution: '국민은행' });

  await upload([PNG]);
  const text = lastRequest.body.messages[0].content.at(-1).text;
  assert.match(text, /저축 통장\(카카오뱅크\)/);
  assert.doesNotMatch(text, /남의 비밀통장/);
  assert.match(lastRequest.body.system, /다른 사람에게 보낸 돈은 지출/);
});

test('Opus로 바꾸면 거절 시 다른 모델이 이어받게 요청한다', async () => {
  config.anthropicModel = 'claude-opus-5-5';
  await upload([PNG]);
  assert.equal(lastRequest.body.model, 'claude-opus-5-5');
  assert.equal(lastRequest.body.fallbacks, 'default');
  assert.match(lastRequest.headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
});

test('AI가 거절하거나 답이 잘리면 422', async () => {
  replyWith([], 'refusal');
  assert.equal((await upload([PNG])).status, 422);
  replyWith([], 'max_tokens');
  assert.equal((await upload([PNG])).status, 422);
});

test('Claude API 오류를 사용자에게 알맞은 응답으로 바꾼다', async () => {
  const errorBody = (type) => ({ type: 'error', error: { type, message: 'secret detail' } });

  nextReply = { status: 401, body: errorBody('authentication_error') };
  let res = await upload([PNG]);
  assert.equal(res.status, 503);
  assert.doesNotMatch((await res.json()).error, /secret detail/);

  nextReply = { status: 400, body: errorBody('invalid_request_error') };
  res = await upload([PNG]);
  assert.equal(res.status, 400);
  assert.doesNotMatch((await res.json()).error, /secret detail/);
});

test('AI 답이 JSON이 아니면 502', async () => {
  nextReply = {
    status: 200,
    body: { id: 'x', type: 'message', role: 'assistant', model: 't', stop_reason: 'end_turn', content: [{ type: 'text', text: '{broken' }], usage: { input_tokens: 1, output_tokens: 1 } },
  };
  assert.equal((await upload([PNG])).status, 502);
});
