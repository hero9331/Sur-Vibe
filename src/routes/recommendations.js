// F6 청년 정책·대안 추천 — 담당: 1학년 D
// 설명서: docs/guides/D-recommendations.md / API 형식: docs/API.md
// 정책 목록은 data/policies.json에 넣어요.
const express = require('express');
const { notImplemented } = require('../utils/httpError');

const router = express.Router();

router.get('/', notImplemented);

module.exports = router;
