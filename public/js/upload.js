// F2 캡처 올리기 화면 — 담당: 박영웅
// 지금은 "AI로 읽기"를 누르면 mock.js 예시 결과를 보여 줘요. POST /api/scans를 만들면 api()로 바꿔요.
import { won } from './api.js';
import { el, mockBadge, cardTitle } from './ui.js';
import { mockCategories, mockScanResult } from './mock.js';

const MAX_FILES = 5;
const section = document.getElementById('upload-section');
let files = [];

function renderPicker() {
  const input = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true, class: 'd-none', id: 'file-input' });
  input.addEventListener('change', () => {
    files = [...input.files].slice(0, MAX_FILES);
    renderPicker();
  });

  const previews = files.map((file) =>
    el('div', { class: 'col' }, el('img', { src: URL.createObjectURL(file), alt: file.name, class: 'img-fluid rounded border preview-img' })));

  const drop = el('label', { class: 'drop-zone d-block text-center p-4 mb-3', for: 'file-input' },
    el('div', { class: 'fs-1' }, '📷'),
    el('div', { class: 'fw-semibold' }, '결제내역 캡처를 골라 주세요'),
    el('div', { class: 'small text-muted' }, `은행·카드 앱 화면 캡처 · 최대 ${MAX_FILES}장 · 이름, 카드번호는 가려 주세요`));

  const readBtn = el('button', { class: 'btn btn-primary w-100', type: 'button', disabled: files.length === 0, onclick: readCaptures },
    files.length ? `AI로 읽기 (${files.length}장)` : 'AI로 읽기');

  section.replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('1. 캡처 고르기', mockBadge()),
      input, drop,
      previews.length ? el('div', { class: 'row row-cols-3 row-cols-md-5 g-2 mb-3' }, previews) : '',
      readBtn));
}

async function readCaptures(event) {
  const button = event.currentTarget;
  button.disabled = true;
  button.replaceChildren(el('span', { class: 'spinner-border spinner-border-sm me-2' }), 'AI가 읽는 중...');
  await new Promise((resolve) => setTimeout(resolve, 1200));
  renderReview(mockScanResult.map((item) => ({ ...item, splitCount: 1 })));
}

function renderReview(items) {
  const rows = items.map((item) => {
    const share = el('div', { class: 'fw-bold' }, won(item.amount));
    const shareNote = el('div', { class: 'small text-muted' });

    const split = el('input', { type: 'number', min: 1, max: 20, value: 1, class: 'form-control form-control-sm split-input', 'aria-label': '더치페이 사람 수' });
    split.addEventListener('input', () => {
      item.splitCount = Math.max(1, Number(split.value) || 1);
      const mine = Math.round(item.amount / item.splitCount);
      share.textContent = won(mine);
      shareNote.textContent = item.splitCount > 1 ? `${won(item.amount)} ÷ ${item.splitCount}명` : '';
    });

    const select = el('select', { class: 'form-select form-select-sm', 'aria-label': '카테고리' },
      mockCategories.map((c) => el('option', { value: c, selected: c === item.category }, c)));
    select.addEventListener('change', () => { item.category = select.value; });

    const source = item.categorySource === 'rule'
      ? el('span', { class: 'badge text-bg-success-subtle text-success-emphasis' }, '기억한 분류')
      : el('span', { class: 'badge text-bg-primary-subtle text-primary-emphasis' }, 'AI 분류');

    return el('li', { class: 'list-group-item px-0 py-3' },
      el('div', { class: 'd-flex justify-content-between align-items-start mb-2' },
        el('div', {},
          el('div', { class: 'fw-semibold' }, item.merchant, ' ', source),
          el('div', { class: 'small text-muted' }, item.date)),
        el('div', { class: 'text-end' }, share, shareNote)),
      el('div', { class: 'row g-2 align-items-center' },
        el('div', { class: 'col-7' }, select),
        el('div', { class: 'col-5 d-flex align-items-center gap-1' }, split, el('span', { class: 'small text-muted text-nowrap' }, '명 더치'))));
  });

  const saved = el('div', { class: 'alert alert-success d-none mt-3 mb-0' },
    '저장했어요! (예시라 실제로 저장되지는 않아요) ', el('a', { href: '/transactions.html' }, '내역 보러 가기'));

  const saveBtn = el('button', { class: 'btn btn-primary w-100 mt-3', type: 'button' }, `${items.length}건 저장하기`);
  saveBtn.addEventListener('click', () => {
    saveBtn.disabled = true;
    saved.classList.remove('d-none');
  });

  section.replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('2. 읽은 내용 확인하기', mockBadge()),
      el('p', { class: 'small text-muted' }, '틀린 카테고리는 고쳐 주세요. 고친 분류는 기억했다가 다음부터 자동으로 적용해요.'),
      el('ul', { class: 'list-group list-group-flush' }, rows),
      saveBtn, saved,
      el('button', { class: 'btn btn-link w-100 mt-2', type: 'button', onclick: () => { files = []; renderPicker(); } }, '다른 캡처 올리기')));
}

renderPicker();
