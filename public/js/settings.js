// F1 계좌·카드, F4 예산 설정 화면 — 담당: 1학년 A
// 설명서: docs/guides/A-accounts-settings.md / API 형식: docs/API.md
// 디자인 시안: public/css/settings.css (이 화면에서만 써요)
// 화면 순서: 내 정보 → 한 달 예산 → 고정비 → 고정지출 예상 → 알림 → 자산(은행·페이머니·카드) → 계정(로그아웃·탈퇴) → 디자인 시안(회의용)
// 추가·수정은 모두 아래에서 올라오는 시트(Bootstrap 모달)에서 하고, 누르는 즉시 서버에 저장해요.
import { api, won, logout } from './api.js';
import { el } from './ui.js';

const BANKS = ['토스뱅크', '카카오뱅크', '신한은행', 'KB국민은행', '우리은행', '하나은행', 'NH농협은행', 'IBK기업은행', '케이뱅크', '새마을금고', 'SBI저축은행', 'OK저축은행', '웰컴저축은행'];
const PAYS = ['카카오페이', '네이버페이', '토스페이', '페이코', '쿠페이'];
const CARDS = ['신한카드', '삼성카드', '현대카드', 'KB국민카드', '우리카드', '하나카드', '롯데카드', 'BC카드', 'NH농협카드'];
const PURPOSES = ['생활비', '저축', '비상금', '고정비 자동이체'];

// 자산 종류. 페이머니는 번호가 없고, 이자율은 은행만 넣어요.
const ASSET_TYPES = {
  bank: { label: '은행', options: BANKS, company: '은행', placeholder: '예: 생활비 통장', number: '계좌번호', balance: true, rate: true },
  pay: { label: '페이머니', options: PAYS, company: '페이', placeholder: '예: 카카오페이 머니', number: null, balance: true, rate: false },
  card: { label: '카드', options: CARDS, company: '카드사', placeholder: '예: 체크카드', number: '카드번호', balance: false, rate: false },
};
const TYPE_ORDER = ['bank', 'pay', 'card'];
const typeOf = (type) => ASSET_TYPES[type] ?? ASSET_TYPES.bank;
const FIXED_CATEGORIES = ['구독', '생활', '교통', '학업', '문화·여가', '쇼핑', '기타'];
const SUGGEST_MONTHS = 2; // 고정지출 예상에 쓰는 기간 (지난 몇 달)
const ALERT_DAYS = [1, 3, 7];

// 회의용 포인트 색 시안. 정하고 나면 이 목록과 "디자인 시안" 칸을 지워요.
const THEMES = [
  { id: 'lime', label: '라임', swatch: '#bae637' },
  { id: 'green', label: '그린', swatch: '#1f5c46' },
  { id: 'blue', label: '블루', swatch: '#1b64da' },
];
const THEME_KEY = 'budget.settingsTheme';

// 고정비 아이콘: 이름에 맞는 게 있으면 그걸, 없으면 카테고리 아이콘. 모두 한 톤 선 아이콘이에요.
// [이름 규칙, 아이콘, 어울리는 카테고리]
const ICON_RULES = [
  [/gpt|chatgpt|claude|클로드|gemini|제미나이|뤼튼|copilot/i, 'sparkle', '구독'],
  [/유튜브|youtube/i, 'play', '구독'],
  [/넷플릭스|netflix|티빙|tving|웨이브|wavve|디즈니|disney|왓챠|watcha|쿠팡플레이/i, 'tv', '구독'],
  [/멜론|melon|스포티파이|spotify|지니뮤직|벅스|플로|애플뮤직/i, 'music', '구독'],
  [/icloud|아이클라우드|구글 ?원|google one|드롭박스|dropbox/i, 'cloud', '구독'],
  [/쿠팡 ?와우|멤버십|네이버 ?플러스|배민클럽/i, 'bag', '구독'],
  [/통신|휴대폰|핸드폰|skt|sk텔레콤|\bkt\b|lg ?u\+|유플러스|알뜰폰|요금제/i, 'phone', '생활'],
  [/월세|관리비|전세|기숙사|집세/i, 'home', '생활'],
  [/전기|가스|수도|공과금/i, 'bulb', '생활'],
  [/보험/, 'shield', '생활'],
  [/정기권|티머니|교통카드/, 'card', '교통'],
  [/지하철|기후동행|ktx|기차|코레일/i, 'train', '교통'],
  [/버스|택시|교통/, 'bus', '교통'],
  [/헬스|필라테스|요가|운동|gym/i, 'dumbbell', '문화·여가'],
  [/학원|인강|스터디|토익|교재/, 'book', '학업'],
];
const CATEGORY_ICON = {
  구독: 'repeat', 생활: 'home', 교통: 'bus', 학업: 'book', '문화·여가': 'ticket', 쇼핑: 'bag', 기타: 'tag',
};
const OTHERS_NAME = { 교통: '그 외 교통비', 생활: '그 외 생활비' };

const state = {
  username: '',
  settings: { monthlyBudget: 0, fixedCosts: [], subscriptionAlert: { enabled: true, daysBefore: 3 } },
  accounts: [],
  suggest: { status: 'loading', data: null },
  showHidden: false,
};

// ── 작은 도우미 ───────────────────────────────────

const fixedTotal = () => state.settings.fixedCosts.reduce((sum, cost) => sum + cost.amount, 0);
const round100 = (amount) => Math.round(amount / 100) * 100;
const manwon = (amount) => `${(amount / 10000).toFixed(1).replace(/\.0$/, '')}만`;

// 받침에 맞는 조사를 붙여요. josa('생활비 통장', '을', '를') → '생활비 통장을'
function josa(word, withBatchim, withoutBatchim) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 > 0;
  return word + (hasBatchim ? withBatchim : withoutBatchim);
}

const categoryIcon = (category) => CATEGORY_ICON[category] ?? 'tag';

function iconFor({ name = '', category, wholeCategory }) {
  const rule = wholeCategory ? null : ICON_RULES.find(([pattern]) => pattern.test(name));
  return rule ? rule[1] : categoryIcon(category);
}

const guessCategory = (name) => ICON_RULES.find(([pattern]) => pattern.test(name))?.[2] ?? null;

// 은행·카드사 이름의 첫 글자 ("토스뱅크" → "토", "KB국민카드" → "K")
// 은행 로고는 회사 상표라서 공개 저장소에 올리지 않고, 이름 첫 글자를 동그라미에 넣어 보여요.
function institutionInitial(name = '') {
  return [...name.trim()][0]?.toUpperCase() ?? '?';
}

// 24×24 선 아이콘. 색은 글자색(currentColor)을 따라가서 테마 색과 한 톤으로 맞아요.
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  chevron: 'M9 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chart: 'M4 20h16M7 16v-5M12 16V6M17 16v-8',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4',
  repeat: 'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
  play: 'M6 4h12a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 18 20H6a3.5 3.5 0 0 1-3.5-3.5v-9A3.5 3.5 0 0 1 6 4zM10 9l5 3-5 3z',
  tv: 'M4 7h16a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 4 7zM8 3l4 4 4-4',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  sparkle: 'M11 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 3v4M17 5h4',
  cloud: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z',
  bag: 'M5 8h14l-1.2 12.1A1.5 1.5 0 0 1 16.3 21.5H7.7a1.5 1.5 0 0 1-1.5-1.4zM9 8V6.5a3 3 0 0 1 6 0V8',
  phone: 'M8 2.5h8A1.5 1.5 0 0 1 17.5 4v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM11 18.5h2',
  home: 'M3 10.5L12 3l9 7.5M5.5 9v11.5h13V9M10 20.5v-6h4v6',
  bulb: 'M9 16.5h6M10 20h4M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.3v1.4h6v-1.4c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3z',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z',
  bus: 'M6 3.5h12A1.5 1.5 0 0 1 19.5 5v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 17V5A1.5 1.5 0 0 1 6 3.5zM4.5 11h15M8 18.5V21M16 18.5V21M8 14.5h.01M16 14.5h.01',
  train: 'M7 3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM4 11h16M9 18l-2 3M15 18l2 3M8.5 14.5h.01M15.5 14.5h.01',
  card: 'M4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11A1.5 1.5 0 0 1 4.5 5zM3 10h18M7 15h4',
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11',
  book: 'M3 5h5.5A3.5 3.5 0 0 1 12 8.5V20a2.5 2.5 0 0 0-2.5-2.5H3zM21 5h-5.5A3.5 3.5 0 0 0 12 8.5V20a2.5 2.5 0 0 1 2.5-2.5H21z',
  ticket: 'M5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4V7.5A1.5 1.5 0 0 1 5 6zM14 6v2M14 11v2M14 16v2',
  tag: 'M3 11.6V4.5A1.5 1.5 0 0 1 4.5 3h7.1a1.5 1.5 0 0 1 1 .4l8 8a1.5 1.5 0 0 1 0 2.1l-7.1 7.1a1.5 1.5 0 0 1-2.1 0l-8-8a1.5 1.5 0 0 1-.4-1zM8 8h.01',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5',
  bank: 'M3.5 9L12 4l8.5 5zM6 12v5M10 12v5M14 12v5M18 12v5M3.5 20h17',
  user: 'M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
};

function icon(name, extraClass = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `icon ${extraClass}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

let toastTimer;
const hideToast = () => document.getElementById('toast').classList.remove('show');

// action을 주면 "되돌리기" 같은 버튼이 붙고 조금 더 오래 보여요.
function toast(message, action) {
  const box = document.getElementById('toast');
  const button = action
    ? el('button', { class: 'set-toast-action', type: 'button', onclick: () => { hideToast(); action.onClick(); } }, action.label)
    : null;
  box.replaceChildren(...[el('span', {}, message), button].filter(Boolean));
  box.classList.toggle('has-action', Boolean(action));
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 5000 : 2400);
}

// 흰 둥근 카드. children 안에 배열이 섞여 있어도 펴서 넣어요.
function card({ title, extra, children }) {
  const head = title
    ? el('div', { class: 's-card-head' }, el('h2', { class: 's-card-title' }, title), extra ? el('span', { class: 's-card-extra' }, extra) : null)
    : null;
  return el('div', { class: 's-card' }, head, [children].flat(Infinity));
}

// 목록 한 줄. onClick이 있으면 누를 수 있는 줄(오른쪽 > 표시), 없으면 보기만 하는 줄이에요.
// action에는 버튼이 들어갈 수 있어서, 누를 수 있는 줄에는 action 대신 value만 써요. (버튼 안에 버튼 금지)
function row({ lead, title, sub, value, action, onClick, chevron = true }) {
  const parts = [
    lead,
    el('span', { class: 's-row-main' },
      el('span', { class: 's-row-title' }, title),
      sub ? el('span', { class: 's-row-sub' }, sub) : null),
    value ? el('span', { class: 's-row-value' }, value) : null,
    action,
  ];
  if (!onClick) return el('li', {}, el('div', { class: 's-row' }, parts));
  return el('li', {}, el('button', { class: 's-row', type: 'button', onclick: onClick }, parts, chevron ? icon('chevron', 's-chevron') : null));
}

// 줄 맨 앞 동그라미 아이콘 (테마 색 한 톤)
const iconLead = (name) => el('span', { class: 's-lead is-icon', 'aria-hidden': 'true' }, icon(name));

// 계좌 줄 맨 앞: 테마 색 동그라미 안에 은행 이름 첫 글자
function institutionBadge(name, type) {
  const label = `${name} ${typeOf(type).label}`;
  return el('span', { class: 's-lead s-bank', role: 'img', 'aria-label': label }, institutionInitial(name));
}

// 고르는 버튼 안의 작은 동그라미
function chipLogo(name) {
  return el('span', { class: 'chip-mark', 'aria-hidden': 'true' }, institutionInitial(name));
}

function addRow(text, onClick) {
  return el('li', {}, el('button', { class: 's-row s-row-add', type: 'button', onclick: onClick },
    el('span', { class: 's-lead is-add' }, icon('plus')),
    el('span', { class: 's-row-main' }, el('span', { class: 's-row-title' }, text))));
}

function note(text, { warn = false, iconName = 'info' } = {}) {
  return el('p', { class: `s-note${warn ? ' is-warn' : ''}` }, icon(iconName, 'icon-sm'), el('span', {}, text));
}

const foot = (text) => el('p', { class: 's-foot' }, icon('info', 'icon-sm'), text);

function chip(text, onClick, tone = '') {
  return el('button', { class: `chip ${tone}`.trim(), type: 'button', onclick: onClick }, text);
}

// ── 날짜 (구독 알림) ──────────────────────────────

const DAY_MS = 86400000;
const startOfToday = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); };
const daysBetween = (from, to) => Math.round((to - from) / DAY_MS);
const monthDay = (date) => `${date.getMonth() + 1}월 ${date.getDate()}일`;
const dueText = (days) => (days === 0 ? '오늘' : days === 1 ? '내일' : `${days}일 뒤`);

// 매달 day일 중 오늘이거나 오늘 뒤인 첫 결제일 (31일이 없는 달은 그 달 마지막 날)
function nextBillingDate(day, today) {
  const make = (year, month) => new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
  const thisMonth = make(today.getFullYear(), today.getMonth());
  return thisMonth >= today ? thisMonth : make(today.getFullYear(), today.getMonth() + 1);
}

// 결제일을 넣은 구독을 가까운 순서로
function upcomingSubscriptions() {
  const today = startOfToday();
  return state.settings.fixedCosts
    .filter((cost) => cost.category === '구독' && cost.billingDay)
    .map((cost) => {
      const date = nextBillingDate(cost.billingDay, today);
      return { cost, date, daysLeft: daysBetween(today, date) };
    })
    .sort((a, b) => a.date - b.date);
}

// 알림 기간 안에 있는 구독이면 "2일 뒤 결제" 표시
function dueBadge(cost) {
  const { enabled, daysBefore } = state.settings.subscriptionAlert;
  if (!enabled || cost.category !== '구독' || !cost.billingDay) return null;
  const daysLeft = daysBetween(startOfToday(), nextBillingDate(cost.billingDay, startOfToday()));
  return daysLeft <= daysBefore ? el('span', { class: 's-due' }, `${dueText(daysLeft)} 결제`) : null;
}

// ── 시트 (추가·수정 창) ───────────────────────────

const sheetEl = document.getElementById('sheet');
const sheet = bootstrap.Modal.getOrCreateInstance(sheetEl);
let submitSheet = null;
let sheetOpener = null; // 시트를 연 버튼. 닫히면 포커스를 여기로 돌려줘요 (키보드·화면 읽기 사용자)

function showSheetError(message) {
  document.getElementById('sheet-error').textContent = message;
}

// task가 false를 돌려주면(입력 확인 실패) 시트를 닫지 않아요.
async function runInSheet(task) {
  const buttons = [...sheetEl.querySelectorAll('.modal-footer .btn')];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    if ((await task()) !== false) sheet.hide();
  } catch (err) {
    showSheetError(err.message);
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

// 지우기는 실수하기 쉬워서 두 번 눌러야 지워져요.
function deleteButton(onDelete) {
  const button = el('button', { class: 'btn btn-lg s-btn-delete', type: 'button' }, '삭제');
  button.addEventListener('click', () => {
    if (button.classList.contains('armed')) {
      runInSheet(onDelete);
      return;
    }
    button.classList.add('armed');
    button.textContent = '정말 삭제';
    showSheetError('한 번 더 누르면 지워져요');
  });
  return button;
}

const setSheetFooter = (...buttons) => document.getElementById('sheet-footer').replaceChildren(...buttons.filter(Boolean));
const closeButton = (label) => el('button', { class: 'btn btn-primary btn-lg flex-grow-1', type: 'button', 'data-bs-dismiss': 'modal' }, label);

// danger: 빨간 확인 버튼(탈퇴처럼 되돌릴 수 없는 일), cancelLabel: 왼쪽에 닫기 버튼
function openSheet({ title, body, submitLabel = '저장', onSubmit, onDelete, danger = false, cancelLabel }) {
  submitSheet = onSubmit;
  sheetOpener = document.activeElement;
  document.getElementById('sheet-title').textContent = title;
  document.getElementById('sheet-body').replaceChildren(
    el('div', {}, body),
    el('p', { class: 'sheet-error', id: 'sheet-error', role: 'alert' }));
  const save = el('button', { class: `btn ${danger ? 's-btn-danger' : 'btn-primary'} btn-lg flex-grow-1`, type: 'submit' }, submitLabel);
  const cancel = cancelLabel ? el('button', { class: 'btn btn-lg s-btn-quiet', type: 'button', 'data-bs-dismiss': 'modal' }, cancelLabel) : null;
  setSheetFooter(onDelete ? deleteButton(onDelete) : cancel, save);
  sheet.show();
}

document.getElementById('sheet-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (submitSheet) runInSheet(submitSheet);
});

sheetEl.addEventListener('shown.bs.modal', () => sheetEl.querySelector('[data-autofocus]')?.focus());
// 포커스가 시트 안에 남은 채로 닫히면 aria-hidden 경고가 나요. 닫기 시작할 때 포커스를 빼 둬요.
sheetEl.addEventListener('hide.bs.modal', () => {
  if (sheetEl.contains(document.activeElement)) document.activeElement.blur();
});
sheetEl.addEventListener('hidden.bs.modal', () => {
  if (leaveDone) {
    goToLogin(); // 탈퇴한 뒤에는 이 화면에 남을 게 없어요
    return;
  }
  if (sheetOpener?.isConnected) sheetOpener.focus(); // 저장 후 목록이 다시 그려졌으면 연 버튼이 없어요
});

// ── 입력 칸 ──────────────────────────────────────

// 칸 묶음(.mb-4) 안의 오류 문구. "매달 [ ]일"처럼 칸이 한 겹 안에 있어도 찾아요.
const feedbackOf = (control) => control.closest('.mb-4')?.querySelector('.invalid-feedback');

function clearInvalid(control) {
  control.classList.remove('is-invalid');
  feedbackOf(control)?.classList.remove('d-block');
}

function textInput({ id, value = '', max, placeholder, inputMode }) {
  const input = el('input', { id, class: 'form-control', type: 'text', value: value ?? '', maxLength: max, placeholder, inputMode, autocomplete: 'off' });
  input.addEventListener('input', () => clearInvalid(input));
  return input;
}

function field({ label, id, control, help, extra }) {
  return el('div', { class: 'mb-4' },
    el('label', { class: 'form-label', for: id }, label),
    control,
    el('div', { class: 'invalid-feedback' }),
    extra,
    help ? el('div', { class: 'form-text' }, help) : null);
}

// message가 있으면 칸을 빨갛게 하고 그 글을 보여 줘요. 문제없으면 true.
function check(control, message) {
  control.classList.toggle('is-invalid', Boolean(message));
  const feedback = feedbackOf(control);
  if (feedback) {
    feedback.textContent = message;
    feedback.classList.toggle('d-block', Boolean(message));
  }
  return !message;
}

// 금액 칸: 숫자만 받고 쉼표를 찍어 보여 줘요. (최대 9자리)
const digitsOf = (text) => text.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
const formatDigits = (digits) => (digits ? Number(digits).toLocaleString('ko-KR') : '');

function amountField({ id, value, label }) {
  const input = el('input', {
    id, class: 'amount-input', type: 'text', inputMode: 'numeric', autocomplete: 'off', size: 1,
    placeholder: '0', value: formatDigits(String(value || '')), 'aria-label': label,
  });
  // "원"이 숫자 바로 뒤에 붙도록, 안 보이는 같은 글자(data-value)로 칸 너비를 맞춰요. (settings.css .amount-sizer)
  const sizer = el('span', { class: 'amount-sizer' }, input);
  const syncWidth = () => { sizer.dataset.value = input.value || input.placeholder; };
  input.addEventListener('input', () => {
    input.value = formatDigits(digitsOf(input.value));
    syncWidth();
  });
  input.addEventListener('focus', () => input.select());
  syncWidth();
  const wrap = el('div', { class: 'amount-field' }, sizer, el('span', { class: 'amount-unit', 'aria-hidden': 'true' }, '원'));
  wrap.addEventListener('input', () => clearInvalid(wrap));
  wrap.addEventListener('click', () => input.focus()); // 빈 곳을 눌러도 입력할 수 있게
  return {
    input,
    wrap,
    read: () => Number(digitsOf(input.value)) || 0,
    isEmpty: () => digitsOf(input.value) === '',
    set(amount) {
      input.value = formatDigits(String(Math.min(amount, 999999999)));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
  };
}

function segmented({ name, label, value, options, onChange }) {
  return el('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label },
    options.flatMap(([optionValue, text]) => [
      el('input', { class: 'btn-check', type: 'radio', name, id: `${name}-${optionValue}`, value: optionValue, checked: optionValue === value, onchange: () => onChange(optionValue) }),
      el('label', { class: 'btn', for: `${name}-${optionValue}` }, text),
    ]));
}

function switchControl({ id, checked, label, onChange }) {
  const input = el('input', { id, class: 's-switch-input', type: 'checkbox', role: 'switch', checked, 'aria-label': label });
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { class: 's-switch', for: id }, input, el('span', { class: 's-switch-track', 'aria-hidden': 'true' }));
}

// 직접 입력 칸: Enter·"추가"·다른 곳 누르기로 넣고, Esc로 취소해요. 시트의 저장(submit)으로 넘어가지 않게 Enter를 막아요.
function customInput({ placeholder, onDone }) {
  const input = el('input', { class: 'chip-input-field', type: 'text', maxLength: 30, placeholder, 'aria-label': placeholder });
  let done = false; // Enter 뒤에 blur가 또 와도 한 번만 처리해요
  const finish = (text) => {
    if (done) return;
    done = true;
    onDone(text);
  };
  const commit = () => finish(input.value.trim());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); commit(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(''); }
  });
  input.addEventListener('blur', commit);
  const add = el('button', { class: 'chip-input-add', type: 'button', onclick: commit }, '추가');
  return { box: el('span', { class: 'chip-input' }, input, add), input };
}

// 하나만 고르는 버튼 묶음. allowCustom이면 마지막 "+ 직접 입력"으로 목록에 없는 값을 바로 추가해요.
// allowEmpty면 고른 버튼을 한 번 더 눌러 선택을 풀 수 있어요. (용도처럼 안 골라도 되는 칸)
function choiceChips({ options, value = '', onChange, allowCustom = false, allowEmpty = false, label = (option) => option, badge }) {
  let current = value || '';
  const list = [...new Set([...options, current].filter(Boolean))];
  const wrap = el('div', { class: 'chip-row', role: 'radiogroup' });

  const select = (option) => {
    current = allowEmpty && option === current ? '' : option;
    if (current && !list.includes(current)) list.push(current);
    onChange(current);
    render();
  };
  const openCustom = () => {
    const custom = customInput({ placeholder: '직접 입력', onDone: (text) => (text ? select(text) : render()) });
    wrap.lastChild.replaceWith(custom.box);
    custom.input.focus();
  };
  function render() {
    const buttons = list.map((option) => {
      const selected = option === current;
      return el('button', { class: `chip${selected ? ' is-selected' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(selected), onclick: () => select(option) },
        badge ? badge(option) : null, label(option));
    });
    const add = allowCustom ? el('button', { class: 'chip is-add', type: 'button', onclick: openCustom }, icon('plus', 'icon-sm'), '직접 입력') : null;
    wrap.replaceChildren(...buttons, ...(add ? [add] : []));
  }
  render();
  return wrap;
}

// ── 내 정보 ──────────────────────────────────────

function renderProfile() {
  const name = state.username || '나';
  const section = document.getElementById('profile-section');
  section.classList.remove('placeholder-glow');
  section.replaceChildren(
    el('span', { class: 's-avatar', 'aria-hidden': 'true' }, name.slice(0, 1).toUpperCase()),
    el('div', {},
      el('div', { class: 's-profile-name' }, `${name}님`),
      el('div', { class: 's-profile-meta' }, `자산 ${state.accounts.length}개 · 고정비 ${state.settings.fixedCosts.length}개`)));
}

// ── 한 달 예산 ────────────────────────────────────

// 평균을 낸 달이 하나면 "10월에", 여럿이면 "최근 2달 평균"
function spendPeriod(months) {
  return months.length === 1 ? `${Number(months[0].slice(5))}월에` : `최근 ${months.length}달 평균`;
}

function spendNote() {
  const data = state.suggest.data;
  if (!data?.averageMonths.length) return null;
  const budget = state.settings.monthlyBudget;
  const over = budget > 0 && data.averageSpending > budget;
  const text = `${spendPeriod(data.averageMonths)} ${won(data.averageSpending)}을 썼어요`;
  return note(over ? `${text}. 예산보다 ${won(data.averageSpending - budget)} 많아요` : text, { warn: over, iconName: 'chart' });
}

// 예산 막대: 회색은 고정비, 포인트 색은 쓸 수 있는 돈
function budgetBar(budget, fixed) {
  const fixedRate = Math.min(100, (fixed / budget) * 100);
  const fixedPart = el('span', { class: 's-bar-fixed' });
  const freePart = el('span', { class: 's-bar-free' });
  fixedPart.style.width = `${fixedRate}%`;
  freePart.style.width = `${100 - fixedRate}%`;
  return el('div', { class: 's-bar', role: 'img', 'aria-label': `예산 중 고정비 ${Math.round(fixedRate)}%` }, fixedPart, freePart);
}

function legendRow(tone, label, value) {
  return el('div', { class: 's-legend-row' }, el('span', { class: `s-dot ${tone}` }), el('span', {}, label), el('strong', {}, value));
}

function budgetSummary(budget) {
  const fixed = fixedTotal();
  return [
    el('div', { class: 's-budget-amount' }, won(budget)),
    budgetBar(budget, fixed),
    el('div', { class: 's-legend' },
      legendRow('is-fixed', `고정비 ${state.settings.fixedCosts.length}개`, won(fixed)),
      legendRow('is-free', '쓸 수 있는 돈', won(Math.max(0, budget - fixed)))),
    fixed > budget ? note('고정비가 예산보다 많아요. 예산을 늘려 주세요', { warn: true }) : null,
  ];
}

function budgetEmpty() {
  return [
    el('p', { class: 's-empty' }, '예산을 정하면 홈에서 오늘 쓸 수 있는 돈을 알려 드려요'),
    el('button', { class: 'btn btn-primary btn-lg w-100 mt-2', type: 'button', onclick: openBudgetSheet }, '예산 정하기'),
  ];
}

function renderBudget() {
  const budget = state.settings.monthlyBudget;
  const edit = budget
    ? el('button', { class: 's-pill', type: 'button', 'aria-label': '한 달 예산 편집', onclick: openBudgetSheet }, '편집')
    : null;
  document.getElementById('budget-section').replaceChildren(card({
    title: '한 달 예산',
    extra: edit,
    children: [budget ? budgetSummary(budget) : budgetEmpty(), spendNote()],
  }));
}

function budgetPreviewText(budget) {
  const fixed = fixedTotal();
  if (!budget) return '';
  if (budget < fixed) return `고정비 ${won(fixed)}보다 적어요`;
  const now = new Date();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const perDay = won(Math.floor((budget - fixed) / days / 100) * 100);
  return fixed ? `고정비를 빼면 ${won(budget - fixed)}, 하루 약 ${perDay}이에요` : `하루 약 ${perDay}이에요`;
}

function averageChip(amount) {
  const data = state.suggest.data;
  if (!data?.averageSpending) return null;
  const rounded = Math.ceil(data.averageSpending / 10000) * 10000;
  const months = data.averageMonths;
  const label = months.length === 1 ? `${Number(months[0].slice(5))}월만큼` : `최근 ${months.length}달 평균만큼`;
  return chip(`${label} ${won(rounded)}`, () => amount.set(rounded), 'is-brand');
}

function openBudgetSheet() {
  const amount = amountField({ id: 'budget-input', value: state.settings.monthlyBudget, label: '한 달 예산' });
  amount.input.dataset.autofocus = '';
  const preview = el('p', { class: 'sheet-hint' });
  const update = () => {
    const budget = amount.read();
    preview.textContent = budgetPreviewText(budget);
    preview.classList.toggle('is-over', budget > 0 && budget < fixedTotal());
  };
  amount.input.addEventListener('input', update);
  update();
  openSheet({
    title: '한 달 예산',
    body: [
      amount.wrap,
      preview,
      el('div', { class: 'chip-row' },
        [10000, 50000, 100000].map((step) => chip(`+${step / 10000}만`, () => amount.set(amount.read() + step))),
        averageChip(amount)),
    ],
    onSubmit: () => saveSettings({ ...state.settings, monthlyBudget: amount.read() }, '예산을 바꿨어요'),
  });
}

// ── 고정비 ───────────────────────────────────────

// action: 알림에 붙일 버튼 (예: 되돌리기)
async function saveSettings({ monthlyBudget, fixedCosts }, message, action) {
  state.settings = await api('PUT', '/api/settings', { monthlyBudget, fixedCosts });
  renderProfile();
  renderBudget();
  renderFixed();
  renderForecast(); // 추가·빼기 버튼을 바로 바꿔요
  renderAlerts();
  toast(message, action);
  loadSuggestions({ quiet: true }); // 예상 금액도 다시 계산
}

// 바로 전 고정비로 되돌리는 버튼
function undoTo(previous) {
  return { label: '되돌리기', onClick: () => saveSettings({ ...state.settings, fixedCosts: previous }, '되돌렸어요').catch((err) => toast(err.message)) };
}

// 카테고리별로 묶어요. 순서는 FIXED_CATEGORIES 순서
function groupFixed(fixedCosts) {
  const groups = new Map();
  fixedCosts.forEach((cost, index) => {
    const category = cost.category || '기타';
    if (!groups.has(category)) groups.set(category, { category, total: 0, items: [] });
    const group = groups.get(category);
    group.items.push({ cost, index });
    group.total += cost.amount;
  });
  const order = (category) => (FIXED_CATEGORIES.includes(category) ? FIXED_CATEGORIES.indexOf(category) : 99);
  return [...groups.values()].sort((a, b) => order(a.category) - order(b.category));
}

function fixedSub(cost) {
  if (cost.wholeCategory) return `${cost.category} 지출 전체 · 매달 비슷하게 나가요`;
  return [cost.billingDay ? `매달 ${cost.billingDay}일` : '결제일 없음', dueBadge(cost)];
}

function renderFixed() {
  const { fixedCosts } = state.settings;
  const groups = groupFixed(fixedCosts).map((group) => [
    el('div', { class: 's-group' }, el('span', {}, `${group.category} ${group.items.length}개`), el('span', {}, won(group.total))),
    el('ul', { class: 's-list' }, group.items.map(({ cost, index }) => row({
      lead: iconLead(iconFor(cost)),
      title: cost.name,
      sub: fixedSub(cost),
      value: won(cost.amount),
      onClick: () => openFixedSheet(index),
    }))),
  ]);
  document.getElementById('fixed-section').replaceChildren(card({
    title: '고정비',
    extra: fixedCosts.length ? `매달 ${won(fixedTotal())}` : null,
    children: [
      fixedCosts.length ? null : el('p', { class: 's-empty' }, '통신비, 구독료처럼 매달 나가는 돈을 넣어 두면 하루 예산이 더 정확해져요'),
      groups,
      el('ul', { class: 's-list' }, addRow('고정비 추가', () => openFixedSheet())),
    ],
  }));
}

function fixedNameError(name, index) {
  if (!name) return '이름을 적어 주세요';
  return state.settings.fixedCosts.some((cost, i) => i !== index && cost.name === name) ? '이미 넣은 고정비예요' : '';
}

function billingDayError(text) {
  if (!text) return '';
  const day = Number(text);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? '' : '1~31 사이 숫자로 적어 주세요';
}

function readFixedForm(form, controls, index) {
  const name = controls.name.value.trim();
  const amount = controls.amount.read();
  const dayText = controls.day.value.trim();
  const valid = [
    check(controls.name, fixedNameError(name, index)),
    check(controls.amount.wrap, amount > 0 ? '' : '금액을 적어 주세요'),
    check(controls.day, billingDayError(dayText)),
  ].every(Boolean);
  if (!valid) return null;
  return { name, amount, category: form.category || guessCategory(name) || '기타', billingDay: dayText ? Number(dayText) : null, wholeCategory: form.wholeCategory };
}

function saveFixed(index, values) {
  if (!values) return false;
  const list = [...state.settings.fixedCosts];
  if (index === undefined) list.push(values);
  else list[index] = values;
  return saveSettings({ ...state.settings, fixedCosts: list }, index === undefined ? `${josa(values.name, '을', '를')} 고정비에 넣었어요` : '저장했어요');
}

function removeFixed(index) {
  const removed = state.settings.fixedCosts[index];
  const fixedCosts = state.settings.fixedCosts.filter((_, i) => i !== index);
  return saveSettings({ ...state.settings, fixedCosts }, `${josa(removed.name, '을', '를')} 지웠어요`);
}

function openFixedSheet(index) {
  const editing = index !== undefined;
  const cost = editing ? state.settings.fixedCosts[index] : { name: '', amount: 0, category: null, billingDay: null, wholeCategory: false };
  const form = { category: cost.category, wholeCategory: cost.wholeCategory, picked: editing };
  const controls = {
    name: textInput({ id: 'fixed-name', value: cost.name, max: 30, placeholder: '예: 넷플릭스' }),
    amount: amountField({ id: 'fixed-amount', value: cost.amount }),
    day: textInput({ id: 'fixed-day', value: cost.billingDay ?? '', max: 2, placeholder: '예: 5', inputMode: 'numeric' }),
  };
  const categorySlot = el('div');
  const renderCategories = () => categorySlot.replaceChildren(choiceChips({
    options: FIXED_CATEGORIES,
    value: form.category,
    label: (option) => [icon(categoryIcon(option), 'icon-sm'), option],
    onChange: (value) => { form.category = value; form.picked = true; },
  }));
  // 이름을 적으면 어울리는 카테고리를 먼저 골라 둬요. (직접 고른 뒤에는 바꾸지 않아요)
  controls.name.addEventListener('input', () => {
    const guess = guessCategory(controls.name.value);
    if (!form.picked && guess && guess !== form.category) { form.category = guess; renderCategories(); }
  });
  renderCategories();
  controls.name.dataset.autofocus = '';

  openSheet({
    title: editing ? '고정비 고치기' : '고정비 추가',
    body: [
      field({ label: '이름', id: 'fixed-name', control: controls.name, help: '결제내역에 찍히는 이름 그대로 적으면 하루 예산에서 두 번 빠지지 않아요' }),
      field({ label: '매달 나가는 금액', id: 'fixed-amount', control: controls.amount.wrap }),
      el('div', { class: 'mb-4' }, el('div', { class: 'form-label' }, '카테고리'), categorySlot),
      form.wholeCategory
        ? note(`${cost.category} 지출 전체를 이 금액으로 묶어서 봐요`)
        : field({ label: '결제일', id: 'fixed-day', control: el('div', { class: 's-day' }, '매달', controls.day, '일'), help: '구독은 결제일을 넣으면 결제 전에 알려 드려요' }),
    ],
    submitLabel: editing ? '저장' : '추가하기',
    onSubmit: () => saveFixed(index, readFixedForm(form, controls, index)),
    onDelete: editing ? () => removeFixed(index) : null,
  });
}

// ── 고정지출 예상 (지난 2달) ──────────────────────────

async function loadSuggestions({ quiet = false } = {}) {
  if (!quiet) {
    state.suggest = { status: 'loading', data: state.suggest.data };
    renderForecast();
  }
  try {
    state.suggest = { status: 'ready', data: await api('GET', `/api/settings/suggestions?months=${SUGGEST_MONTHS}`) };
  } catch {
    if (quiet) return; // 조용히 다시 불러올 때는 실패해도 보던 내용을 그대로 둬요
    state.suggest = { status: 'error', data: null };
  }
  renderForecast();
  renderBudget(); // 평균 지출 안내
}

// 고정비가 이 예상 카테고리에 들어 있는지 지금 고정비 목록으로 바로 계산해요. (서버 isFixedCost와 같은 규칙)
const normalize = (text) => String(text).trim().replace(/\s+/g, ' ').toLowerCase();

function matchesGroup(cost, group) {
  if (cost.wholeCategory) return Boolean(group.steady) && cost.category === group.category;
  const name = normalize(cost.name);
  return name.length >= 2 && group.items.some((item) => normalize(item.name).includes(name));
}

const isItemAdded = (item) => state.settings.fixedCosts.some((cost) => !cost.wholeCategory && matchesGroup(cost, { items: [item] }));
const isSteadyAdded = (group) => state.settings.fixedCosts.some((cost) => cost.wholeCategory && cost.category === group.category);
const addedOf = (group) => state.settings.fixedCosts.filter((cost) => matchesGroup(cost, group));

// 아직 고정비에 없는 것만 골라요. 정기 결제는 그대로, 매달 비슷한 지출은 "그 외 교통비"처럼 카테고리 전체로 넣어요.
function pendingOf(group) {
  const items = group.items
    .filter((item) => !isItemAdded(item))
    .map(({ name, amount, category, billingDay }) => ({ name, amount, category, billingDay, wholeCategory: false }));
  if (group.steady && !isSteadyAdded(group)) {
    const name = OTHERS_NAME[group.category] ?? `그 외 ${group.category}`;
    items.push({ name, amount: round100(group.steady.average), category: group.category, billingDay: null, wholeCategory: true });
  }
  return items;
}

async function addFixedItems(items, button) {
  button.disabled = true;
  const previous = state.settings.fixedCosts;
  const message = items.length > 1 ? `고정비 ${items.length}개를 넣었어요` : `${josa(items[0].name, '을', '를')} 고정비에 넣었어요`;
  try {
    await saveSettings({ ...state.settings, fixedCosts: [...previous, ...items] }, message, undoTo(previous));
  } catch (err) {
    toast(err.message);
    button.disabled = false;
  }
}

// 예상 카테고리에서 넣은 고정비를 다시 빼요. 실수했으면 알림의 "되돌리기"로 돌아와요.
async function removeGroup(group, button) {
  button.disabled = true;
  const previous = state.settings.fixedCosts;
  const fixedCosts = previous.filter((cost) => !matchesGroup(cost, group));
  try {
    await saveSettings({ ...state.settings, fixedCosts }, `${group.category} 고정비 ${previous.length - fixedCosts.length}개를 뺐어요`, undoTo(previous));
  } catch (err) {
    toast(err.message);
    button.disabled = false;
  }
}

function forecastSub(group) {
  const parts = group.items.map((item) => item.name);
  if (group.steady) parts.push(`그 외 ${manwon(group.steady.average)}`);
  const added = !pendingOf(group).length;
  return [added ? el('span', { class: 's-added' }, icon('check', 'icon-sm'), '추가됨') : null, parts.join(' · ')];
}

// 넣을 게 남았으면 [추가], 다 넣었으면 [빼기]
function forecastStatus(group) {
  const pending = pendingOf(group);
  if (pending.length) {
    return el('button', { class: 's-pill is-brand', type: 'button', 'aria-label': `${group.category} 고정지출 추가`, onclick: (event) => addFixedItems(pending, event.currentTarget) }, '추가');
  }
  if (!addedOf(group).length) return null;
  return el('button', { class: 's-pill', type: 'button', 'aria-label': `${group.category} 고정지출 빼기`, onclick: (event) => removeGroup(group, event.currentTarget) }, '빼기');
}

function forecastRows(categories) {
  return el('ul', { class: 's-list' }, categories.map((group) => row({
    lead: iconLead(categoryIcon(group.category)),
    title: el('span', {}, group.category, el('span', { class: 's-row-amount' }, `약 ${won(round100(group.expected))}`)),
    sub: forecastSub(group),
    action: forecastStatus(group),
  })));
}

function forecastBody({ status, data }) {
  if (status === 'loading') {
    return el('div', { class: 'placeholder-glow mt-3', 'aria-hidden': 'true' },
      el('span', { class: 'placeholder col-12 mb-2' }), el('span', { class: 'placeholder col-7' }));
  }
  if (status === 'error') {
    return [el('p', { class: 's-empty mt-3' }, '잠시 후 다시 시도해 주세요'), el('button', { class: 'link-btn', type: 'button', onclick: () => loadSuggestions() }, '다시 시도')];
  }
  if (!data.categories.length) {
    return [el('p', { class: 's-empty mt-3' }, '두 달 넘게 거래가 쌓이면 매달 나가는 돈을 찾아 드려요'), el('a', { class: 'link-btn', href: '/upload.html' }, '결제내역 올리러 가기')];
  }
  // 넣을 게 두 카테고리 이상일 때만 "모두 넣기"를 보여 줘요. (한 카테고리면 줄의 추가 버튼과 같아요)
  const pendingGroups = data.categories.filter((group) => pendingOf(group).length);
  const pending = pendingGroups.flatMap(pendingOf);
  return [
    forecastRows(data.categories),
    pendingGroups.length > 1
      ? el('button', { class: 'btn btn-primary w-100 mt-3 s-cta', type: 'button', onclick: (event) => addFixedItems(pending, event.currentTarget) }, `예상한 고정지출 모두 넣기 (${pending.length}개)`)
      : null,
  ];
}

function forecastPeriod(data) {
  if (!data?.averageMonths.length) return `지난 ${SUGGEST_MONTHS}달 거래를 살펴보고 있어요`;
  const months = data.averageMonths.map((m) => Number(m.slice(5)));
  const range = months.length > 1 ? `${months[0]}~${months.at(-1)}월` : `${months[0]}월`;
  return `${range} 고정지출을 카테고리별로 모아 예상했어요`;
}

function renderForecast() {
  const { status, data } = state.suggest;
  const total = status === 'ready' && data.expectedTotal ? el('div', { class: 's-forecast-total' }, `매달 약 ${won(round100(data.expectedTotal))}`) : null;
  document.getElementById('forecast-section').replaceChildren(card({
    children: [
      el('span', { class: 's-tag' }, icon('chart'), `지난 ${SUGGEST_MONTHS}달 분석`),
      el('h2', { class: 's-card-title' }, '다음 달 고정지출 예상'),
      total,
      el('p', { class: 's-card-desc' }, forecastPeriod(data)),
      forecastBody(state.suggest),
    ],
  }));
}

// ── 알림 ─────────────────────────────────────────

async function saveAlert(alert, message) {
  try {
    state.settings.subscriptionAlert = await api('PATCH', '/api/settings/subscription-alert', alert);
    renderFixed();
    renderAlerts();
    toast(message);
  } catch (err) {
    toast(err.message);
    renderAlerts();
  }
}

// 가장 가까운 구독으로 알림이 어떻게 뜨는지 보여 줘요. (실제 푸시는 아직 없어서 홈 화면 알림으로 쓸 예정)
function alertPreview(alert) {
  const [next] = upcomingSubscriptions();
  if (!next) return note('결제일을 넣은 구독이 없어요. 고정비에서 결제일을 넣으면 알려 드려요');
  const alertIn = next.daysLeft - alert.daysBefore;
  const alertDate = new Date(startOfToday().getTime() + alertIn * DAY_MS);
  return [
    foot(alertIn <= 0 ? '지금 알림을 보여 주고 있어요' : `다음 알림은 ${monthDay(alertDate)}이에요`),
    el('div', { class: 's-push', 'aria-label': '알림 미리보기' },
      el('div', { class: 's-push-head' }, el('span', { class: 's-push-app' }, '가'), el('span', {}, '자동 분류 가계부'), el('span', { class: 's-push-time' }, '미리보기')),
      el('div', { class: 's-push-title' }, `${next.cost.name}, ${dueText(next.daysLeft)} 결제돼요`),
      el('div', { class: 's-push-body' }, `${won(next.cost.amount)} · 계속 쓸까요?`),
      el('div', { class: 's-push-actions', 'aria-hidden': 'true' }, el('span', {}, '계속 쓸게요'), el('span', {}, '해지할래요'))),
  ];
}

function renderAlerts() {
  const alert = state.settings.subscriptionAlert;
  const toggle = switchControl({
    id: 'alert-switch',
    checked: alert.enabled,
    label: '구독 결제 알림',
    onChange: (on) => saveAlert({ enabled: on }, on ? '구독 결제 알림을 켰어요' : '구독 결제 알림을 껐어요'),
  });
  const days = choiceChips({
    options: ALERT_DAYS.map(String),
    value: String(alert.daysBefore),
    label: (option) => `${option}일 전`,
    onChange: (value) => saveAlert({ daysBefore: Number(value) }, `결제 ${value}일 전에 알려 드릴게요`),
  });
  document.getElementById('alert-section').replaceChildren(card({
    title: '알림',
    children: [
      el('ul', { class: 's-list' }, row({
        lead: iconLead('bell'),
        title: '구독 결제 알림',
        sub: alert.enabled ? `결제 ${alert.daysBefore}일 전에 계속 쓸지 물어봐요` : '꺼져 있어요',
        action: toggle,
      })),
      alert.enabled ? [el('div', { class: 's-label' }, '언제 알려 드릴까요?'), days, alertPreview(alert)] : null,
    ],
  }));
}

// ── 자산 (은행 · 페이머니 · 카드) ─────────────────────

const hasBalance = (account) => typeOf(account.type).balance && account.balance !== null;

const yesterdayText = () => {
  const d = new Date(startOfToday().getTime() - DAY_MS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function changeText(change, className = 's-change') {
  if (!change?.amount) return null;
  const up = change.amount > 0;
  return el('span', { class: `${className} ${up ? 'is-up' : 'is-down'}` }, `${up ? '+' : '−'}${won(Math.abs(change.amount))}`);
}

// 맨 위 합계: 보이는 은행·페이머니 잔액을 더하고, 어제와 비교해요.
function accountSummary(visible) {
  const withMoney = visible.filter(hasBalance);
  if (!withMoney.length) return null;
  const total = withMoney.reduce((sum, account) => sum + account.balance, 0);
  const changes = withMoney.map((account) => account.balanceChange).filter(Boolean);
  const diff = changes.reduce((sum, change) => sum + change.amount, 0);
  const since = changes.every((change) => change.since === yesterdayText()) ? '어제보다' : '지난 기록보다';
  const changeLine = diff
    ? el('div', { class: 's-asset-change' }, `${since} `, el('span', { class: `s-change ${diff > 0 ? 'is-up' : 'is-down'}` }, won(Math.abs(diff))), diff > 0 ? ' 늘었어요' : ' 줄었어요')
    : null;
  return el('div', { class: 's-asset' }, el('div', { class: 's-asset-amount' }, won(total)), changeLine);
}

// "카카오뱅크 ··7310 · 연 2%"
function accountSub(account) {
  const bank = account.last4 ? `${account.institution} ··${account.last4}` : account.institution;
  return account.interestRate ? `${bank} · 연 ${account.interestRate}%` : bank;
}

function accountRow(account) {
  const money = hasBalance(account);
  return row({
    lead: institutionBadge(account.institution, account.type),
    title: account.name,
    sub: accountSub(account),
    value: money ? el('span', { class: 's-row-right' }, won(account.balance), changeText(account.balanceChange)) : null,
    onClick: () => openAccountSheet(account),
    chevron: !money,
  });
}

// 종류별 묶음: "은행 2개 ··· 4,284,464원"
function assetGroup(type, accounts) {
  const money = accounts.filter(hasBalance);
  const subtotal = money.length ? won(money.reduce((sum, account) => sum + account.balance, 0)) : '';
  return [
    el('div', { class: 's-group' }, el('span', {}, `${typeOf(type).label} ${accounts.length}개`), el('span', {}, subtotal)),
    el('ul', { class: 's-list' }, accounts.map(accountRow)),
  ];
}

async function setHidden(account, hidden, button) {
  button.disabled = true;
  try {
    const saved = await api('PATCH', `/api/accounts/${account.id}`, { hidden });
    state.accounts = state.accounts.map((a) => (a.id === saved.id ? saved : a));
    renderAccounts();
    toast(hidden ? `${josa(account.name, '을', '를')} 숨겼어요` : `${josa(account.name, '을', '를')} 다시 보여 드려요`);
  } catch (err) {
    toast(err.message);
    button.disabled = false;
  }
}

function hiddenSection(hidden) {
  const toggle = el('button', {
    class: 's-hidden-toggle', type: 'button', 'aria-expanded': String(state.showHidden),
    onclick: () => { state.showHidden = !state.showHidden; renderAccounts(); },
  }, `숨긴 자산 ${hidden.length}개`, icon('chevron', 's-toggle-icon'));
  const rows = hidden.map((account) => row({
    lead: institutionBadge(account.institution, account.type),
    title: account.name,
    sub: accountSub(account),
    action: el('button', { class: 's-pill', type: 'button', onclick: (event) => setHidden(account, false, event.currentTarget) }, '보이기'),
  }));
  return [toggle, state.showHidden ? el('ul', { class: 's-list is-muted' }, rows) : null];
}

function renderAccounts() {
  const visible = state.accounts.filter((account) => !account.hidden);
  const hidden = state.accounts.filter((account) => account.hidden);
  const groups = TYPE_ORDER
    .map((type) => [type, visible.filter((account) => account.type === type)])
    .filter(([, list]) => list.length);
  document.getElementById('accounts-section').replaceChildren(card({
    title: '자산',
    extra: state.accounts.length ? `${state.accounts.length}개` : null,
    children: [
      accountSummary(visible),
      state.accounts.length ? null : el('p', { class: 's-empty' }, '통장, 페이머니, 카드를 넣어 두면 내 자산끼리 옮긴 돈을 지출에서 빼 드려요'),
      groups.map(([type, list]) => assetGroup(type, list)),
      el('ul', { class: 's-list' }, addRow('자산 추가', () => openAccountSheet())),
      hidden.length ? hiddenSection(hidden) : null,
      state.accounts.length ? foot('내 계좌·페이머니끼리 옮긴 돈은 지출로 세지 않아요') : null,
    ],
  }));
}

// 기본 목록 + 내가 전에 직접 넣은 것 (한 번 쓴 은행·용도는 다음부터 버튼으로 나와요)
function institutionOptions(type) {
  const mine = state.accounts.filter((a) => a.type === type).map((a) => a.institution);
  return [...new Set([...typeOf(type).options, ...mine])];
}

const purposeOptions = () => [...new Set([...PURPOSES, ...state.accounts.map((a) => a.purpose).filter(Boolean)])];

function parseRate(text) {
  if (!text.trim()) return null;
  const rate = Number(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : NaN;
}

// 종류에 맞는 칸만 보내요. (페이머니는 번호 없음, 카드는 잔액 없음, 이자율은 은행만)
function accountValues(form, controls) {
  const config = typeOf(form.type);
  return {
    name: controls.name.value.trim(),
    type: form.type,
    institution: form.institution.trim(),
    purpose: form.purpose.trim(),
    hidden: form.hidden,
    last4: config.number ? controls.number.value.trim() : '',
    balance: config.balance && !controls.balance.isEmpty() ? controls.balance.read() : null,
    interestRate: config.rate ? parseRate(controls.rate.value) : null,
  };
}

function readAccountForm(form, controls) {
  const values = accountValues(form, controls);
  const digits = values.last4.replace(/\D/g, '').length;
  const valid = [
    check(controls.name, values.name ? '' : '이름을 적어 주세요'),
    check(controls.institution, values.institution ? '' : `${josa(typeOf(form.type).company, '을', '를')} 골라 주세요`),
    check(controls.number, !values.last4 || digits >= 4 ? '' : '숫자 4자리 이상 적어 주세요'),
    check(controls.rate, Number.isNaN(values.interestRate) ? '0~100 사이 숫자로 적어 주세요' : ''),
  ].every(Boolean);
  return valid ? values : null;
}

async function saveAccount(account, values) {
  if (!values) return false;
  const saved = account ? await api('PATCH', `/api/accounts/${account.id}`, values) : await api('POST', '/api/accounts', values);
  state.accounts = account ? state.accounts.map((a) => (a.id === saved.id ? saved : a)) : [...state.accounts, saved];
  renderAccounts();
  renderProfile();
  toast(account ? '저장했어요' : `${josa(saved.name, '을', '를')} 추가했어요`);
}

async function deleteAccount(account) {
  await api('DELETE', `/api/accounts/${account.id}`);
  state.accounts = state.accounts.filter((a) => a.id !== account.id);
  renderAccounts();
  renderProfile();
  toast(`${josa(account.name, '을', '를')} 지웠어요`);
}

// 한 달 이자 미리 계산 (세금 빼기 전)
function interestHint(controls) {
  const rate = parseRate(controls.rate.value);
  if (!rate || controls.balance.isEmpty()) return '';
  return `한 달 이자 약 ${won(Math.floor((controls.balance.read() * rate) / 100 / 12))} (세금 빼기 전)`;
}

// 전체 번호를 넣으면 끝 4자리만 남기고 "개인정보를 보호해요"라고 알려 줘요.
// 붙여 넣으면 바로, 직접 칠 때는 다 치고 칸을 벗어날 때 바꿔요. (치는 중간에 바뀌면 헷갈려서)
function protectNumber(input, notice) {
  const shrink = () => {
    const digits = input.value.replace(/\D/g, '');
    if (digits.length <= 4) return;
    input.value = digits.slice(-4);
    notice.replaceChildren(
      el('span', { class: 's-privacy-icon' }, icon('shield', 'icon-sm')),
      el('span', { class: 's-privacy-text' },
        el('strong', {}, '개인정보를 보호해요'),
        el('span', {}, `전체 번호 대신 끝 4자리 ${input.value}만 저장해요`)));
    notice.classList.remove('show');
    requestAnimationFrame(() => notice.classList.add('show')); // 다시 넣어도 애니메이션이 처음부터
  };
  input.addEventListener('paste', () => setTimeout(shrink, 0));
  input.addEventListener('blur', shrink);
}

function accountControls(current) {
  const controls = {
    name: textInput({ id: 'account-name', value: current.name, max: 30 }),
    number: textInput({ id: 'account-number', value: current.last4, max: 30, placeholder: '끝 4자리만 저장해요', inputMode: 'numeric' }),
    balance: amountField({ id: 'account-balance', value: current.balance, label: '잔액' }),
    rate: textInput({ id: 'account-rate', value: current.interestRate ?? '', max: 6, placeholder: '예: 2.0', inputMode: 'decimal' }),
    institution: el('div'),
    privacy: el('div', { class: 's-privacy', role: 'status', 'aria-live': 'polite' }),
  };
  protectNumber(controls.number, controls.privacy);
  const hint = el('p', { class: 'sheet-hint' });
  const updateHint = () => { hint.textContent = interestHint(controls); };
  controls.rate.addEventListener('input', updateHint);
  controls.balance.input.addEventListener('input', updateHint);
  updateHint();
  return { controls, hint };
}

// 종류(은행·페이머니·카드)마다 다른 칸들
function accountTypeFields(controls, hint) {
  const numberLabel = el('label', { class: 'form-label', for: 'account-number' });
  const numberHelp = el('div', { class: 'form-text' });
  const companyLabel = el('div', { class: 'form-label' });
  return {
    companyLabel,
    numberLabel,
    numberHelp,
    company: el('div', { class: 'mb-4' }, companyLabel, controls.institution, el('div', { class: 'invalid-feedback' })),
    number: el('div', { class: 'mb-4' }, numberLabel, controls.number, el('div', { class: 'invalid-feedback' }), controls.privacy, numberHelp),
    balance: field({ label: '잔액', id: 'account-balance', control: controls.balance.wrap, help: '직접 적은 잔액이에요. 고치면 어제와 비교해 보여 드려요' }),
    rate: field({ label: '이자율 (선택)', id: 'account-rate', control: el('div', { class: 's-day' }, '연', controls.rate, '%'), extra: hint }),
  };
}

function openAccountSheet(account) {
  const editing = Boolean(account);
  const current = account ?? { name: '', type: 'bank', institution: '', purpose: '', last4: '', balance: null, interestRate: null, hidden: false };
  const form = { type: current.type, institution: current.institution, purpose: current.purpose, hidden: current.hidden };
  const { controls, hint } = accountControls(current);
  const fields = accountTypeFields(controls, hint);

  // 은행·페이머니·카드를 바꾸면 회사 버튼, 칸 이름, 보이는 칸이 바뀌어요.
  const applyType = () => {
    const config = typeOf(form.type);
    controls.institution.replaceChildren(choiceChips({
      options: institutionOptions(form.type), value: form.institution, allowCustom: true, badge: chipLogo,
      onChange: (value) => { form.institution = value; clearInvalid(controls.institution); },
    }));
    fields.companyLabel.textContent = config.company;
    fields.numberLabel.textContent = `${config.number} (선택)`;
    fields.numberHelp.textContent = `같은 ${config.company}의 ${config.label === '카드' ? '카드' : '계좌'}를 구분해요`;
    controls.name.placeholder = config.placeholder;
    fields.number.classList.toggle('d-none', !config.number);
    fields.balance.classList.toggle('d-none', !config.balance);
    fields.rate.classList.toggle('d-none', !config.rate);
  };
  applyType();
  if (!editing) controls.name.dataset.autofocus = '';

  openSheet({
    title: editing ? '자산 고치기' : '자산 추가',
    body: [
      segmented({ name: 'account-type', label: '종류', value: form.type, options: TYPE_ORDER.map((type) => [type, typeOf(type).label]), onChange: (type) => { form.type = type; form.institution = ''; applyType(); } }),
      fields.company,
      field({ label: '이름', id: 'account-name', control: controls.name }),
      fields.number,
      fields.balance,
      fields.rate,
      el('div', { class: 'mb-4' }, el('div', { class: 'form-label' }, '용도 (선택)'),
        choiceChips({ options: purposeOptions(), value: form.purpose, allowCustom: true, allowEmpty: true, onChange: (value) => { form.purpose = value; } })),
      el('div', { class: 's-switch-row' },
        el('div', {}, el('div', { class: 's-switch-title' }, '목록에서 숨기기'), el('div', { class: 's-switch-sub' }, '숨겨도 내 자산끼리 옮긴 돈 구분에는 계속 써요')),
        switchControl({ id: 'account-hidden', checked: form.hidden, label: '목록에서 숨기기', onChange: (on) => { form.hidden = on; } })),
    ],
    submitLabel: editing ? '저장' : '추가하기',
    onSubmit: () => saveAccount(account, readAccountForm(form, controls)),
    onDelete: editing ? () => deleteAccount(account) : null,
  });
}

// ── 계정 ─────────────────────────────────────────

function renderUser() {
  document.getElementById('user-section').replaceChildren(card({
    title: '계정',
    children: el('ul', { class: 's-list' },
      row({ title: '아이디', value: el('span', { class: 's-row-muted' }, state.username) }),
      row({ title: '로그아웃', onClick: logout }),
      row({ title: el('span', { class: 's-row-quiet' }, '탈퇴하기'), onClick: openLeaveSheet })),
  }));
}

// ── 탈퇴 ─────────────────────────────────────────
// 지워질 기록을 먼저 보여 주고, 확인 칸과 비밀번호를 받은 뒤에 지워요. (DELETE /api/settings/membership)
// 지운 다음에는 이 기기에 남은 로그인 토큰·시안 설정도 지우고 "탈퇴했어요"를 보여 줘요.

const LOCAL_PREFIX = 'budget.'; // 이 앱이 브라우저에 저장하는 값의 이름 앞부분 (api.js 로그인 토큰, 디자인 시안)
let leaveDone = false;

const LEAVE_ITEMS = [
  { key: 'transactions', icon: 'receipt', title: '거래 내역', sub: '직접 적거나 캡처로 읽은 기록', unit: '건' },
  { key: 'accounts', icon: 'bank', title: '자산', sub: '은행·페이머니·카드', unit: '개' },
  { key: 'fixedCosts', icon: 'repeat', title: '고정비', sub: '한 달 예산·구독 알림 설정까지', unit: '개' },
  { key: 'rules', icon: 'tag', title: '분류 규칙', sub: '내가 고친 분류를 기억한 것', unit: '개' },
];

function goToLogin() {
  location.replace('/login.html');
}

// 이 기기에 남은 이 앱의 값(budget.으로 시작)만 지워요. 같은 주소를 쓰는 다른 값은 그대로 둬요.
function clearLocalData() {
  try {
    Object.keys(localStorage).filter((key) => key.startsWith(LOCAL_PREFIX)).forEach((key) => localStorage.removeItem(key));
  } catch {
    // 저장소를 못 쓰는 브라우저면 지울 것도 없어요
  }
}

// done이면 지운 뒤의 줄: 아이콘 대신 체크
function leaveItem({ iconName, title, sub, value, done }) {
  return el('li', { class: 's-leave-item' },
    el('span', { class: `s-lead ${done ? 'is-done' : 'is-icon'}`, 'aria-hidden': 'true' }, icon(done ? 'check' : iconName)),
    el('span', { class: 's-leave-main' },
      el('span', { class: 's-leave-title' }, title),
      sub ? el('span', { class: 's-leave-sub' }, sub) : null),
    value ? el('span', { class: 's-leave-value' }, value) : null);
}

function leaveList(records, username, done = false) {
  const items = LEAVE_ITEMS.map((item) => leaveItem({
    iconName: item.icon, title: item.title, sub: done ? null : item.sub, done,
    value: `${(records[item.key] ?? 0).toLocaleString('ko-KR')}${item.unit}`,
  }));
  items.push(leaveItem({ iconName: 'user', title: '아이디', sub: done ? null : '같은 아이디로 다시 가입 가능', value: username, done }));
  if (done) items.push(leaveItem({ title: '이 기기에 남은 로그인 정보', done }));
  return el('ul', { class: 's-leave-list', 'aria-label': done ? '지운 기록' : '지워지는 기록' }, items);
}

// 진짜 체크박스는 안 보이게 두고(키보드·화면 읽기는 그대로) 테마 색 네모를 보여 줘요
function agreeCheck(text) {
  const input = el('input', { id: 'leave-agree', class: 's-check-input', type: 'checkbox' });
  const label = el('label', { class: 's-check', for: 'leave-agree' }, input,
    el('span', { class: 's-check-box', 'aria-hidden': 'true' }, icon('check')),
    el('span', {}, text));
  input.addEventListener('change', () => {
    label.classList.remove('is-invalid');
    showSheetError('');
  });
  return { input, label };
}

function leaveForm(form) {
  form.agree = agreeCheck('기록이 모두 지워지고 되살릴 수 없다는 걸 확인했어요');
  form.password = el('input', {
    id: 'leave-password', class: 'form-control', type: 'password', autocomplete: 'current-password', maxLength: 72, placeholder: '지금 쓰는 비밀번호',
  });
  form.password.addEventListener('input', () => clearInvalid(form.password));
  return [form.agree.label, field({ label: '비밀번호 확인', id: 'leave-password', control: form.password, help: '본인인지 한 번 더 확인해요' })];
}

function fillLeave(box, info, form) {
  if (!box.isConnected) return; // 불러오는 사이에 시트를 닫았어요
  form.info = info;
  box.replaceChildren(
    el('p', { class: 's-leave-lead' }, '탈퇴하면 아래 기록이 바로 지워져요. 지운 기록은 되살릴 수 없어요.'),
    leaveList(info.records, info.username),
    el('p', { class: 's-foot' }, icon('info', 'icon-sm'), '캡처 사진은 글자만 읽고 저장하지 않아서 따로 지울 게 없어요'),
    ...(info.blockedReason ? [note(info.blockedReason, { warn: true })] : leaveForm(form)));
  if (info.blockedReason) setSheetFooter(closeButton('확인'));
}

function openLeaveSheet() {
  const form = { info: null, agree: null, password: null };
  const box = el('div', {}, el('p', { class: 's-empty' }, '지워질 기록을 세고 있어요…'));
  openSheet({ title: '탈퇴하기', body: box, submitLabel: '탈퇴하기', danger: true, cancelLabel: '취소', onSubmit: () => submitLeave(form) });
  api('GET', '/api/settings/membership')
    .then((info) => fillLeave(box, info, form))
    .catch((err) => {
      if (!box.isConnected) return;
      box.replaceChildren(el('p', { class: 's-empty' }, err.message));
      setSheetFooter(closeButton('닫기'));
    });
}

// 확인 칸과 비밀번호를 봐요. 둘 다 됐으면 true
function leaveFormOk(form) {
  const agreed = form.agree.input.checked;
  form.agree.label.classList.toggle('is-invalid', !agreed);
  showSheetError(agreed ? '' : '지워지는 기록을 확인했다는 칸을 눌러 주세요');
  const hasPassword = check(form.password, form.password.value ? '' : '비밀번호를 입력해 주세요');
  return agreed && hasPassword;
}

function showLeaveDone(info, deleted) {
  leaveDone = true;
  submitSheet = null;
  if (!sheetEl.classList.contains('show')) {
    goToLogin(); // 지우는 사이에 시트를 닫았으면 바로 로그인 화면으로
    return;
  }
  document.getElementById('sheet-title').textContent = '탈퇴했어요';
  document.getElementById('sheet-body').replaceChildren(
    el('p', { class: 's-leave-lead' }, '아래 기록을 모두 지웠어요. 그동안 써 줘서 고마워요.'),
    leaveList({ ...info.records, ...deleted }, info.username, true));
  setSheetFooter(el('button', { class: 'btn btn-primary btn-lg flex-grow-1', type: 'button', onclick: goToLogin }, '처음 화면으로'));
}

// 시트는 닫지 않아요(false). 틀리면 그 자리에서 다시 입력하고, 지웠으면 "탈퇴했어요"로 바꿔요.
async function submitLeave(form) {
  if (!form.password || !leaveFormOk(form)) return false; // 아직 불러오는 중이거나 덜 입력했어요
  let result;
  try {
    result = await api('DELETE', '/api/settings/membership', { password: form.password.value });
  } catch (err) {
    check(form.password, err.message);
    form.password.select();
    return false;
  }
  clearLocalData();
  showLeaveDone(form.info, result.deleted);
  return false;
}

// ── 디자인 시안 (팀 회의용, 정하면 지워요) ──────────

function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'lime';
  } catch {
    return 'lime'; // 저장소를 못 쓰는 브라우저면 기본 시안
  }
}

function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    // 저장은 못 해도 화면은 바뀌어요
  }
  renderTheme();
}

function renderTheme() {
  const current = document.documentElement.dataset.theme || 'lime';
  const options = THEMES.map((theme) => {
    const swatch = el('span', { class: 'theme-swatch' });
    swatch.style.background = theme.swatch;
    return el('button', { class: 'theme-option', type: 'button', 'aria-pressed': String(theme.id === current), onclick: () => applyTheme(theme.id) }, swatch, theme.label);
  });
  document.getElementById('theme-section').replaceChildren(card({
    title: '디자인 시안',
    extra: '팀 회의용',
    children: [
      el('div', { class: 'theme-options' }, options),
      el('p', { class: 's-foot' }, '포인트 색을 바꿔 보며 정해요. 정하고 나면 이 칸은 지워요'),
    ],
  }));
}

// ── 시작 ─────────────────────────────────────────

function renderLoadError(message) {
  document.getElementById('budget-section').replaceChildren(card({
    title: '설정을 불러오지 못했어요',
    children: [
      el('p', { class: 's-empty' }, message),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: () => load() }, '다시 시도'),
    ],
  }));
}

async function load() {
  try {
    const [me, settings, accounts] = await Promise.all([
      api('GET', '/api/auth/me'),
      api('GET', '/api/settings'),
      api('GET', '/api/accounts'),
    ]);
    Object.assign(state, { username: me.username, settings, accounts });
  } catch (err) {
    renderLoadError(err.message);
    return;
  }
  renderProfile();
  renderBudget();
  renderFixed();
  renderForecast();
  renderAlerts();
  renderAccounts();
  renderUser();
  loadSuggestions();
}

document.documentElement.dataset.theme = savedTheme();
renderTheme();
load();
