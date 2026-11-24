const { HttpError } = require('../utils/httpError');

function notFound(req, res, next) {
  next(new HttpError(404, '없는 주소예요'));
}

// 오류 종류를 보고 상태 코드와 문구를 정해요.
function describeError(err) {
  if (err.type === 'entity.parse.failed') return { status: 400, message: 'JSON 형식이 잘못됐어요' };
  if (err.name === 'ValidationError') {
    return { status: 400, message: Object.values(err.errors).map((e) => e.message).join(', ') };
  }
  if (err.name === 'CastError') return { status: 404, message: '찾을 수 없어요' };
  return { status: err.status || 500, message: err.message };
}

// 중앙 오류 처리 미들웨어 (9강). 모든 라우터 뒤, 맨 마지막에 등록해요.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const { status, message } = describeError(err);
  if (status < 500) return res.status(status).json({ error: message });

  console.error(err);
  // 우리가 직접 쓴 HttpError 문구만 보여 주고, 예상 못 한 오류의 내용은 숨겨요.
  const safeMessage = err instanceof HttpError ? message : '서버에 문제가 생겼어요';
  res.status(status).json({ error: safeMessage });
}

module.exports = { notFound, errorHandler };
