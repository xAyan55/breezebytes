const API_BASE = '/api/v1';

class ApiService {
  getToken() {
    return localStorage.getItem('bb_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('bb_token', token);
    } else {
      localStorage.removeItem('bb_token');
    }
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        this.setToken(null);
        window.location.href = '/login';
      }
      const message = data?.error?.message || response.statusText || 'An error occurred';
      const error = new Error(message);
      error.code = data?.error?.code || 'API_ERROR';
      error.status = response.status;
      throw error;
    }

    return data;
  }

  get(endpoint, params) {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams(params).toString();
      url += `?${query}`;
    }
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, body) {
    return this.request(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const api = new ApiService();
export default api;
