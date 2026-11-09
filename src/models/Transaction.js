const mongoose = require('mongoose');
const { CATEGORY_NAMES } = require('../categories');

// 거래 한 건. 날짜는 "2026-11-03" 같은 글자로 저장해요 (시간대 문제를 피하려고).
const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이에요'] },
    merchant: { type: String, required: [true, '가게 이름이 필요해요'], trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: [0, '금액은 0 이상이에요'] }, // 내 몫 (더치페이 후)
    originalAmount: { type: Number, min: 0 }, // 원래 결제 금액
    splitCount: { type: Number, min: 1, default: 1 }, // 더치페이 사람 수
    category: { type: String, required: true, enum: { values: CATEGORY_NAMES, message: '없는 카테고리예요' } },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    isExpense: { type: Boolean, default: true },
    source: { type: String, enum: ['scan', 'manual'], default: 'scan' },
  },
  { timestamps: true },
);

transactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
