// F5 월별 보기 — 담당: 1학년 C (monthly-section 안만 고쳐요)
// 설명서: docs/guides/C-summary.md
// GET /api/summary/monthly로 이번 달 카테고리별 지출과 지난달 비교를 불러와요.
import { api, won } from './api.js';
import { el, cardTitle } from './ui.js';

const section = document.getElementById('monthly-section');

// 한국 시간 기준 오늘 "2026-11-19"
function kstToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function diffText(diff) {
  if (diff > 0) return el('span', { class: 'diff-up' }, `▲ ${won(diff)}`);
  if (diff < 0) return el('span', { class: 'diff-down' }, `▼ ${won(-diff)}`);
  return el('span', { class: 'text-muted' }, '변화 없음');
}

// 카테고리별 가로 막대 (한 가지 색, 금액이 큰 순서)
function barChart(byCategory) {
  const max = Math.max(...byCategory.map((c) => c.amount));
  const bars = byCategory.map((c) => {
    const fill = el('div', { class: 'bar-fill' });
    fill.style.width = `${(c.amount / max) * 100}%`;
    return el('div', { class: 'bar-row', role: 'listitem', title: `${c.category} ${won(c.amount)} (지난달 ${won(c.prevAmount)})` },
      el('div', { class: 'bar-label' }, c.category),
      el('div', { class: 'bar-track' }, fill),
      el('div', { class: 'bar-value' }, won(c.amount), el('div', { class: 'small' }, diffText(c.diff))));
  });
  return el('div', { class: 'bar-chart', role: 'list', 'aria-label': '카테고리별 지출' }, bars);
}

function totalHeader(s, today) {
  const [, mon, day] = today.split('-').map(Number);
  return el('div', { class: 'd-flex justify-content-between align-items-end mb-3' },
    el('div', {},
      el('div', { class: 'small text-muted' }, `이번 달 지출 (${mon}월 ${day}일까지)`),
      el('div', { class: 'fs-3 fw-bold' }, won(s.total))),
    el('div', { class: 'text-end small' },
      el('div', { class: 'text-muted' }, `지난달 ${won(s.prevTotal)}`),
      diffText(s.total - s.prevTotal)));
}

function monthlyCard(s, today) {
  const [year, mon] = s.month.split('-').map(Number);
  const title = cardTitle(`${year}년 ${mon}월 카테고리별 지출`);

  if (s.byCategory.length === 0) {
    return el('div', { class: 'card p-4' }, title,
      el('p', { class: 'text-muted mb-0' }, '아직 내역이 없어요. 결제내역 캡처를 올리면 여기에 그래프가 생겨요.'));
  }
  return el('div', { class: 'card p-4' },
    title,
    totalHeader(s, today),
    barChart(s.byCategory),
    el('p', { class: 'small text-muted mt-3 mb-0' }, '▲ 지난달보다 늘어남 · ▼ 지난달보다 줄어듦'));
}

async function render() {
  section.replaceChildren(el('p', { class: 'text-muted' }, '불러오는 중이에요...'));
  const today = kstToday();
  try {
    const summary = await api('GET', `/api/summary/monthly?month=${today.slice(0, 7)}`);
    section.replaceChildren(monthlyCard(summary, today));
  } catch (err) {
    section.replaceChildren(el('div', { class: 'alert alert-danger' },
      `월별 지출을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요. (${err.message})`));
  }
}

render();
