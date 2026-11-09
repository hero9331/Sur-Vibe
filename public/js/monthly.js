// F5 월별 보기 — 담당: 1학년 C (monthly-section 안만 고쳐요)
// 설명서: docs/guides/C-summary.md
// 지금은 mock.js 예시 데이터예요. GET /api/summary/monthly를 만들면 api()로 바꾸세요.
import { won } from './api.js';
import { el, mockBadge, cardTitle } from './ui.js';
import { mockPrevMonth, mockTransactions } from './mock.js';

function summarize() {
  const totals = {};
  for (const t of mockTransactions) {
    if (!t.isExpense) continue;
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  const categories = new Set([...Object.keys(totals), ...Object.keys(mockPrevMonth)]);
  const byCategory = [...categories]
    .map((category) => {
      const amount = totals[category] || 0;
      const prevAmount = mockPrevMonth[category] || 0;
      return { category, amount, prevAmount, diff: amount - prevAmount };
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = byCategory.reduce((s, c) => s + c.amount, 0);
  const prevTotal = Object.values(mockPrevMonth).reduce((s, v) => s + v, 0);
  return { total, prevTotal, byCategory };
}

function diffText(diff) {
  if (diff > 0) return el('span', { class: 'diff-up' }, `▲ ${won(diff)}`);
  if (diff < 0) return el('span', { class: 'diff-down' }, `▼ ${won(-diff)}`);
  return el('span', { class: 'text-muted' }, '변화 없음');
}

function render() {
  const s = summarize();
  const max = Math.max(...s.byCategory.map((c) => c.amount));

  // 카테고리별 가로 막대 (한 가지 색, 금액이 큰 순서)
  const bars = s.byCategory.map((c) => {
    const fill = el('div', { class: 'bar-fill' });
    fill.style.width = `${(c.amount / max) * 100}%`;
    return el('div', { class: 'bar-row', role: 'listitem', title: `${c.category} ${won(c.amount)} (지난달 ${won(c.prevAmount)})` },
      el('div', { class: 'bar-label' }, c.category),
      el('div', { class: 'bar-track' }, fill),
      el('div', { class: 'bar-value' }, won(c.amount), el('div', { class: 'small' }, diffText(c.diff))));
  });

  const totalDiff = s.total - s.prevTotal;
  const header = el('div', { class: 'd-flex justify-content-between align-items-end mb-3' },
    el('div', {},
      el('div', { class: 'small text-muted' }, '이번 달 지출 (11월 6일까지)'),
      el('div', { class: 'fs-3 fw-bold' }, won(s.total))),
    el('div', { class: 'text-end small' },
      el('div', { class: 'text-muted' }, `지난달 ${won(s.prevTotal)}`),
      diffText(totalDiff)));

  document.getElementById('monthly-section').replaceChildren(
    el('div', { class: 'card p-4' },
      cardTitle('2026년 11월 카테고리별 지출', mockBadge()),
      header,
      el('div', { class: 'bar-chart', role: 'list', 'aria-label': '카테고리별 지출' }, bars),
      el('p', { class: 'small text-muted mt-3 mb-0' }, '▲ 지난달보다 늘어남 · ▼ 지난달보다 줄어듦')));
}

render();
