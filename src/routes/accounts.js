// F1 계좌·카드 — 담당: 1학년 A
// 설명서: docs/guides/A-accounts-settings.md / API 형식: docs/API.md
// 로그인한 사람의 id는 req.userId에 들어 있어요. 꼭 자기 데이터만 다루세요.
const express = require('express');
const { notImplemented } = require('../utils/httpError');

const router = express.Router();

router.get('/', notImplemented);
router.post('/', notImplemented);
router.patch('/:id', notImplemented);
router.delete('/:id', notImplemented);

module.exports = router;
