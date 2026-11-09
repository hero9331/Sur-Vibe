// F0 로그인·회원가입 화면 — 담당: 박영웅
import { api, getToken, setToken } from './api.js';

if (getToken()) location.replace('/');

let mode = 'login';
const form = document.getElementById('auth-form');
const submit = document.getElementById('auth-submit');
const errorBox = document.getElementById('auth-error');
const password = document.getElementById('password');

function setMode(next) {
  mode = next;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
  submit.textContent = mode === 'login' ? '로그인' : '가입하기';
  password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  errorBox.classList.add('d-none');
}

document.getElementById('tab-login').addEventListener('click', () => setMode('login'));
document.getElementById('tab-signup').addEventListener('click', () => setMode('signup'));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submit.disabled = true;
  errorBox.classList.add('d-none');
  try {
    const { token } = await api('POST', `/api/auth/${mode}`, {
      username: document.getElementById('username').value,
      password: password.value,
    });
    setToken(token);
    location.replace('/');
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('d-none');
  } finally {
    submit.disabled = false;
  }
});
