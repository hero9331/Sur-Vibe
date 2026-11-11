// 목업용 예시 데이터 — 담당: 박영웅
// 각자 API를 만들면 이 파일 대신 api()로 진짜 데이터를 불러와요. 다 바꾸면 이 파일은 지워요.

export const MOCK_TODAY = '2026-11-06';

export const mockCategories = [
  '학식', '외식', '배달', '카페', '편의점', '술·모임', '교통', '학업',
  '쇼핑', '구독', '문화·여가', '생활', '기타', '이체', '입금',
];

export const mockAccounts = [
  { id: 'a1', name: '생활비 통장', type: 'bank', institution: '토스뱅크', purpose: '매일 쓰는 돈' },
  { id: 'a2', name: '저축 통장', type: 'bank', institution: '카카오뱅크', purpose: '저축만, 꺼내 쓰지 않기' },
  { id: 'a3', name: '체크카드', type: 'card', institution: '신한카드', purpose: '' },
];

export const mockSettings = {
  monthlyBudget: 500000,
  fixedCosts: [
    { name: '통신비', amount: 33000 },
    { name: '유튜브 프리미엄', amount: 14900 },
  ],
};

export const mockTransactions = [
  { id: 't1', date: '2026-11-06', merchant: '메가커피 한양대점', amount: 2000, category: '카페', splitCount: 1, isExpense: true },
  { id: 't2', date: '2026-11-06', merchant: '학생식당', amount: 6000, category: '학식', splitCount: 1, isExpense: true },
  { id: 't3', date: '2026-11-06', merchant: 'CU 한양대점', amount: 3500, category: '편의점', splitCount: 1, isExpense: true },
  { id: 't4', date: '2026-11-05', merchant: '배달의민족', amount: 18900, originalAmount: 37800, category: '배달', splitCount: 2, isExpense: true },
  { id: 't5', date: '2026-11-05', merchant: 'GS25 왕십리점', amount: 3400, category: '편의점', splitCount: 1, isExpense: true },
  { id: 't6', date: '2026-11-04', merchant: '서울교통공사', amount: 1550, category: '교통', splitCount: 1, isExpense: true },
  { id: 't7', date: '2026-11-04', merchant: '스타벅스 한양대점', amount: 6100, category: '카페', splitCount: 1, isExpense: true },
  { id: 't8', date: '2026-11-03', merchant: '쿠팡', amount: 23800, category: '쇼핑', splitCount: 1, isExpense: true },
  { id: 't9', date: '2026-11-03', merchant: '교보문고', amount: 18000, category: '학업', splitCount: 1, isExpense: true },
  { id: 't10', date: '2026-11-02', merchant: '맥주창고 왕십리점', amount: 15000, originalAmount: 60000, category: '술·모임', splitCount: 4, isExpense: true },
  { id: 't11', date: '2026-11-02', merchant: '쿠팡이츠', amount: 14500, category: '배달', splitCount: 1, isExpense: true },
  { id: 't12', date: '2026-11-01', merchant: '넷플릭스', amount: 13500, category: '구독', splitCount: 1, isExpense: true },
  { id: 't13', date: '2026-11-01', merchant: '저축 통장으로 보냄', amount: 100000, category: '이체', splitCount: 1, isExpense: false },
];

// 지난달(10월) 카테고리별 지출
export const mockPrevMonth = {
  학식: 42000, 배달: 21000, 카페: 15000, 편의점: 12000, '술·모임': 30000,
  교통: 28000, 학업: 0, 쇼핑: 45000, 구독: 13500,
};

export const mockRecommendations = {
  targets: [
    { category: '배달', reason: 'most', amount: 33400, diff: 12400 },
    { category: '학업', reason: 'increased', amount: 18000, diff: 18000 },
  ],
  items: [
    { category: '배달', type: 'policy', title: '천원의 아침밥', description: '참여 대학 학생식당에서 아침을 천 원에 먹을 수 있어요' },
    { category: '배달', type: 'tip', title: '점심은 학식으로', description: '배달 한 번 값이면 학식을 세 번 먹을 수 있어요' },
    { category: '학업', type: 'tip', title: '중고 교재 거래', description: '학교 커뮤니티에서 지난 학기 교재를 싸게 구할 수 있어요' },
    { category: '학업', type: 'tip', title: '도서관 희망도서 신청', description: '필요한 책을 도서관에 신청하면 무료로 빌릴 수 있어요' },
  ],
};
