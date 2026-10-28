import axios from 'axios';

const API = axios.create({
  baseURL: '/api/v1',
  withCredentials: true
});

// Automatically attach JWT token to headers if present
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  sendOtp: (email) => API.post('/auth/send-otp', { email }),
  verifyOtp: (email, otp) => API.post('/auth/verify-otp', { email, otp }),
  me: () => API.get('/auth/me'),
};

export const packageService = {
  getAll: (city) => API.get(`/packages?city=${encodeURIComponent(city || '')}`),
  // HR: every package including switched-off ones (needs Packages & gyms access)
  getAllForHr: () => API.get('/packages', { params: { includeInactive: 1 } }),
  create: (data) => API.post('/packages', data),
  update: (id, data) => API.put(`/packages/${id}`, data),
};

export const gymService = {
  getGyms: (params) => API.get('/gyms', { params }),
  // HR: gyms including switched-off ones (needs Packages & gyms access)
  getGymsForHr: (params) => API.get('/gyms', { params: { ...params, includeInactive: 1 } }),
  create: (data) => API.post('/gyms', data),
  update: (id, data) => API.put(`/gyms/${id}`, data),
  bulkUpload: (gyms) => API.post('/gyms/bulk-upload', { gyms }),
};

export const requestService = {
  submitOptIn: (data) => API.post('/requests', data),
  getMyRequests: () => API.get('/requests/my-requests'),
  getAllOptIns: (params) => API.get('/requests/hr/all', { params }),
  updateStatus: (id, status, cultFitMemberId, serviceNote) =>
    API.patch(`/requests/${id}/status`, {
      ...(status ? { status } : {}),
      ...(cultFitMemberId ? { cultFitMemberId } : {}),
      ...(serviceNote !== undefined ? { serviceNote } : {}),
    }),
};

export const hrService = {
  getDashboardKPIs: () => API.get('/hr/dashboard-kpis'),
  getAuditLogs: (params) => API.get('/hr/audit-logs', { params }),
  logExport: (kind, rows) => API.post('/hr/exports', { kind, rows }),
  getUsersAccess: () => API.get('/hr/users-access'),
  searchUsers: (q) => API.get('/hr/users/search', { params: { q } }),
  updateUserAccess: (id, data) => API.patch(`/hr/users/${id}`, data),
  createSubAdmin: (data) => API.post('/hr/sub-admin', data),
};
