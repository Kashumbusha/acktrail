import { format, formatDistanceToNow, isValid } from 'date-fns';

// Date formatting utilities
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, formatStr);
};

export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy h:mm a');
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(dateObj)) return '';
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

// Status badge utilities
export const getStatusBadgeClass = (status) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  switch (status?.toLowerCase()) {
    case 'pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'acknowledged':
    case 'completed':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'overdue':
    case 'expired':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'sent':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'in progress':
    case 'in_progress':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'draft':
      return `${baseClasses} bg-gray-100 text-gray-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

export const getStatusText = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'Pending';
    case 'acknowledged':
      return 'Acknowledged';
    case 'completed':
      return 'Completed';
    case 'overdue':
      return 'Overdue';
    case 'expired':
      return 'Expired';
    case 'sent':
      return 'Sent';
    case 'draft':
      return 'Draft';
    case 'in_progress':
    case 'in progress':
      return 'In Progress';
    default:
      return status || 'Unknown';
  }
};

// File size formatting
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// Number formatting
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Email formatting
export const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return `${local.substring(0, 2)}***@${domain}`;
};

// Percentage formatting
export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};
