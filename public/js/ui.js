// 화면 요소를 안전하게 만드는 도우미 — 담당: 박영웅
// 글자는 항상 textContent로 들어가서 XSS 걱정이 없어요.
// 예) el('p', { class: 'text-muted' }, '안녕하세요')
//     el('button', { class: 'btn btn-primary', onclick: () => alert('클릭') }, '저장')

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// 아직 예시 데이터라는 표시
export function mockBadge() {
  return el('span', { class: 'badge rounded-pill text-bg-light border fw-normal ms-2' }, '예시 데이터');
}

// 카드 제목 줄
export function cardTitle(text, ...extra) {
  return el('div', { class: 'd-flex align-items-center mb-3' }, el('h2', { class: 'h6 mb-0 fw-bold' }, text), ...extra);
}

// "2026-11-03" → "11월 3일 (화)"
export function prettyDate(date) {
  const d = new Date(`${date}T00:00:00`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
