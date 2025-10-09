// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate email list (comma or newline separated)
export const validateEmailList = (emailString) => {
  if (!emailString) return { valid: true, emails: [] };
  
  const emails = emailString
    .split(/[,\n]/)
    .map(email => email.trim())
    .filter(email => email.length > 0);
  
  const invalidEmails = emails.filter(email => !isValidEmail(email));
  
  return {
    valid: invalidEmails.length === 0,
    emails: emails,
    invalidEmails: invalidEmails,
  };
};

// Validate 6-digit code
export const isValidVerificationCode = (code) => {
  return /^\d{6}$/.test(code);
};

// Policy validation
export const validatePolicy = (policy) => {
  const errors = {};
  
  if (!policy.title?.trim()) {
    errors.title = 'Title is required';
  }
  
  if (!policy.content?.trim()) {
    errors.content = 'Content is required';
  }
  
  if (policy.due_date) {
    const dueDate = new Date(policy.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      errors.due_date = 'Due date cannot be in the past';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// File validation
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['application/pdf', 'text/markdown', 'text/plain'],
  } = options;
  
  const errors = [];
  
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${formatFileSize(maxSize)}`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// CSV validation
export const validateCSV = (csvContent) => {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { valid: false, error: 'CSV is empty' };
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIndex = headers.findIndex(h => h.includes('email'));
    
    if (emailIndex === -1) {
      return { valid: false, error: 'CSV must contain an email column' };
    }
    
    const emails = [];
    const invalidRows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const email = row[emailIndex]?.trim();
      
      if (email && isValidEmail(email)) {
        emails.push(email);
      } else if (email) {
        invalidRows.push({ row: i + 1, email });
      }
    }
    
    return {
      valid: invalidRows.length === 0,
      emails,
      invalidRows,
      totalRows: lines.length - 1,
    };
  } catch (error) {
    return { valid: false, error: 'Invalid CSV format' };
  }
};

// Format file size helper
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};