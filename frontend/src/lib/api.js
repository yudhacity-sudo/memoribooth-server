const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('mb_token');
}

async function request(method, path, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    localStorage.removeItem('mb_token');
    window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
  upload: (path, formData) => request('POST', path, formData, true),

  auth: {
    login: (email, password) => request('POST', '/auth/login', { email, password }),
    me: () => request('GET', '/auth/me'),
    changePassword: (current, next) => request('PUT', '/auth/password', { current_password: current, new_password: next }),
  },
  booths: {
    list: () => request('GET', '/booths'),
    get: (id) => request('GET', `/booths/${id}`),
    create: (data) => request('POST', '/booths', data),
    update: (id, data) => request('PUT', `/booths/${id}`, data),
    delete: (id) => request('DELETE', `/booths/${id}`),
    regenerateKey: (id) => request('POST', `/booths/${id}/regenerate-key`),
  },
  sessions: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request('GET', `/sessions${q ? '?' + q : ''}`);
    },
    get: (code) => request('GET', `/sessions/${code}`),
    delete: (id) => request('DELETE', `/sessions/${id}`),
  },
  frames: {
    list: () => request('GET', '/frames'),
    create: (formData) => request('POST', '/frames', formData, true),
    update: (id, data) => request('PUT', `/frames/${id}`, data),
    delete: (id) => request('DELETE', `/frames/${id}`),
  },
  analytics: {
    summary: () => request('GET', '/analytics/summary'),
    daily: (year, month) => request('GET', `/analytics/daily?year=${year}&month=${month}`),
    monthly: (year) => request('GET', `/analytics/monthly?year=${year}`),
    yearly: () => request('GET', '/analytics/yearly'),
    booths: () => request('GET', '/analytics/booths'),
    peakHours: () => request('GET', '/analytics/peak-hours'),
  }
};

export function setToken(token) {
  localStorage.setItem('mb_token', token);
}
export function clearToken() {
  localStorage.removeItem('mb_token');
}
export function isLoggedIn() {
  return !!localStorage.getItem('mb_token');
}
