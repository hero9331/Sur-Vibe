// F2 캡처 올리기 화면 — 담당: 박영웅
import { api, won } from './api.js';
import { el, cardTitle } from './ui.js';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_SPLIT = 20;
const section = document.getElementById('upload-section');
let files = [];
let categories = [];

function errorBox(message) {
  return message ? el('div', { class: 'alert alert-danger py-2', role: 'alert' }, message) : '';
}

function isExpense(categoryName) {
  return categories.find((c) => c.name === categoryName)?.isExpense !== false;
}

function renderPicker(errorMessage) {
  const input = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true, class: 'd-none', id: 'file-input' });
  input.addEventListener('change', () => {
    const picked = [...input.files];
    const small = picked.filter((file) => file.size <= MAX_FILE_SIZE);
    files = small.slice(0, MAX_FILES);
    if (small.length < picked.length) renderPicker('5MB가 넘는 캡처는 뺐어요');
    else if (picked.length > MAX_FILES) renderPicker(`캡처는 ${MAX_FILES}장까지만 올릴 수 있어요`);
    else renderPicker();
  });

  const previews = files.map((file) =>
    el('div', { class: 'col' }, el('img', { src: URL.createObjectURL(file), alt: file.name, class: 'img-fluid rounded border preview-img' })));

  const drop = el('label', { class: 'drop-zone d-block text-center p-4 mb-3', for: 'file-input' },
    el('div', { class: 'fs-1' }, '📷'),
    el('div', { class: 'fw-semibold' }, '결제내역 캡처를 골라 주세요'),
    el('div', { class: 'small text-muted' }, `은행·카드 앱 화면 캡처 · 최대 ${MAX_FILES}장 · 이름, 카드번호는 가려 주세요`));

  const readBtn = el('button', { class: 'btn btn-primary w-100', type: 'button', disabled: files.length === 0, onclick: readCaptures },
    files.length ? `내역 정리하기 (${files.length}장)` : '내역 정리하기');

  section.replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('1. 캡처 고르기'),
      errorBox(errorMessage),
      input, drop,
      previews.length ? el('div', { class: 'row row-cols-3 row-cols-md-5 g-2 mb-3' }, previews) : '',
      readBtn));
}

async function readCaptures(event) {
  const button = event.currentTarget;
  button.disabled = true;
  button.replaceChildren(el('span', { class: 'spinner-border spinner-border-sm me-2' }), '영수증 정리하는 중...');

  try {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    const { items } = await api('POST', '/api/scans', form);
    if (items.length === 0) {
      renderPicker('캡처에서 거래를 찾지 못했어요. 결제내역이 잘 보이는 캡처로 다시 해 주세요');
      return;
    }
    renderReview(items.map((item) => ({ ...item, splitCount: 1, aiCategory: item.category })));
  } catch (error) {
    renderPicker(error.message);
  }
}

function renderRow(item, onRemove) {
  const share = el('div', { class: 'fw-bold' });
  const shareNote = el('div', { class: 'small text-muted' });
  function updateShare() {
    share.textContent = won(Math.round(item.amount / item.splitCount));
    shareNote.textContent = item.splitCount > 1 ? `${won(item.amount)} ÷ ${item.splitCount}명` : '';
  }
  updateShare();

  const merchant = el('input', { class: 'form-control form-control-sm', value: item.merchant, maxLength: 100, 'aria-label': '가게 이름' });
  merchant.addEventListener('input', () => { item.merchant = merchant.value; });

  const date = el('input', { type: 'date', class: 'form-control form-control-sm', value: item.date, 'aria-label': '날짜' });
  date.addEventListener('input', () => { item.date = date.value; });

  const amount = el('input', { type: 'number', min: 1, class: 'form-control form-control-sm', value: item.amount, 'aria-label': '결제 금액' });
  amount.addEventListener('input', () => {
    item.amount = Math.round(Number(amount.value)) || 0;
    updateShare();
  });

  const split = el('input', { type: 'number', min: 1, max: MAX_SPLIT, value: 1, class: 'form-control form-control-sm split-input', 'aria-label': '더치페이 사람 수' });
  split.addEventListener('input', () => {
    item.splitCount = Math.min(MAX_SPLIT, Math.max(1, Math.round(Number(split.value)) || 1));
    updateShare();
  });

  const select = el('select', { class: 'form-select form-select-sm', 'aria-label': '카테고리' },
    categories.map((c) => el('option', { value: c.name, selected: c.name === item.category }, c.name)));
  select.addEventListener('change', () => { item.category = select.value; });

  const source = item.categorySource === 'rule'
    ? el('span', { class: 'badge text-bg-success-subtle text-success-emphasis' }, '기억한 분류')
    : el('span', { class: 'badge text-bg-primary-subtle text-primary-emphasis' }, 'AI 분류');

  const remove = el('button', { class: 'btn btn-sm btn-link text-danger p-0', type: 'button', 'aria-label': '이 거래 빼기' }, '빼기');
  const row = el('li', { class: 'list-group-item px-0 py-3' },
    el('div', { class: 'd-flex justify-content-between align-items-start mb-2' },
      el('div', { class: 'd-flex align-items-center gap-2' }, source, remove),
      el('div', { class: 'text-end' }, share, shareNote)),
    el('div', { class: 'row g-2 align-items-center' },
      el('div', { class: 'col-12' }, merchant),
      el('div', { class: 'col-6' }, date),
      el('div', { class: 'col-6' }, amount),
      el('div', { class: 'col-7' }, select),
      el('div', { class: 'col-5 d-flex align-items-center gap-1' }, split, el('span', { class: 'small text-muted text-nowrap' }, '명 더치'))));
  remove.addEventListener('click', () => {
    row.remove();
    onRemove();
  });
  return row;
}

function toSavePayload(item) {
  return {
    date: item.date,
    merchant: item.merchant.trim(),
    amount: Math.round(item.amount / item.splitCount),
    originalAmount: item.amount,
    splitCount: item.splitCount,
    category: item.category,
    accountId: null,
    isExpense: isExpense(item.category),
    categoryEdited: item.category !== item.aiCategory,
  };
}

function renderReview(initialItems) {
  let items = initialItems;
  const message = el('div', { class: 'mt-3' });
  const saveBtn = el('button', { class: 'btn btn-primary w-100 mt-3', type: 'button' });

  function updateSaveButton() {
    saveBtn.textContent = `${items.length}건 저장하기`;
    saveBtn.disabled = items.length === 0;
  }
  updateSaveButton();

  const rows = items.map((item) => renderRow(item, () => {
    items = items.filter((x) => x !== item);
    updateSaveButton();
  }));

  saveBtn.addEventListener('click', async () => {
    if (items.some((item) => !item.merchant.trim() || !item.date || item.amount <= 0)) {
      message.replaceChildren(errorBox('가게 이름, 날짜, 금액을 모두 채워 주세요'));
      return;
    }

    saveBtn.disabled = true;
    try {
      const { saved } = await api('POST', '/api/transactions', { items: items.map(toSavePayload) });
      message.replaceChildren(el('div', { class: 'alert alert-success mb-0' },
        `${saved}건 저장했어요! `, el('a', { href: '/transactions.html' }, '내역 보러 가기')));
    } catch (error) {
      message.replaceChildren(errorBox(error.message));
      updateSaveButton();
    }
  });

  section.replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('2. 읽은 내용 확인하기'),
      el('p', { class: 'small text-muted' }, 'AI가 틀릴 수 있어요. 금액과 가게 이름을 확인해 주세요. 고친 분류는 기억했다가 다음부터 자동으로 적용해요.'),
      el('ul', { class: 'list-group list-group-flush' }, rows),
      saveBtn, message,
      el('button', { class: 'btn btn-link w-100 mt-2', type: 'button', onclick: () => { files = []; renderPicker(); } }, '다른 캡처 올리기')));
}

try {
  categories = await api('GET', '/api/categories');
  renderPicker();
} catch (error) {
  section.replaceChildren(errorBox(error.message));
}
