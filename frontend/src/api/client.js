import axios from 'axios';
import toast from 'react-hot-toast';

// Prefer explicit VITE_API_URL; otherwise default to same-origin to work in production
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Handle subscription expired (402 Payment Required)
    if (error.response?.status === 402) {
      const message = error.response?.data?.detail || 'Your trial has expired. Please subscribe to continue.';
      toast.error(message, { duration: 6000 });

      // Redirect to pricing page to select a plan
      setTimeout(() => {
        window.location.href = '/pricing';
      }, 2000);

      return Promise.reject(error);
    }

    const message = error.response?.data?.detail || error.response?.data?.message || 'An error occurred';
    toast.error(message);

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  sendCode: (email, workspaceId) => apiClient.post('/api/auth/send-code', { email, workspace_id: workspaceId }),
  verifyCode: (email, code, workspaceId) => apiClient.post('/api/auth/verify-code', { email, code, workspace_id: workspaceId }),
  loginPassword: (email, password, workspaceId) => apiClient.post('/api/auth/login-password', { email, password, workspace_id: workspaceId }),
  verifyMagicLink: (token, workspaceId) => apiClient.post('/api/auth/verify-magic-link', { token, workspace_id: workspaceId }),
  setPassword: (password) => apiClient.post('/api/auth/set-password', { password }),
  getMe: () => apiClient.get('/api/auth/me'),
};

// Teams/Workspace API
export const teamsAPI = {
  register: (teamName, email, plan = 'small', ssoEnabled = false, firstName = '', lastName = '', phone = '', country = '', password = '', staffCount = 1, billingInterval = 'month') =>
    apiClient.post('/api/teams/register', {
      team_name: teamName,
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      country,
      password,
      plan,
      sso_enabled: ssoEnabled,
      staff_count: staffCount,
      billing_interval: billingInterval
    }),
  checkWorkspace: (workspaceName) => apiClient.post('/api/teams/check-workspace', { workspace_name: workspaceName }),
  list: () => apiClient.get('/api/teams/list'),
  get: (id) => apiClient.get(`/api/teams/${id}`),
  create: (name) => apiClient.post('/api/teams/create', { name }),
  update: (id, name) => apiClient.patch(`/api/teams/${id}`, { name }),
  delete: (id) => apiClient.delete(`/api/teams/${id}`),
  addMember: (teamId, userId) => apiClient.post(`/api/teams/${teamId}/members`, { user_id: userId }),
  removeMember: (teamId, userId) => apiClient.delete(`/api/teams/${teamId}/members/${userId}`),
};

// Policies API
export const policiesAPI = {
  list: () => apiClient.get('/api/policies/'),
  create: (data) => {
    // Ensure multipart when sending FormData (file uploads)
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    return apiClient.post('/api/policies/', data, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
  },
  get: (id) => apiClient.get(`/api/policies/${id}`),
  update: (id, data) => {
    // Ensure multipart when sending FormData (file uploads)
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    return apiClient.put(`/api/policies/${id}`, data, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
  },
  delete: (id) => apiClient.delete(`/api/policies/${id}`),
  addRecipients: (id, recipientsData) => apiClient.post(`/api/policies/${id}/recipients`, {
    recipients: recipientsData.recipients,
    include_admins: recipientsData.includeAdmins
  }),
  send: (id) => apiClient.post(`/api/policies/${id}/send`, { assignment_ids: null }),
  getAssignments: (id) => apiClient.get(`/api/policies/${id}/assignments`),
  exportCSV: (id) => apiClient.get(`/api/policies/${id}/export.csv`, { responseType: 'blob' }),
  sendBulkReminders: (id) => apiClient.post(`/api/policies/${id}/remind-all`),
};

// Assignments API
export const assignmentsAPI = {
  remind: (id) => apiClient.post(`/api/assignments/${id}/remind`),
  delete: (id) => apiClient.delete(`/api/assignments/${id}`),
  regenerateLink: (id) => apiClient.post(`/api/assignments/${id}/regenerate-link`),
  selfMagicLink: (id) => apiClient.post(`/api/assignments/${id}/magic-link`),
};

// Create a separate axios instance for acknowledgment API (no auth required)
const ackClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Acknowledgment API (no auth required)
export const ackAPI = {
  get: (token) => ackClient.get(`/api/ack/${token}`),
  submit: (token, data) => ackClient.post(`/api/ack/${token}`, data),
  downloadReceipt: (assignmentId) => ackClient.get(`/api/ack/assignment/${assignmentId}/receipt.pdf`, { responseType: 'blob' }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => apiClient.get('/api/dashboard/stats'),
  exportWorkspaceData: () => apiClient.get('/api/dashboard/workspace/export.csv', { responseType: 'blob' }),
};

// Reports API
export const reportsAPI = {
  getSummary: () => apiClient.get('/api/reports/summary').then(res => res.data),
  getPolicies: (params = {}) => apiClient.get('/api/reports/policies', { params }).then(res => res.data),
};

// Activity API
export const activityAPI = {
  getLogs: (params = {}) => apiClient.get('/api/activity/logs', { params }).then(res => res.data),
};

// Users API
export const usersAPI = {
  list: (params) => apiClient.get('/api/users/', { params }),
  invite: (data) => apiClient.post('/api/users/invite', data),
  update: (id, data) => apiClient.patch(`/api/users/${id}`, data),
  delete: (id) => apiClient.delete(`/api/users/${id}`),
  updateProfile: (data) => apiClient.patch('/api/users/me', data),
  getAssignments: (id) => apiClient.get(`/api/users/${id}/assignments`),
  getMyAssignments: (params) => apiClient.get('/api/users/me/assignments', { params }),
  exportMyAssignments: () => apiClient.get('/api/users/me/assignments/export.csv', { responseType: 'blob' }),
  changePassword: (data) => apiClient.post('/api/auth/change-password', data),
  contactSupport: (data) => apiClient.post('/api/support/contact', {
    message: data.message,
    from_email: data.from_email || data.from,
    name: data.name,
    company: data.company,
    role: data.role,
    team_size: data.team_size,
    country: data.country,
    goal: data.goal,
    source: data.source,
  }),
};

// Platform API (for platform admins)
export const platformAPI = {
  stats: () => apiClient.get('/api/platform/stats'),
  workspaces: (params) => apiClient.get('/api/platform/workspaces', { params }),
};

// Notifications API
export const notificationsAPI = {
  list: (params) => apiClient.get('/api/notifications', { params }),
  getUnreadCount: () => apiClient.get('/api/notifications/unread-count'),
  markAsRead: (id) => apiClient.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => apiClient.put('/api/notifications/mark-all-read'),
  delete: (id) => apiClient.delete(`/api/notifications/${id}`),
};

// Payments API
export const paymentsAPI = {
  createCheckoutSession: (plan, staffCount, interval = 'month', ssoEnabled = false) =>
    apiClient.post('/api/payments/create-checkout-session', {
      plan,
      staff_count: staffCount,
      interval,
      sso_enabled: ssoEnabled
    }),
  getSubscription: () => apiClient.get('/api/payments/subscription'),
  updateSubscription: (data) => apiClient.post('/api/payments/subscription/update', data),
  cancelSubscription: () => apiClient.post('/api/payments/subscription/cancel'),
  createCustomerPortal: () => apiClient.post('/api/payments/customer-portal'),
  listInvoices: (limit = 10) => apiClient.get('/api/payments/invoices', { params: { limit } }),
  getUpcomingInvoice: () => apiClient.get('/api/payments/upcoming-invoice'),
};

// SSO API
export const ssoAPI = {
  getConfig: () => apiClient.get('/api/sso/config').then(res => res.data),
  createConfig: (data) => apiClient.post('/api/sso/config', data).then(res => res.data),
  updateConfig: (data) => apiClient.patch('/api/sso/config', data).then(res => res.data),
  deleteConfig: () => apiClient.delete('/api/sso/config').then(res => res.data),
  testConfig: () => apiClient.post('/api/sso/test').then(res => res.data),
  getStatus: () => apiClient.get('/api/sso/status').then(res => res.data),
  getPublicStatus: (workspaceId) => apiClient.get('/api/sso/status/public', { params: { workspace_id: workspaceId } }).then(res => res.data),
};

export default apiClient;
