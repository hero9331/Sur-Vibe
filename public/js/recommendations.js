// F6 청년 정책·대안 추천 — 담당: 1학년 D (recommendations-section 안만 고쳐요)
// 설명서: docs/guides/D-recommendations.md
// 지금은 mock.js 예시 데이터예요. GET /api/recommendations를 만들면 api()로 바꾸세요.
import { won } from './api.js';
import { el, mockBadge, cardTitle } from './ui.js';
import { mockRecommendations } from './mock.js';

const REASON = {
  most: '이번 달 가장 많이 썼어요',
  increased: '지난달보다 많이 늘었어요',
};

function render() {
  const { targets, items } = mockRecommendations;

  const targetChips = targets.map((t) =>
    el('div', { class: 'col' },
      el('div', { class: 'border rounded p-3 h-100' },
        el('div', { class: 'fw-bold' }, t.category),
        el('div', { class: 'small text-muted' }, REASON[t.reason]),
        el('div', { class: 'small' }, `${won(t.amount)} · 지난달보다 +${won(t.diff)}`))));

  const cards = items.map((item) =>
    el('div', { class: 'col' },
      el('div', { class: 'card recommend-card h-100 p-3' },
        el('div', { class: 'd-flex gap-2 mb-2' },
          el('span', { class: `badge ${item.type === 'policy' ? 'text-bg-primary' : 'text-bg-secondary'}` }, item.type === 'policy' ? '청년 정책' : '절약 팁'),
          el('span', { class: 'badge text-bg-light border' }, item.category)),
        el('div', { class: 'fw-bold mb-1' }, item.title),
        el('div', { class: 'small text-muted' }, item.description))));

  document.getElementById('recommendations-section').replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('이렇게 아껴 보세요', mockBadge()),
      el('div', { class: 'row row-cols-2 g-2 mb-3' }, targetChips),
      el('div', { class: 'row row-cols-1 row-cols-md-2 g-2' }, cards)));
}

render();
