const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(message, status = 0, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and try again.');
  }

  let data = null;
  const raw = await res.text();
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      /* non-JSON body (e.g. a proxy error page) */
    }
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.details || {});
  }
  return data;
}

export const api = {
  health: (signal) => request('/health', { signal }),
  listEmployees: ({ q = '', department = '' } = {}, signal) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (department) params.set('department', department);
    const qs = params.toString();
    return request(`/employees${qs ? `?${qs}` : ''}`, { signal });
  },
  getEmployee: (id, signal) => request(`/employees/${id}`, { signal }),
  createEmployee: (data) => request('/employees', { method: 'POST', body: data }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: data }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  getStats: (signal) => request('/stats', { signal }),
};
