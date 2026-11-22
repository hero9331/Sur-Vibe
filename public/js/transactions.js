// F3 거래 내역 화면 — 담당: 1학년 B
import { api, won } from './api.js';
import { el, cardTitle, prettyDate } from './ui.js';


const section = document.getElementById('transactions-section');
let month = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).format();
let items = [];
let categories = [];
let message = '';
let busy = false;

async function update(action, reload = false) {
  busy = true;
  message = '';
  if (reload) items = [];
  render();
  try {
    await action();
  } catch (error) {
    message = error.message;
  } finally {
    busy = false;
    render();
  }
}

async function load() {
  const [list, options] = await Promise.all([
    api('GET', `/api/transactions?month=${month}`),
    api('GET', '/api/categories'),
  ]);
  items = list;
  categories = options;
}

function row(t) {
  const select = el('select', { class: 'form-select form-select-sm category-select', 'aria-label': `${t.merchant} 카테고리` },
    categories.map(({ name }) => el('option', { value: name, selected: name === t.category }, name)));
  select.disabled = busy;
  select.addEventListener('change', () => {
    const category = select.value;
    const isExpense = categories.find(({ name }) => name === category)?.isExpense !== false;
    void update(async () => {
      const saved = await api('PATCH', `/api/transactions/${t.id}`, { category, isExpense });
      items = items.map((item) => item.id === saved.id ? saved : item);
    });
  });

  const remove = el('button', { class: 'btn btn-sm btn-outline-danger', type: 'button', 'aria-label': `${t.merchant} 삭제` }, '삭제');
  remove.disabled = busy;
  remove.addEventListener('click', () => {
    if (!confirm(`"${t.merchant}" 내역을 지울까요?`)) return;
    void update(async () => {
      await api('DELETE', `/api/transactions/${t.id}`);
      items = items.filter((item) => item.id !== t.id);
    });
  });

  return el('li', { class: 'list-group-item px-0 py-3' },
    el('div', { class: 'd-flex justify-content-between align-items-start gap-2 mb-2' },
      el('div', {},
        el('div', { class: 'fw-semibold text-break' }, t.merchant),
        t.splitCount > 1 ? el('div', { class: 'small text-muted' }, `${won(t.originalAmount)}을 ${t.splitCount}명이 나눔`) : ''),
      el('div', { class: `fw-bold flex-shrink-0 ${t.isExpense ? '' : 'text-muted'}` }, t.isExpense ? `-${won(t.amount)}` : won(t.amount))),
    el('div', { class: 'd-flex gap-2' }, select, remove));
}

function render() {
  const expenseTotal = items.filter((t) => t.isExpense).reduce((s, t) => s + t.amount, 0);

  const monthSelect = el('input', { type: 'month', class: 'form-control form-control-sm w-auto', 'aria-label': '달 선택', value: month });
  monthSelect.disabled = busy;
  monthSelect.addEventListener('change', () => {
    if (!monthSelect.value) {
      monthSelect.value = month;
      return;
    }
    month = monthSelect.value;
    void update(load, true);
  });

  const byDate = Map.groupBy(items, (t) => t.date);
  const groups = [...byDate.entries()].map(([date, list]) =>
    el('div', { class: 'mb-2' },
      el('div', { class: 'small fw-semibold text-muted mt-3' }, prettyDate(date)),
      el('ul', { class: 'list-group list-group-flush' }, list.map(row))));

  section.replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('거래 내역', el('div', { class: 'ms-auto' }, monthSelect)),
      el('div', { class: 'receipt-total' },
        el('span', {}, `지출 ${items.filter((t) => t.isExpense).length}건`),
        el('span', { class: 'fw-bold' }, `합계 ${won(expenseTotal)}`)),
      message ? el('p', { class: 'text-danger mt-3', role: 'alert' }, message) : '',
      busy && items.length === 0 ? el('p', { class: 'text-muted mt-3', role: 'status' }, '불러오는 중이에요') : items.length ? groups : !message && el('p', { class: 'text-muted text-center my-4' }, '아직 내역이 없어요')));
}

void update(load, true);
