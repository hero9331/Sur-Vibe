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

export async function api(method, url, body) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body; // 파일 올리기
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: payload });

  if (res.status === 401 && token) {
    logout();
    throw new Error('로그인이 필요해요');
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `요청 실패 (${res.status})`);
  return data;
}

// 12000 → "12,000원"
export function won(amount) {
  return `${Number(amount).toLocaleString('ko-KR')}원`;
}
