const mongoose = require('mongoose');

// F1 계좌·카드
const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, '이름을 입력해 주세요'], trim: true, maxlength: 30 },
    type: { type: String, required: true, enum: { values: ['bank', 'card'], message: 'type은 bank 또는 card예요' } },
    institution: { type: String, required: [true, '은행·카드사를 입력해 주세요'], trim: true, maxlength: 30 },
    purpose: { type: String, trim: true, maxlength: 50, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Account', accountSchema);
