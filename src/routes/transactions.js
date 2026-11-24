// F3 거래 내역 — 담당: 1학년 B
const express = require('express');
const { isObjectIdOrHexString } = require('mongoose');
const { Transaction } = require('../models');
const { CATEGORY_NAMES } = require('../categories');
const { learnRule } = require('../services/rules');
const { HttpError } = require('../utils/httpError');

const router = express.Router();
const editable = ['date', 'merchant', 'amount', 'category', 'isExpense'];
const batchFields = [...editable, 'originalAmount', 'splitCount', 'accountId', 'source'];

function fields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, '거래 정보를 확인해 주세요');
  }
  return Object.fromEntries(allowed.filter((key) => Object.hasOwn(input, key)).map((key) => [key, input[key]]));
}

function validDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

const validators = {
  date: validDate,
  merchant: (value) => typeof value === 'string',
  amount: (value) => Number.isFinite(value) && value > 0,
  originalAmount: (value) => Number.isFinite(value) && value >= 0,
  category: (value) => CATEGORY_NAMES.includes(value),
  isExpense: (value) => typeof value === 'boolean',
  splitCount: (value) => Number.isInteger(value) && value >= 1,
  accountId: (value) => value === null || isObjectIdOrHexString(value),
  source: (value) => ['scan', 'manual'].includes(value),
};

function validate(values) {
  for (const [key, value] of Object.entries(values)) {
    if (!validators[key](value)) throw new HttpError(400, '거래 정보를 확인해 주세요');
  }
}

function serialize(transaction) {
  const { _id, ...values } = transaction.toObject();
  return { id: String(_id), ...fields(values, batchFields) };
}

function ownedTransaction(req) {
  if (!isObjectIdOrHexString(req.params.id)) throw new HttpError(404, '거래를 찾을 수 없어요');
  return { _id: req.params.id, user: req.userId };
}

async function validateDocument(transaction) {
  try {
    await transaction.validate();
  } catch (error) {
    if (error.name !== 'ValidationError') throw error;
    throw new HttpError(400, Object.values(error.errors)[0].message);
  }
}

async function learnSavedCategory(userId, transaction) {
  try {
    await learnRule(userId, transaction.merchant, transaction.category);
  } catch (error) {
    // 거래는 이미 저장됐으므로 분류 학습 실패가 재저장을 유도하지 않게 해요.
    console.error('[transactions] 분류 규칙 저장 실패:', error.name);
  }
}

router.get('/', async (req, res) => {
  const { month } = req.query;
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new HttpError(400, '달을 YYYY-MM 형식으로 입력해 주세요');
  }
  const items = await Transaction.find({ user: req.userId, date: { $regex: `^${month}-` } }).sort({ date: -1, _id: -1 });
  res.json(items.map(serialize));
});

router.post('/', async (req, res) => {
  const { items } = req.body ?? {};
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, '저장할 거래가 필요해요');

  const documents = items.map((item) => {
    const values = fields(item, batchFields);
    validate(values);
    if (Object.hasOwn(item, 'categoryEdited') && typeof item.categoryEdited !== 'boolean') {
      throw new HttpError(400, '카테고리 수정 여부를 확인해 주세요');
    }
    return new Transaction({ ...values, user: req.userId });
  });
  await Promise.all(documents.map(validateDocument));
  const saved = await Transaction.insertMany(documents);
  for (const [index, transaction] of saved.entries()) {
    if (items[index].categoryEdited) await learnSavedCategory(req.userId, transaction);
  }
  res.status(201).json({ saved: saved.length, items: saved.map(serialize) });
});

router.patch('/:id', async (req, res) => {
  const filter = ownedTransaction(req);
  const values = fields(req.body, editable);
  validate(values);
  const previous = await Transaction.findOne(filter);
  if (!previous) throw new HttpError(404, '거래를 찾을 수 없어요');
  previous.set(values);
  await validateDocument(previous);
  const updated = Object.keys(values).length
    ? await Transaction.findOneAndUpdate(filter, { $set: values }, { returnDocument: 'after' })
    : previous;
  if (!updated) throw new HttpError(404, '거래를 찾을 수 없어요');
  if (Object.hasOwn(values, 'category')) await learnSavedCategory(req.userId, updated);
  res.json(serialize(updated));
});

router.delete('/:id', async (req, res) => {
  const { deletedCount } = await Transaction.deleteOne(ownedTransaction(req));
  if (!deletedCount) throw new HttpError(404, '거래를 찾을 수 없어요');
  res.sendStatus(204);
});

module.exports = router;
