// 모든 화면 위쪽 메뉴와 로그인 확인 — 담당: 박영웅 (다른 사람은 고치지 말아 주세요)
import { api, getToken, logout } from './api.js';

const MENUS = [
  { page: 'home', href: '/', label: '홈' },
  { page: 'upload', href: '/upload.html', label: '올리기' },
  { page: 'transactions', href: '/transactions.html', label: '내역' },
  { page: 'monthly', href: '/monthly.html', label: '월별 보기' },
  { page: 'settings', href: '/settings.html', label: '설정' },
];

function renderNav() {
  const current = document.body.dataset.page;
  const links = MENUS.map(
    (m) => `<li class="nav-item"><a class="nav-link${m.page === current ? ' active fw-semibold' : ''}" href="${m.href}">${m.label}</a></li>`,
  ).join('');

  document.getElementById('app-nav').innerHTML = `
    <nav class="navbar navbar-expand-md bg-white border-bottom">
      <div class="container nav-container">
        <a class="navbar-brand" href="/">자동 분류 가계부</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu" aria-label="메뉴 열기">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="menu">
          <ul class="navbar-nav me-auto">${links}</ul>
          <span class="navbar-text me-3" id="nav-username"></span>
          <button class="btn btn-outline-secondary btn-sm" id="logout-btn" type="button">로그아웃</button>
        </div>
      </div>
    </nav>`;

  document.getElementById('logout-btn').addEventListener('click', logout);

  api('GET', '/api/auth/me')
    .then((me) => {
      document.getElementById('nav-username').textContent = `${me.username}님`;
    })
    .catch(() => {});
}

if (getToken()) {
  renderNav();
} else {
  location.replace('/login.html');
}
