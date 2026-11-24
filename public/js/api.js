// 서버 API를 부를 때는 이 파일의 api()를 써요. 로그인 토큰을 알아서 붙여 줘요.
// 예) const items = await api('GET', '/api/accounts');
//     await api('POST', '/api/accounts', { name: '생활비 통장', type: 'bank', institution: '토스뱅크' });

const TOKEN_KEY = 'budget.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  location.href = '/login.html';
}

// 1단계: 보낼 요청 만들기. 파일(FormData)은 그대로, 나머지 본문은 JSON으로 보내요.
function buildRequest(method, body, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body === undefined || body instanceof FormData) return { method, headers, body };
  return { method, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

const errorFrom = (data, status) => new Error(data?.error || `요청 실패 (${status})`);

// 2단계: 받은 응답 읽기. 로그인이 풀렸으면 로그인 화면으로 보내요.
async function readResponse(res, token) {
  if (res.status === 401 && token) {
    logout();
    throw new Error('로그인이 필요해요');
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw errorFrom(data, res.status);
  return data;
}

export async function api(method, url, body) {
  const token = getToken();
  const res = await fetch(url, buildRequest(method, body, token));
  return readResponse(res, token);
}

// 12000 → "12,000원"
export function won(amount) {
  return `${Number(amount).toLocaleString('ko-KR')}원`;
}
