// 모든 화면 위쪽 메뉴와 로그인 확인 — 담당: 박영웅 (다른 사람은 고치지 말아 주세요)
import { api, getToken, logout } from './api.js';

const MENUS = [
  { page: 'home', href: '/', label: '홈' },
  { page: 'upload', href: '/upload.html', label: '올리기' },
  { page: 'transactions', href: '/transactions.html', label: '내역' },
  { page: 'monthly', href: '/monthly.html', label: '월별 보기', short: '월별' },
  { page: 'settings', href: '/settings.html', label: '설정' },
];

function renderNav() {
  const current = document.body.dataset.page;
  const links = MENUS.map(
    (m) => `<li class="nav-item"><a class="nav-link${m.page === current ? ' active fw-semibold' : ''}" href="${m.href}">${m.label}</a></li>`,
  ).join('');
  const tabs = MENUS.map(
    (m) => `<a class="bottom-tab${m.page === current ? ' active' : ''}" href="${m.href}"${m.page === current ? ' aria-current="page"' : ''}>${m.short ?? m.label}</a>`,
  ).join('');

  document.getElementById('app-nav').innerHTML = `
    <nav class="navbar app-navbar" aria-label="메뉴">
      <div class="container nav-container">
        <a class="navbar-brand" href="/">자동 분류 가계부</a>
        <ul class="navbar-nav flex-row gap-3 me-auto d-none d-md-flex">${links}</ul>
        <div class="d-flex align-items-center">
          <span class="navbar-text me-3 d-none d-md-inline" id="nav-username"></span>
          <button class="btn btn-outline-secondary btn-sm" id="logout-btn" type="button">로그아웃</button>
        </div>
      </div>
    </nav>
    <nav class="bottom-tabs d-md-none" aria-label="메뉴">${tabs}</nav>`;

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
