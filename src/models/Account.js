const mongoose = require('mongoose');

// F1 계좌·카드 (화면에서는 "자산": 은행 bank / 페이머니 pay / 카드 card)
const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, '이름을 입력해 주세요'], trim: true, maxlength: 30 },
    type: { type: String, required: true, enum: { values: ['bank', 'pay', 'card'], message: 'type은 bank, pay, card 중 하나예요' } },
    institution: { type: String, required: [true, '은행·카드사를 입력해 주세요'], trim: true, maxlength: 30 },
    purpose: { type: String, trim: true, maxlength: 50, default: '' },
    // 같은 은행에 계좌가 여러 개일 때 구분해요. 개인정보라 끝 4자리만 저장해요.
    last4: { type: String, match: [/^(\d{4})?$/, '번호는 끝 4자리만 저장해요'], default: '' },
    // 잔액은 사용자가 직접 적어요. (은행 연동 없음) 비어 있으면 null
    balance: { type: Number, default: null },
    // 날짜별 잔액. "어제보다 얼마" 계산에만 쓰고 응답에는 넣지 않아요.
    balanceHistory: { type: [{ _id: false, date: String, amount: Number }], default: [] },
    interestRate: { type: Number, min: [0, '이자율은 0% 이상이에요'], max: [100, '이자율은 100% 이하예요'], default: null }, // 연 %
    hidden: { type: Boolean, default: false }, // 목록에서 숨기기 (이체 구분에는 계속 써요)
  },
  { timestamps: true },
);

module.exports = mongoose.model('Account', accountSchema);
