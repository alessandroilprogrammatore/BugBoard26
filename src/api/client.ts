const TOKEN_KEY = 'bugboard26_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function api(path: string, init?: RequestInit) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const token = getStoredToken();
  const res = await fetch(baseUrl + path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export async function apiUpload(path: string, formData: FormData, init?: RequestInit) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const token = getStoredToken();
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    body: formData,
    ...init,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.text();
}
