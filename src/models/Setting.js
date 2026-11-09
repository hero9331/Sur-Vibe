const mongoose = require('mongoose');

// 사용자마다 하나. 월 예산과 고정비 목록이에요.
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
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Setting', settingSchema);
