const { normalizeMerchant } = require('./rules');

// 고정비로 등록한 항목의 결제인지 확인해요. (예: 고정비 "넷플릭스" ↔ 거래 "넷플릭스코리아")
// 고정비는 예산에서 이미 뺐으니, 하루 예산의 "쓴 돈"에서는 빼야 두 번 계산되지 않아요.
function isFixedCost(merchant, fixedCosts) {
  const name = normalizeMerchant(merchant);
  return fixedCosts.some((cost) => {
    const costName = normalizeMerchant(cost.name);
    return costName.length >= 2 && name.includes(costName);
  });
}

module.exports = { isFixedCost };
