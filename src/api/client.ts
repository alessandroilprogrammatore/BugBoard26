export async function api(path: string, init?: RequestInit) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const res = await fetch(baseUrl + path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    credentials: 'include',
    headers: {
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
