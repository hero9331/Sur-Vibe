// F4 오늘 예산, F5 월별 보기 — 담당: 1학년 C
// 설명서: docs/guides/C-summary.md / API 형식: docs/API.md
const express = require('express');
const { notImplemented } = require('../utils/httpError');

const router = express.Router();

router.get('/today', notImplemented);
router.get('/monthly', notImplemented);

module.exports = router;
