// 개발할 때 바로 써 볼 수 있는 연습 계정과 거래예요 — 담당: 박영웅
// 임시 메모리 DB일 때만 실행돼요. Atlas나 배포 서버에는 만들어지지 않아요.
// (1학년 A 추가: 설정 화면 시연용 구독료·통신비·계좌 잔액, 지난 2달 고정지출 거래)
const bcrypt = require('bcryptjs');
const { User, Account, Setting, Transaction } = require('./models');
const { isExpenseCategory } = require('./categories');
const { shiftMonth } = require('./utils/dates');

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
  // 정기권 말고 매달 비슷하게 나가는 교통비 (합계 72,000)
  [10, '카카오T 택시', 23500, '교통'],
  [17, '코레일 KTX', 24500, '교통'],
  [24, '티머니 충전', 24000, '교통'],
];
// 지난 2달 고정지출 예상에 쓰는 지지난달 (교통 정기권 55,000 + 그 외 78,000)
const TWO_MONTHS_AGO = [
  [2, '티머니 정기권', 55000, '교통'],
  [3, '넷플릭스', 13500, '구독'],
  [8, '카카오T 택시', 21000, '교통'],
  [15, '코레일 KTX', 25000, '교통'],
  [21, '카카오T 택시', 18000, '교통'],
  [27, '티머니 충전', 14000, '교통'],
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

// 매달 나가는 구독료·통신비. 결제일은 오늘 기준으로 정해서 "2일 뒤 결제" 알림을 늘 볼 수 있어요.
function subscriptions(todayNumber) {
  return [
    { name: 'ChatGPT Plus', amount: 29000, category: '구독', billingDay: ((todayNumber + 1) % 28) + 1 },
    { name: '유튜브 프리미엄', amount: 14900, category: '구독', billingDay: ((todayNumber + 8) % 28) + 1 },
    { name: 'SKT 통신요금', amount: 49000, category: '생활', billingDay: 25 },
  ];
}

// 한 달 치 행 + 그 달에 결제된 구독료 (이번 달은 오늘까지 결제일이 지난 것만)
function monthRows(rows, subs, lastDay) {
  const paid = subs.filter((s) => s.billingDay <= lastDay).map((s) => [s.billingDay, s.name, s.amount, s.category]);
  return [...rows, ...paid];
}

function buildTransactions(userId, today) {
  const [year, month, todayNumber] = today.split('-').map(Number);
  const subs = subscriptions(todayNumber);
  const thisMonth = today.slice(0, 7);
  const dated = (monthText, rows) => rows.map((row) => toTransaction(userId, `${monthText}-${String(row[0]).padStart(2, '0')}`, row));

  // 아직 안 온 날짜가 생기지 않게, 이번 달 거래는 오늘 안쪽으로 접어요.
  const current = THIS_MONTH.map((row) => toTransaction(userId, isoDate(year, month, ((row[0] - 1) % todayNumber) + 1), row));
  const currentSubs = dated(thisMonth, monthRows([], subs, todayNumber));
  const previous = dated(shiftMonth(thisMonth, -1), monthRows(LAST_MONTH, subs, 31));
  const older = dated(shiftMonth(thisMonth, -2), monthRows(TWO_MONTHS_AGO, subs, 31));
  const spentToday = toTransaction(userId, today, [0, '이디야커피 행당점', 4500, '카페']);
  return [...current, ...currentSubs, ...previous, ...older, spentToday];
}

function yesterdayOf(today) {
  const [year, month, day] = today.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

// 잔액은 직접 적은 값이에요. 어제 기록이 있어서 "어제보다 얼마"가 보여요.
function demoAccounts(userId, today) {
  const yesterday = yesterdayOf(today);
  const history = (before, now) => [{ date: yesterday, amount: before }, { date: today, amount: now }];
  return [
    { user: userId, name: '생활비 통장', type: 'bank', institution: '토스뱅크', purpose: '생활비', last4: '4821', balance: 1284300, balanceHistory: history(1300800, 1284300) },
    { user: userId, name: '내 저축 통장', type: 'bank', institution: '카카오뱅크', purpose: '저축', last4: '7310', balance: 3000164, interestRate: 2, balanceHistory: history(3000000, 3000164) },
    { user: userId, name: '카카오페이 머니', type: 'pay', institution: '카카오페이', purpose: '생활비', balance: 23500, balanceHistory: history(30000, 23500) },
    { user: userId, name: '체크카드', type: 'card', institution: '삼성카드', purpose: '생활비', last4: '3021' },
  ];
}

async function seedDemoData(today = todayInKorea()) {
  if (await User.exists({ username: DEMO_USERNAME })) return;

  const user = await User.create({ username: DEMO_USERNAME, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) });
  await Account.create(demoAccounts(user.id, today));
  await Setting.create({
    user: user.id,
    monthlyBudget: 500000,
    fixedCosts: [{ name: '넷플릭스', amount: 13500, category: '구독', billingDay: 1 }, ...subscriptions(Number(today.slice(8)))],
    subscriptionAlert: { enabled: true, daysBefore: 3 },
  });
  await Transaction.insertMany(buildTransactions(user.id, today));
  console.log(`[DB] 연습 계정을 만들었어요. 아이디 ${DEMO_USERNAME} / 비밀번호 ${DEMO_PASSWORD}`);
}

module.exports = { seedDemoData, DEMO_USERNAME, DEMO_PASSWORD };
