// F1 계좌·카드, F4 예산 설정 화면 — 담당: 1학년 A
// 설명서: docs/guides/A-accounts-settings.md
// 지금은 mock.js 예시 데이터예요. /api/accounts, /api/settings를 만들면 api()로 바꾸세요.
import { won } from './api.js';
import { el, mockBadge, cardTitle } from './ui.js';
import { mockAccounts, mockSettings } from './mock.js';

let accounts = [...mockAccounts];
const settings = { monthlyBudget: mockSettings.monthlyBudget, fixedCosts: [...mockSettings.fixedCosts] };

function renderAccounts() {
  const list = accounts.map((a) => {
    const remove = el('button', { class: 'btn btn-sm btn-outline-danger', type: 'button', 'aria-label': `${a.name} 삭제` }, '삭제');
    remove.addEventListener('click', () => {
      accounts = accounts.filter((x) => x.id !== a.id);
      renderAccounts();
    });
    return el('li', { class: 'list-group-item px-0 d-flex justify-content-between align-items-center' },
      el('div', {},
        el('div', { class: 'fw-semibold' }, a.name),
        el('div', { class: 'small text-muted' }, a.type === 'bank' ? '계좌' : '카드', ` · ${a.institution}`, a.purpose ? ` · ${a.purpose}` : '')),
      remove);
  });

  const name = el('input', { class: 'form-control', placeholder: '이름 (예: 생활비 통장)', 'aria-label': '계좌 이름', required: true, maxLength: 30 });
  const type = el('select', { class: 'form-select', 'aria-label': '종류' }, el('option', { value: 'bank' }, '계좌'), el('option', { value: 'card' }, '카드'));
  const institution = el('input', { class: 'form-control', placeholder: '은행·카드사', 'aria-label': '은행·카드사', required: true, maxLength: 30 });
  const purpose = el('input', { class: 'form-control', placeholder: '용도 (선택)', 'aria-label': '용도', maxLength: 50 });

  const form = el('form', { class: 'row g-2 mt-2', novalidate: true },
    el('div', { class: 'col-md-4' }, name),
    el('div', { class: 'col-4 col-md-2' }, type),
    el('div', { class: 'col-8 col-md-3' }, institution),
    el('div', { class: 'col-md-3' }, purpose),
    el('div', { class: 'col-12' }, el('button', { class: 'btn btn-primary w-100', type: 'submit' }, '+ 추가하기')));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!name.value.trim() || !institution.value.trim()) {
      name.classList.toggle('is-invalid', !name.value.trim());
      institution.classList.toggle('is-invalid', !institution.value.trim());
      return;
    }
    accounts.push({ id: crypto.randomUUID(), name: name.value.trim(), type: type.value, institution: institution.value.trim(), purpose: purpose.value.trim() });
    renderAccounts();
  });

  document.getElementById('accounts-section').replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('내 계좌·카드', mockBadge()),
      el('p', { class: 'small text-muted' }, '등록한 내 계좌끼리 보낸 돈은 지출로 세지 않아요.'),
      accounts.length ? el('ul', { class: 'list-group list-group-flush' }, list) : el('p', { class: 'text-muted' }, '아직 등록한 계좌가 없어요'),
      form));
}

function renderBudget() {
  const budget = el('input', { type: 'number', min: 0, step: 10000, class: 'form-control', value: settings.monthlyBudget, id: 'monthly-budget' });
  budget.addEventListener('input', () => {
    settings.monthlyBudget = Math.max(0, Number(budget.value) || 0);
    updateTotal();
  });

  const fixedTotal = el('div', { class: 'fw-semibold' });
  const usable = el('div', { class: 'alert alert-primary py-2 mb-0 mt-3' });
  function updateTotal() {
    const total = settings.fixedCosts.reduce((s, c) => s + c.amount, 0);
    fixedTotal.textContent = `고정비 합계 ${won(total)}`;
    usable.textContent = `고정비를 빼고 이번 달 실제로 쓸 수 있는 돈: ${won(Math.max(0, settings.monthlyBudget - total))}`;
  }

  const fixedList = settings.fixedCosts.map((c, index) => {
    const remove = el('button', { class: 'btn btn-sm btn-link text-danger', type: 'button' }, '삭제');
    remove.addEventListener('click', () => {
      settings.fixedCosts.splice(index, 1);
      renderBudget();
    });
    return el('li', { class: 'list-group-item px-0 d-flex justify-content-between align-items-center' },
      el('span', {}, c.name), el('span', {}, won(c.amount), remove));
  });

  const costName = el('input', { class: 'form-control', placeholder: '이름 (예: 통신비)', 'aria-label': '고정비 이름', maxLength: 30 });
  const costAmount = el('input', { type: 'number', min: 0, class: 'form-control', placeholder: '금액', 'aria-label': '고정비 금액' });
  const addCost = el('form', { class: 'row g-2 mt-1' },
    el('div', { class: 'col-6' }, costName),
    el('div', { class: 'col-3' }, costAmount),
    el('div', { class: 'col-3' }, el('button', { class: 'btn btn-outline-primary w-100', type: 'submit' }, '추가')));
  addCost.addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = Number(costAmount.value);
    if (!costName.value.trim() || !(amount > 0)) return;
    settings.fixedCosts.push({ name: costName.value.trim(), amount });
    renderBudget();
  });

  document.getElementById('budget-section').replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('예산', mockBadge()),
      el('label', { class: 'form-label', for: 'monthly-budget' }, '한 달 예산'),
      el('div', { class: 'input-group mb-4' }, budget, el('span', { class: 'input-group-text' }, '원')),
      el('div', { class: 'd-flex justify-content-between mb-1' }, el('span', { class: 'form-label mb-0' }, '고정비 (매달 나가는 돈)'), fixedTotal),
      el('ul', { class: 'list-group list-group-flush' }, fixedList),
      addCost,
      usable));
  updateTotal();
}

renderAccounts();
renderBudget();
