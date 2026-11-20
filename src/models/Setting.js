const mongoose = require('mongoose');
const { CATEGORY_NAMES } = require('../categories');

// 사용자마다 하나. 월 예산, 고정비 목록, 알림 설정이에요.
const settingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    monthlyBudget: { type: Number, min: [0, '예산은 0 이상이에요'], default: 0 },
    fixedCosts: {
      type: [
        {
          _id: false,
          name: { type: String, required: true, trim: true, maxlength: 30 },
          amount: { type: Number, required: true, min: 0 },
          category: { type: String, enum: { values: CATEGORY_NAMES, message: '없는 카테고리예요' }, default: null },
          billingDay: { type: Number, min: 1, max: 31, default: null }, // 매달 결제일 (구독 알림에 써요)
          // true면 이름과 상관없이 그 카테고리의 결제를 모두 고정비로 봐요. (예: "그 외 교통비")
          wholeCategory: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    // 구독 결제 며칠 전에 "계속 쓸까요?" 알림을 보여 줄지
    subscriptionAlert: {
      enabled: { type: Boolean, default: true },
      daysBefore: { type: Number, min: 1, max: 14, default: 3 },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Setting', settingSchema);
