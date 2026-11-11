// 개발할 때 바로 써 볼 수 있는 연습 계정과 거래예요 — 담당: 박영웅
// 임시 메모리 DB일 때만 실행돼요. Atlas나 배포 서버에는 만들어지지 않아요.
const bcrypt = require('bcryptjs');
const { User, Account, Setting, Transaction } = require('./models');
const { isExpenseCategory } = require('./categories');

const DEMO_USERNAME = 'demo';
const DEMO_PASSWORD = 'demo1234';

// [날짜, 가게, 금액, 카테고리]. 이번 달은 교통을 가장 많이 썼고, 배달이 가장 많이 늘어난 모습이에요.
const THIS_MONTH = [
  [1, '티머니 정기권', 55000, '교통'],
  [1, '넷플릭스', 13500, '구독'],
  [2, '한양대학교 학생식당', 6000, '학식'],
  [2, '메가커피 왕십리점', 2000, '카페'],
  [3, '배달의민족', 18900, '배달'],
  [4, 'CU 한양대점', 3500, '편의점'],
  [5, '쿠팡이츠', 21500, '배달'],
  [6, '교보문고 광화문점', 18000, '학업'],
  [7, '내 저축 통장', 100000, '이체'],
  [8, '과외비', 300000, '입금'],
  [9, '배달의민족', 24000, '배달'],
  [10, '왕십리 주점', 15000, '술·모임'],
  [11, '티머니 지하철', 1550, '교통'],
  [12, '코레일 KTX', 28000, '교통'],
];
const LAST_MONTH = [
  [2, '티머니 정기권', 55000, '교통'],
  [3, '넷플릭스', 13500, '구독'],
  [4, '한양대학교 학생식당', 6000, '학식'],
  [6, '배달의민족', 17000, '배달'],
  [9, '메가커피 왕십리점', 2000, '카페'],
  [12, '무신사', 45000, '쇼핑'],
  [15, 'CGV 왕십리', 11000, '문화·여가'],
  [18, 'GS25 왕십리역점', 4200, '편의점'],
  [22, '쿠팡이츠', 16000, '배달'],
  [26, '왕십리 주점', 22000, '술·모임'],
];

function todayInKorea() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toTransaction(userId, date, [, merchant, amount, category]) {
  return { user: userId, date, merchant, amount, originalAmount: amount, category, isExpense: isExpenseCategory(category), source: 'manual' };
}

function buildTransactions(userId, today) {
  const [year, month, todayNumber] = today.split('-').map(Number);
  const lastYear = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;

  // 아직 안 온 날짜가 생기지 않게, 이번 달 거래는 오늘 안쪽으로 접어요.
  const current = THIS_MONTH.map((row) => toTransaction(userId, isoDate(year, month, ((row[0] - 1) % todayNumber) + 1), row));
  const previous = LAST_MONTH.map((row) => toTransaction(userId, isoDate(lastYear, lastMonth, row[0]), row));
  const spentToday = toTransaction(userId, today, [0, '이디야커피 행당점', 4500, '카페']);
  return [...current, ...previous, spentToday];
}

async function seedDemoData(today = todayInKorea()) {
  if (await User.exists({ username: DEMO_USERNAME })) return;

  const user = await User.create({ username: DEMO_USERNAME, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) });
  await Account.create([
    { user: user.id, name: '생활비 통장', type: 'bank', institution: '토스뱅크' },
    { user: user.id, name: '내 저축 통장', type: 'bank', institution: '카카오뱅크' },
  ]);
  await Setting.create({
    user: user.id,
    monthlyBudget: 500000,
    fixedCosts: [{ name: '넷플릭스', amount: 13500 }, { name: '통신비', amount: 33000 }],
  });
  await Transaction.insertMany(buildTransactions(user.id, today));
  console.log(`[DB] 연습 계정을 만들었어요. 아이디 ${DEMO_USERNAME} / 비밀번호 ${DEMO_PASSWORD}`);
}

module.exports = { seedDemoData, DEMO_USERNAME, DEMO_PASSWORD };
