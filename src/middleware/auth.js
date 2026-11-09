const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../utils/httpError');

function signToken(user) {
  return jwt.sign({ sub: String(user._id), username: user.username }, config.jwtSecret, { expiresIn: '7d' });
}

// 요청 헤더의 "Authorization: Bearer <토큰>"을 확인해요. (9강 JWT)
// 통과하면 req.userId에 로그인한 사람의 id가 들어가요.
function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, '로그인이 필요해요'));
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, '로그인이 만료됐어요. 다시 로그인해 주세요'));
  }
}

module.exports = { signToken, requireAuth };
