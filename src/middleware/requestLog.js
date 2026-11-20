// API 요청 기록과 응답 시간이에요. (12강 로깅, 성능 모니터링)
// 운영 서버는 아무도 지켜보고 있지 않아서, 무슨 일이 있었는지 기록이 남아야 오류를 추적할 수 있어요.
// 개인정보가 남지 않게 주소의 경로만 적고, 물음표 뒤 검색 조건과 요청 내용은 적지 않아요. (11강)
function requestLog(req, res, next) {
  if (!req.path.startsWith('/api/') || req.path === '/api/health') return next();

  // 라우터를 지나면 req.path가 짧아져서, 처음 들어온 경로를 미리 적어 둬요.
  const { method, path } = req;
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(`[요청] ${method} ${path} ${res.statusCode} ${Math.round(ms)}ms`);
  });
  next();
}

module.exports = { requestLog };
