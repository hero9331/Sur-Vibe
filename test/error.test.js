// 중앙 오류 처리(src/middleware/error.js)가 오류 종류마다 알맞은 상태 코드와 문구를 주는지 확인해요.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { errorHandler } = require('../src/middleware/error');
const { HttpError } = require('../src/utils/httpError');

// res.status(...).json(...) 을 흉내 내서 무엇을 보냈는지 기록해요.
function handle(err) {
  const sent = {};
  const res = {
    status(code) { sent.status = code; return this; },
    json(body) { sent.body = body; return this; },
  };
  const original = console.error;
  console.error = () => {};
  try {
    errorHandler(err, {}, res, () => {});
  } finally {
    console.error = original;
  }
  return sent;
}

test('우리가 만든 HttpError는 상태 코드와 문구를 그대로 보낸다', () => {
  assert.deepEqual(handle(new HttpError(404, '거래를 찾을 수 없어요')), { status: 404, body: { error: '거래를 찾을 수 없어요' } });
});

test('깨진 JSON은 400', () => {
  const err = Object.assign(new Error('Unexpected token'), { type: 'entity.parse.failed', status: 400 });
  assert.deepEqual(handle(err), { status: 400, body: { error: 'JSON 형식이 잘못됐어요' } });
});

test('DB 검사 오류는 400이고 칸마다 문구를 이어 붙인다', () => {
  const err = Object.assign(new Error('x'), { name: 'ValidationError', errors: { a: { message: '금액이 필요해요' }, b: { message: '날짜가 필요해요' } } });
  assert.deepEqual(handle(err), { status: 400, body: { error: '금액이 필요해요, 날짜가 필요해요' } });
});

test('잘못된 id 모양은 404', () => {
  const err = Object.assign(new Error('Cast to ObjectId failed'), { name: 'CastError' });
  assert.deepEqual(handle(err), { status: 404, body: { error: '찾을 수 없어요' } });
});

test('예상 못 한 오류는 500이고 속 내용을 숨긴다', () => {
  assert.deepEqual(handle(new Error('db password is hunter2')), { status: 500, body: { error: '서버에 문제가 생겼어요' } });
});

test('우리가 만든 500대 HttpError 문구는 보여 준다', () => {
  assert.deepEqual(handle(new HttpError(503, '캡처 읽기 준비가 아직 안 됐어요')), { status: 503, body: { error: '캡처 읽기 준비가 아직 안 됐어요' } });
});
