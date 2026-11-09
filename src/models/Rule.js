const mongoose = require('mongoose');

// 사용자가 고친 분류를 기억해요. "스타벅스 → 카페" 같은 규칙이에요.
const ruleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    merchant: { type: String, required: true }, // services/rules.js의 normalizeMerchant로 정리한 이름
    category: { type: String, required: true },
  },
  { timestamps: true },
);

ruleSchema.index({ user: 1, merchant: 1 }, { unique: true });

module.exports = mongoose.model('Rule', ruleSchema);
