// F4 홈 화면(오늘 쓸 수 있는 돈, 경고) — 담당: 1학년 C
// 설명서: docs/guides/C-summary.md
// 지금은 mock.js 예시 데이터로 계산해요. GET /api/summary/today를 만들면 api()로 바꾸세요.
import { won } from './api.js';
import { el, mockBadge, cardTitle, prettyDate } from './ui.js';
import { MOCK_TODAY, mockSettings, mockTransactions } from './mock.js';

const sum = (list) => list.reduce((total, t) => total + t.amount, 0);

function summarizeToday() {
  const month = MOCK_TODAY.slice(0, 7);
  const expenses = mockTransactions.filter((t) => t.isExpense && t.date.startsWith(month));
  const spentBeforeToday = sum(expenses.filter((t) => t.date < MOCK_TODAY));
  const spentToday = sum(expenses.filter((t) => t.date === MOCK_TODAY));
  const fixedTotal = sum(mockSettings.fixedCosts);

  const [year, mon, day] = MOCK_TODAY.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const remainingDays = lastDay - day + 1;
  const dailyAllowance = Math.max(0, Math.floor((mockSettings.monthlyBudget - fixedTotal - spentBeforeToday) / remainingDays));
  const ratio = dailyAllowance ? spentToday / dailyAllowance : 1;
  const level = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'ok';

  return { spentBeforeToday, spentToday, fixedTotal, remainingDays, dailyAllowance, ratio, level };
}

const LEVEL_UI = {
  ok: { bar: 'bg-primary', alert: 'alert-success', text: (left) => `오늘 ${won(left)} 더 쓸 수 있어요.` },
  warning: { bar: 'bg-warning', alert: 'alert-warning', text: (left) => `오늘 예산의 80%를 넘었어요. ${won(left)} 남았어요.` },
  over: { bar: 'bg-danger', alert: 'alert-danger', text: () => '오늘 예산을 넘었어요. 내일은 조금 아껴 봐요.' },
};

function render() {
  const s = summarizeToday();
  const ui = LEVEL_UI[s.level];
  const left = Math.max(0, s.dailyAllowance - s.spentToday);
  const percent = Math.min(100, Math.round(s.ratio * 100));

  const bar = el('div', { class: `progress-bar ${ui.bar}`, role: 'progressbar', 'aria-valuenow': percent, 'aria-valuemin': 0, 'aria-valuemax': 100 });
  bar.style.width = `${percent}%`;

  const line = (label, value) => el('div', { class: 'receipt-line' },
    el('span', { class: 'text-muted' }, label),
    el('strong', {}, value));
  const spentMonth = s.spentBeforeToday + s.spentToday;

  const hero = el('div', { class: 'card receipt p-4 mb-3' },
    cardTitle(`${prettyDate(MOCK_TODAY)} 오늘 쓸 수 있는 돈`, mockBadge()),
    el('div', { class: 'display-6 mb-2' }, won(s.dailyAllowance)),
    el('div', { class: 'd-flex justify-content-between small text-muted mb-1' },
      el('span', {}, `오늘 쓴 돈 ${won(s.spentToday)}`),
      el('span', {}, `${percent}%`)),
    el('div', { class: 'progress mb-3', 'aria-label': '오늘 예산 사용률' }, bar),
    el('div', { class: `alert ${ui.alert} py-2 mb-3` }, ui.text(left)),
    line('이번 달 쓴 돈', won(spentMonth)),
    line('남은 예산', won(Math.max(0, mockSettings.monthlyBudget - s.fixedTotal - spentMonth))),
    line('남은 날', `${s.remainingDays}일`),
  );

  const recent = mockTransactions.slice(0, 5).map((t) =>
    el('li', { class: 'list-group-item d-flex justify-content-between align-items-center px-0' },
      el('div', {},
        el('div', { class: 'fw-semibold' }, t.merchant),
        el('div', { class: 'small text-muted' }, `${prettyDate(t.date)} · ${t.category}`)),
      el('div', { class: 'fw-semibold' }, won(t.amount))));

  const recentCard = el('div', { class: 'card p-4 mb-3' },
    cardTitle('최근 내역', el('a', { class: 'ms-auto small', href: '/transactions.html' }, '전체 보기')),
    el('ul', { class: 'list-group list-group-flush' }, recent));

  const cta = el('a', { class: 'btn btn-primary btn-lg w-100', href: '/upload.html' }, '결제내역 캡처 올리기');

  document.getElementById('today-section').replaceChildren(hero, recentCard, cta);
}

render();
