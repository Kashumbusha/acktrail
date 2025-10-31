// Assignment status constants
export const ASSIGNMENT_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  ACKNOWLEDGED: 'acknowledged',
  OVERDUE: 'overdue',
  EXPIRED: 'expired',
};

// Policy status constants
export const POLICY_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

// File types
export const ALLOWED_FILE_TYPES = {
  PDF: 'application/pdf',
  MARKDOWN: 'text/markdown',
  TEXT: 'text/plain',
};

// File size limits
export const FILE_SIZE_LIMITS = {
  POLICY_FILE: 10 * 1024 * 1024, // 10MB
  CSV_FILE: 5 * 1024 * 1024, // 5MB
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy h:mm a',
  INPUT: 'yyyy-MM-dd',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    SEND_CODE: '/api/auth/send-code',
    VERIFY_CODE: '/api/auth/verify-code',
    ME: '/api/auth/me',
  },
  POLICIES: {
    LIST: '/api/policies',
    CREATE: '/api/policies',
    GET: (id) => `/api/policies/${id}`,
    UPDATE: (id) => `/api/policies/${id}`,
    DELETE: (id) => `/api/policies/${id}`,
    ADD_RECIPIENTS: (id) => `/api/policies/${id}/recipients`,
    SEND: (id) => `/api/policies/${id}/send`,
    ASSIGNMENTS: (id) => `/api/policies/${id}/assignments`,
    EXPORT_CSV: (id) => `/api/policies/${id}/export.csv`,
  },
  ASSIGNMENTS: {
    REMIND: (id) => `/api/assignments/${id}/remind`,
  },
  ACKNOWLEDGMENT: {
    GET: (token) => `/api/ack/${token}`,
    SUBMIT: (token) => `/api/ack/${token}`,
  },
  DASHBOARD: {
    STATS: '/api/dashboard/stats',
  },
  REPORTS: {
    SUMMARY: '/api/reports/summary',
    POLICIES: '/api/reports/policies',
  },
  ACTIVITY: {
    LOGS: '/api/activity/logs',
  },
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
};

// Query keys for React Query
export const QUERY_KEYS = {
  AUTH_USER: ['auth', 'user'],
  POLICIES: ['policies'],
  POLICY: (id) => ['policies', id],
  POLICY_ASSIGNMENTS: (id) => ['policies', id, 'assignments'],
  DASHBOARD_STATS: ['dashboard', 'stats'],
  REPORTS_SUMMARY: ['reports', 'summary'],
  REPORTS_POLICIES: (params = {}) => ['reports', 'policies', params],
  ACTIVITY_LOGS: (params = {}) => ['activity', 'logs', params],
  ACKNOWLEDGMENT: (token) => ['acknowledgment', token],
};

// Toast messages
export const TOAST_MESSAGES = {
  SUCCESS: {
    LOGIN: 'Successfully logged in',
    LOGOUT: 'Successfully logged out',
    POLICY_CREATED: 'Policy created successfully',
    POLICY_UPDATED: 'Policy updated successfully',
    POLICY_DELETED: 'Policy deleted successfully',
    RECIPIENTS_ADDED: 'Recipients added successfully',
    ASSIGNMENTS_SENT: 'Assignments sent successfully',
    REMINDER_SENT: 'Reminder sent successfully',
    ACKNOWLEDGMENT_SUBMITTED: 'Acknowledgment submitted successfully',
  },
  ERROR: {
    GENERIC: 'Something went wrong. Please try again.',
    NETWORK: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    INVALID_CODE: 'Invalid verification code.',
    FILE_TOO_LARGE: 'File is too large.',
    INVALID_FILE_TYPE: 'Invalid file type.',
  },
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// Validation rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  VERIFICATION_CODE_REGEX: /^\d{6}$/,
  PASSWORD_MIN_LENGTH: 8,
};

// Feature flags
export const FEATURES = {
  DARK_MODE: false,
  NOTIFICATIONS: true,
  ANALYTICS: false,
};