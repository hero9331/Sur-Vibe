// F3 거래 내역 화면 — 담당: 1학년 B
// 설명서: docs/guides/B-transactions.md
// 지금은 mock.js 예시 데이터예요. GET/PATCH/DELETE /api/transactions를 만들면 api()로 바꾸세요.
import { won } from './api.js';
import { el, mockBadge, cardTitle, prettyDate } from './ui.js';
import { mockCategories, mockTransactions } from './mock.js';

const section = document.getElementById('transactions-section');
let items = [...mockTransactions];

function row(t) {
  const select = el('select', { class: 'form-select form-select-sm category-select', 'aria-label': `${t.merchant} 카테고리` },
    mockCategories.map((c) => el('option', { value: c, selected: c === t.category }, c)));
  select.addEventListener('change', () => {
    t.category = select.value;
    t.isExpense = !['이체', '입금'].includes(select.value);
    render();
  });

  const remove = el('button', { class: 'btn btn-sm btn-outline-danger', type: 'button', 'aria-label': `${t.merchant} 삭제` }, '삭제');
  remove.addEventListener('click', () => {
    if (!confirm(`"${t.merchant}" 내역을 지울까요?`)) return;
    items = items.filter((x) => x.id !== t.id);
    render();
  });

  return el('li', { class: 'list-group-item px-0 py-3' },
    el('div', { class: 'd-flex justify-content-between align-items-start mb-2' },
      el('div', {},
        el('div', { class: 'fw-semibold' }, t.merchant),
        t.splitCount > 1 ? el('div', { class: 'small text-muted' }, `${won(t.originalAmount)}을 ${t.splitCount}명이 나눔`) : ''),
      el('div', { class: `fw-bold ${t.isExpense ? '' : 'text-muted'}` }, t.isExpense ? `-${won(t.amount)}` : won(t.amount))),
    el('div', { class: 'd-flex gap-2' }, select, remove));
}

function render() {
  const expenseTotal = items.filter((t) => t.isExpense).reduce((s, t) => s + t.amount, 0);

  const monthSelect = el('select', { class: 'form-select form-select-sm w-auto', 'aria-label': '달 선택' },
    el('option', { value: '2026-11' }, '2026년 11월'),
    el('option', { value: '2026-10' }, '2026년 10월'));

  const byDate = Map.groupBy(items, (t) => t.date);
  const groups = [...byDate.entries()].map(([date, list]) =>
    el('div', { class: 'mb-2' },
      el('div', { class: 'small fw-semibold text-muted mt-3' }, prettyDate(date)),
      el('ul', { class: 'list-group list-group-flush' }, list.map(row))));

  section.replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('11월 내역', mockBadge(), el('div', { class: 'ms-auto' }, monthSelect)),
      el('div', { class: 'd-flex justify-content-between bg-light rounded p-3' },
        el('span', {}, `지출 ${items.filter((t) => t.isExpense).length}건`),
        el('span', { class: 'fw-bold' }, `합계 ${won(expenseTotal)}`)),
      items.length ? groups : el('p', { class: 'text-muted text-center my-4' }, '아직 내역이 없어요')));
}

render();
