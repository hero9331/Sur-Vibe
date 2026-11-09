const { Rule } = require('../models');

// "스타벅스  강남점" → "스타벅스 강남점" (공백 정리, 소문자)
function normalizeMerchant(name) {
  return String(name).trim().replace(/\s+/g, ' ').toLowerCase();
}

// 사용자가 카테고리를 고치면 호출해요. 다음부터 같은 가게는 이 카테고리로 분류돼요.
async function learnRule(userId, merchant, category) {
  await Rule.findOneAndUpdate(
    { user: userId, merchant: normalizeMerchant(merchant) },
    { category },
    { upsert: true },
  );
}

// 저장된 규칙이 있으면 카테고리를, 없으면 null을 돌려줘요.
async function findRuleCategory(userId, merchant) {
  const rule = await Rule.findOne({ user: userId, merchant: normalizeMerchant(merchant) });
  return rule ? rule.category : null;
}

module.exports = { normalizeMerchant, learnRule, findRuleCategory };
