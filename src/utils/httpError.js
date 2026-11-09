// 라우터에서 throw new HttpError(404, '메시지') 하면 오류 처리 미들웨어가 알아서 응답해요.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// 아직 안 만든 기능은 501을 돌려줘요. 담당자가 만들면 이 함수를 지우면 돼요.
function notImplemented(req, res) {
  res.status(501).json({ error: '아직 만들지 않은 기능이에요' });
}

module.exports = { HttpError, notImplemented };
