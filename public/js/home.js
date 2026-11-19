// F4 홈 화면(오늘 쓸 수 있는 돈, 경고) — 담당: 1학년 C
// 설명서: docs/guides/C-summary.md
// GET /api/summary/today로 오늘 예산을, GET /api/transactions로 최근 내역을 불러와요.
import { api, won } from './api.js';
import { el, cardTitle, prettyDate } from './ui.js';

const section = document.getElementById('today-section');

const LEVEL_UI = {
  ok: { bar: 'bg-primary', alert: 'alert-success', text: (left) => `오늘 ${won(left)} 더 쓸 수 있어요.` },
  warning: { bar: 'bg-warning', alert: 'alert-warning', text: (left) => `오늘 예산의 80%를 넘었어요. ${won(left)} 남았어요.` },
  over: { bar: 'bg-danger', alert: 'alert-danger', text: () => '오늘 예산을 넘었어요. 내일은 조금 아껴 봐요.' },
};

// 오늘 쓴 돈이 하루 예산의 몇 %인지 (0~100)
function usedPercent(s) {
  if (s.dailyAllowance > 0) return Math.min(100, Math.round((s.spentToday / s.dailyAllowance) * 100));
  return s.spentToday > 0 ? 100 : 0;
}

const line = (label, value) => el('div', { class: 'receipt-line' },
  el('span', { class: 'text-muted' }, label),
  el('strong', {}, value));

function heroCard(s) {
  const ui = LEVEL_UI[s.level] || LEVEL_UI.ok;
  const left = Math.max(0, s.dailyAllowance - s.spentToday);
  const percent = usedPercent(s);
  const spentMonth = s.spentBeforeToday + s.spentToday;

  const bar = el('div', { class: `progress-bar ${ui.bar}`, role: 'progressbar', 'aria-label': '오늘 예산 사용률', 'aria-valuenow': percent, 'aria-valuemin': 0, 'aria-valuemax': 100 });
  bar.style.width = `${percent}%`;

  const notice = s.monthlyBudget > 0
    ? el('div', { class: `alert ${ui.alert} py-2 mb-3` }, ui.text(left))
    : el('p', { class: 'small text-muted mb-3' },
      '아직 월 예산을 정하지 않았어요. ', el('a', { href: '/settings.html' }, '설정에서 정하기'));

  return el('div', { class: 'card receipt p-4 mb-3' },
    cardTitle(`${prettyDate(s.date)} 오늘 쓸 수 있는 돈`),
    el('div', { class: 'display-6 mb-2' }, won(s.dailyAllowance)),
    el('div', { class: 'd-flex justify-content-between small text-muted mb-1' },
      el('span', {}, `오늘 쓴 돈 ${won(s.spentToday)}`),
      el('span', {}, `${percent}%`)),
    el('div', { class: 'progress mb-3' }, bar),
    notice,
    line('이번 달 쓴 돈', won(spentMonth)),
    line('남은 예산', won(Math.max(0, s.monthlyBudget - s.fixedTotal - spentMonth))),
    line('남은 날', `${s.remainingDays}일`),
  );
}

function recentCard(transactions) {
  const items = transactions.slice(0, 5).map((t) =>
    el('li', { class: 'list-group-item d-flex justify-content-between align-items-center px-0' },
      el('div', {},
        el('div', { class: 'fw-semibold' }, t.merchant),
        el('div', { class: 'small text-muted' }, `${prettyDate(t.date)} · ${t.category}`)),
      el('div', { class: 'fw-semibold' }, won(t.amount))));

  const body = items.length
    ? el('ul', { class: 'list-group list-group-flush' }, items)
    : el('p', { class: 'text-muted mb-0' }, '아직 내역이 없어요. 결제내역 캡처를 올려 보세요.');

  return el('div', { class: 'card p-4 mb-3' },
    cardTitle('최근 내역', el('a', { class: 'ms-auto small', href: '/transactions.html' }, '내역 전체 보기')),
    body);
}

// 최근 내역은 거래 API(1학년 B)를 써요. 아직 안 됐거나 실패하면 빈 목록으로 보여 줘요.
async function loadRecent(month) {
  try {
    return await api('GET', `/api/transactions?month=${month}`);
  } catch {
    return [];
  }
}

async function render() {
  section.replaceChildren(el('p', { class: 'text-muted' }, '불러오는 중이에요...'));
  try {
    const summary = await api('GET', '/api/summary/today');
    const recent = await loadRecent(summary.date.slice(0, 7));
    const cta = el('a', { class: 'btn btn-primary btn-lg w-100', href: '/upload.html' }, '결제내역 캡처 올리기');
    section.replaceChildren(heroCard(summary), recentCard(recent), cta);
  } catch (err) {
    section.replaceChildren(el('div', { class: 'alert alert-danger' },
      `오늘 예산을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요. (${err.message})`));
  }
}

render();
