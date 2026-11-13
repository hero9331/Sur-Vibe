// F6 청년 정책·대안 추천 — 담당: 1학년 D (recommendations-section 안만 고쳐요)
// 설명서: docs/guides/D-recommendations.md
// GET /api/recommendations 결과로 추천 카드를 그려요.
import { api, won } from './api.js';
import { el, cardTitle } from './ui.js';

const REASON = {
  most: '이번 달 가장 많이 썼어요',
  increased: '지난달보다 많이 늘었어요',
};

const TYPE_LABEL = {
  policy: '청년 정책',
  tip: '절약 팁',
};

const section = document.getElementById('recommendations-section');

// 한국 시간 기준 이번 달 ("2026-11")
function currentMonth() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 7);
}

function diffText(diff) {
  if (diff > 0) return `지난달보다 +${won(diff)}`;
  if (diff < 0) return `지난달보다 -${won(-diff)}`;
  return '지난달과 같아요';
}

// 카드 한 장 안에 제목과 내용을 넣어서 보여 줘요.
function show(...children) {
  section.replaceChildren(el('div', { class: 'card p-4' }, cardTitle('이렇게 아껴 보세요'), ...children));
}

function message(text, ...extra) {
  return el('p', { class: 'text-muted mb-0' }, text, ...extra);
}

// 왜 이 분야를 골랐는지 보여 주는 칸
function targetChip(target) {
  return el('div', { class: 'col' },
    el('div', { class: 'border rounded p-3 h-100' },
      el('div', { class: 'fw-bold' }, target.category),
      el('div', { class: 'small text-muted' }, REASON[target.reason]),
      el('div', { class: 'small' }, `${won(target.amount)} · ${diffText(target.diff)}`)));
}

// 출처 링크는 https 주소일 때만 만들어요. 절약 팁은 링크가 없어요.
function detailLink(item) {
  if (!String(item.url || '').startsWith('https://')) return null;
  return el('a', {
    class: 'small mt-2 d-inline-block',
    href: item.url,
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-label': `${item.title} 자세히 보기 (새 창)`,
  }, '자세히 보기');
}

function itemCard(item) {
  const isPolicy = item.type === 'policy';
  return el('div', { class: 'col' },
    el('div', { class: 'card recommend-card h-100 p-3' },
      el('div', { class: 'd-flex gap-2 mb-2' },
        el('span', { class: `badge ${isPolicy ? 'text-bg-primary' : 'text-bg-secondary'}` }, TYPE_LABEL[item.type]),
        el('span', { class: 'badge text-bg-light border' }, item.category)),
      el('div', { class: 'fw-bold mb-1' }, item.title),
      el('div', { class: 'small text-muted' }, item.description),
      detailLink(item)));
}

function render({ targets, items }) {
  if (targets.length === 0) {
    show(message('내역이 쌓이면 추천해 드려요. ', el('a', { href: '/upload.html' }, '결제내역 캡처 올리기')));
    return;
  }

  const chips = el('div', { class: 'row row-cols-1 row-cols-sm-2 g-2 mb-3' }, targets.map(targetChip));
  if (items.length === 0) {
    show(chips, message('이 분야는 아직 준비된 추천이 없어요.'));
    return;
  }
  show(chips, el('div', { class: 'row row-cols-1 row-cols-md-2 g-2' }, items.map(itemCard)));
}

async function load() {
  show(message('추천을 불러오는 중이에요.'));
  try {
    render(await api('GET', `/api/recommendations?month=${currentMonth()}`));
  } catch {
    show(message('추천을 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.'));
  }
}

load();
