// F2 캡처 → AI 분류 — 담당: 박영웅
// API 형식: docs/API.md
const express = require('express');
const multer = require('multer');
const { CATEGORY_NAMES, isExpenseCategory } = require('../categories');
const { readCaptures, detectImageType } = require('../services/scanner');
const { findRuleCategory } = require('../services/rules');
const { HttpError } = require('../utils/httpError');

const router = express.Router();

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 사진은 메모리에서만 잠깐 쓰고 디스크나 DB에 저장하지 않아요.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_FILES, fileSize: MAX_FILE_SIZE },
}).array('images', MAX_FILES);

const UPLOAD_ERRORS = {
  LIMIT_FILE_SIZE: '캡처는 한 장에 5MB까지 올릴 수 있어요',
  LIMIT_FILE_COUNT: `캡처는 한 번에 ${MAX_FILES}장까지 올릴 수 있어요`,
  LIMIT_UNEXPECTED_FILE: `캡처는 한 번에 ${MAX_FILES}장까지 올릴 수 있어요`,
};

function receiveImages(req, res, next) {
  upload(req, res, (error) => {
    if (error) {
      next(new HttpError(400, UPLOAD_ERRORS[error.code] || '파일을 올리지 못했어요'));
      return;
    }
    next();
  });
}

function toImages(files) {
  return files.map((file) => {
    const mediaType = detectImageType(file.buffer);
    if (!mediaType) throw new HttpError(400, 'png, jpg, webp 사진만 올릴 수 있어요');
    return { mediaType, buffer: file.buffer };
  });
}

// 전에 사용자가 고친 가게는 AI 답보다 저장된 규칙을 먼저 써요.
async function applyRules(userId, item) {
  const ruleCategory = await findRuleCategory(userId, item.merchant);
  if (!ruleCategory || !CATEGORY_NAMES.includes(ruleCategory)) return { ...item, categorySource: 'ai' };
  return { ...item, category: ruleCategory, isExpense: isExpenseCategory(ruleCategory), categorySource: 'rule' };
}

router.post('/', receiveImages, async (req, res) => {
  if (!req.files?.length) throw new HttpError(400, '캡처를 1장 이상 올려 주세요');

  const items = await readCaptures(toImages(req.files));
  res.json({ items: await Promise.all(items.map((item) => applyRules(req.userId, item))) });
});

module.exports = router;
