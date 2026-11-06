// API Client for P2P Downloader
const API = {
  getToken() {
    return localStorage.getItem('p2p_token');
  },

  setToken(token) {
    if (token) localStorage.setItem('p2p_token', token);
    else localStorage.removeItem('p2p_token');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('p2p_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) localStorage.setItem('p2p_user', JSON.stringify(user));
    else localStorage.removeItem('p2p_user');
  },

  async request(endpoint, options = {}) {
    const headers = { ...options.headers };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth & Profile
  async register(name, email, password, role = 'User') {
    const res = await this.request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });
    if (res.token) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async login(email, password) {
    const res = await this.request('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) {
      this.setToken(res.token);
      this.setCurrentUser(res.user);
    }
    return res;
  },

  logout() {
    this.setToken(null);
    this.setCurrentUser(null);
    window.location.reload();
  },

  async getProfile() {
    const res = await this.request('/api/users/me');
    if (res.user) {
      this.setCurrentUser(res.user);
    }
    return res.user;
  },

  async updateProfile(data) {
    const res = await this.request('/api/users/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (res.user) {
      this.setCurrentUser(res.user);
    }
    return res;
  },

  async initiateDownload(fileId) {
    return await this.request(`/api/users/download/${fileId}`, {
      method: 'POST'
    });
  },

  async getHistory() {
    return await this.request('/api/users/history');
  },

  // Files & Chunks
  async getFiles() {
    return await this.request('/api/files');
  },

  async getFileDetails(fileId) {
    return await this.request(`/api/files/${fileId}`);
  },

  async uploadFile(formData) {
    return await this.request('/api/files/upload', {
      method: 'POST',
      body: formData
    });
  },

  // Admin Operations
  async getAdminUsers() {
    return await this.request('/api/admin/users');
  },

  async freezeUser(userId) {
    return await this.request(`/api/admin/users/${userId}/freeze`, {
      method: 'PATCH'
    });
  },

  async unfreezeUser(userId) {
    return await this.request(`/api/admin/users/${userId}/unfreeze`, {
      method: 'PATCH'
    });
  },

  async getAdminDownloads() {
    return await this.request('/api/admin/downloads');
  },

  async getAdminStats() {
    return await this.request('/api/admin/stats');
  }
};

