// F3 거래 내역 — 담당: 1학년 B
// 설명서: docs/guides/B-transactions.md / API 형식: docs/API.md
// 카테고리를 고치면 services/rules.js의 learnRule()을 꼭 불러 주세요.
const express = require('express');
const { notImplemented } = require('../utils/httpError');

const router = express.Router();

router.get('/', notImplemented);
router.post('/', notImplemented);
router.patch('/:id', notImplemented);
router.delete('/:id', notImplemented);

module.exports = router;
