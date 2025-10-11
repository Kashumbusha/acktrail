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
    
    const message = error.response?.data?.detail || error.response?.data?.message || 'An error occurred';
    toast.error(message);
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  sendCode: (email) => apiClient.post('/api/auth/send-code', { email }),
  verifyCode: (email, code) => apiClient.post('/api/auth/verify-code', { email, code }),
  getMe: () => apiClient.get('/api/auth/me'),
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
  update: (id, data) => apiClient.put(`/api/policies/${id}`, data),
  delete: (id) => apiClient.delete(`/api/policies/${id}`),
  addRecipients: (id, recipients) => apiClient.post(`/api/policies/${id}/recipients`, { recipients }),
  send: (id) => apiClient.post(`/api/policies/${id}/send`, { assignment_ids: null }),
  getAssignments: (id) => apiClient.get(`/api/policies/${id}/assignments`),
  exportCSV: (id) => apiClient.get(`/api/dashboard/policies/${id}/export.csv`, { responseType: 'blob' }),
  sendBulkReminders: (id) => apiClient.post(`/api/policies/${id}/remind-all`),
};

// Assignments API
export const assignmentsAPI = {
  remind: (id) => apiClient.post(`/api/assignments/${id}/remind`),
  delete: (id) => apiClient.delete(`/api/policies/assignments/${id}`),
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
};

export default apiClient;