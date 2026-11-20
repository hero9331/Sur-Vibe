const { normalizeMerchant } = require('./rules');

// 고정비로 등록한 항목의 결제인지 확인해요. (예: 고정비 "넷플릭스" ↔ 거래 "넷플릭스코리아")
// 고정비는 예산에서 이미 뺐으니, 하루 예산의 "쓴 돈"에서는 빼야 두 번 계산되지 않아요.
// wholeCategory가 켜진 고정비(예: "그 외 교통비")는 그 카테고리의 결제를 모두 고정비로 봐요.
// 그래서 거래의 category도 같이 넘겨 주세요. (안 넘기면 이름으로만 비교해요)
function isFixedCost(merchant, fixedCosts, category) {
  const name = normalizeMerchant(merchant);
  return fixedCosts.some((cost) => {
    if (cost.wholeCategory) return Boolean(category) && cost.category === category;
    const costName = normalizeMerchant(cost.name);
    return costName.length >= 2 && name.includes(costName);
  });
}

module.exports = { isFixedCost };
