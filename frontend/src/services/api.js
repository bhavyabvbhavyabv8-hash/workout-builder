const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const AUTH_TOKEN_KEY = 'workout-builder-token';
let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'api_error', details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function formatApiError(error) {
  const details = error.details?.map(({ field, message }) => `${field}: ${message}`) || [];
  return [error.message, ...details].join(' ');
}

export function getAuthToken() {
  return window.sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveAuthToken(token) {
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const token = getAuthToken();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the Workout Builder API. Check the server connection and try again.', {
      code: 'network_error'
    });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiError = payload?.error;
    if (response.status === 401 && apiError?.code === 'unauthorized' && token) {
      unauthorizedHandler?.();
    }
    throw new ApiError(apiError?.message || `Request failed (${response.status}).`, {
      status: response.status,
      code: apiError?.code || 'request_failed',
      details: apiError?.details
    });
  }

  if (!payload || !Object.hasOwn(payload, 'data')) {
    throw new ApiError('The API returned an unexpected response.', {
      status: response.status,
      code: 'invalid_response'
    });
  }

  return payload.data;
}

export const authApi = {
  register: (body) => apiRequest('/auth/register', { method: 'POST', body }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body }),
  logout: () => apiRequest('/auth/logout', { method: 'POST', body: {} }),
  me: () => apiRequest('/auth/me')
};

export const accountApi = {
  get: () => apiRequest('/account'),
  update: (body) => apiRequest('/account', { method: 'PATCH', body }),
  changePassword: (body) => apiRequest('/account/password', { method: 'PATCH', body }),
  delete: (body) => apiRequest('/account', { method: 'DELETE', body })
};

export const workoutApi = {
  list: () => apiRequest('/workouts'),
  get: (id) => apiRequest(`/workouts/${encodeURIComponent(id)}`),
  create: (body) => apiRequest('/workouts', { method: 'POST', body }),
  update: (id, body) => apiRequest(`/workouts/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  delete: (id) => apiRequest(`/workouts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  stats: () => apiRequest('/workouts/stats'),
  progress: () => apiRequest('/workouts/progress')
};

export const sessionApi = {
  start: (body) => apiRequest('/workouts/sessions', { method: 'POST', body }),
  list: (query = '') => apiRequest(`/workouts/sessions${query}`),
  history: ({ page = 1, limit = 20 } = {}) =>
    apiRequest(`/workouts/sessions/history?page=${page}&limit=${limit}`),
  get: (id) => apiRequest(`/workouts/sessions/${encodeURIComponent(id)}`),
  addSet: (id, body) =>
    apiRequest(`/workouts/sessions/${encodeURIComponent(id)}/sets`, { method: 'POST', body }),
  complete: (id) =>
    apiRequest(`/workouts/sessions/${encodeURIComponent(id)}/complete`, { method: 'PATCH', body: {} })
};
