// 회원 탈퇴: 지울 내 기록을 세고, 모두 지워요 — 담당: 1학년 A
// 설정 화면 "계정 → 탈퇴하기"가 써요. API 형식: docs/API.md "F4 설정"
const mongoose = require('mongoose');
const { User, Transaction, Account, Rule, Setting } = require('../models');
const { isMemoryDb } = require('../db');
const { DEMO_USERNAME } = require('../devSeed');

// user 칸(User를 가리키는 칸)이 있는 모델을 모두 찾아요.
// 팀원이 새 모델을 만들어도 user 칸만 있으면 탈퇴할 때 같이 지워져요. (빠뜨리는 개인정보가 없게)
function userOwnedModels() {
  return mongoose.modelNames()
    .map((name) => mongoose.model(name))
    .filter((Model) => Model.schema.path('user')?.options?.ref === 'User');
}

// 탈퇴 화면에 보여 줄 "지워지는 기록" 수
async function countUserData(userId) {
  const [transactions, accounts, rules, setting] = await Promise.all([
    Transaction.countDocuments({ user: userId }),
    Account.countDocuments({ user: userId }),
    Rule.countDocuments({ user: userId }),
    Setting.findOne({ user: userId }).select('fixedCosts').lean(),
  ]);
  return { transactions, accounts, fixedCosts: setting?.fixedCosts?.length ?? 0, rules };
}

// 내 기록을 모두 지우고, 계정은 맨 마지막에 지워요.
// 중간에 실패해도 계정이 남아 있어서 다시 로그인해 탈퇴를 이어서 할 수 있어요.
// 돌려주는 값: 컬렉션마다 지운 개수 { accounts: 4, transactions: 128, rules: 0, settings: 1 }
async function deleteUserData(userId) {
  const deleted = {};
  for (const Model of userOwnedModels()) {
    const { deletedCount } = await Model.deleteMany({ user: userId });
    deleted[Model.collection.collectionName] = deletedCount;
  }
  await User.deleteOne({ _id: userId });
  return deleted;
}

// 시연 서버(임시 DB)의 연습 계정은 여러 사람이 같이 써요. 지우면 '데모로 둘러보기'가 멈춰서 막아요.
// 진짜 서버(Atlas)에는 연습 계정이 없으니, 거기서 demo라는 아이디로 가입한 사람은 탈퇴할 수 있어요.
function leaveBlockReason(username, demoServer = isMemoryDb()) {
  if (demoServer && username === DEMO_USERNAME) {
    return '연습 계정은 여러 사람이 같이 써서 탈퇴할 수 없어요. 새로 가입한 계정으로 해 보세요';
  }
  return null;
}

module.exports = { userOwnedModels, countUserData, deleteUserData, leaveBlockReason };
