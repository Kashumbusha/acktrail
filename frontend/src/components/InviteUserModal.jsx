import { useState } from 'react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

export default function InviteUserModal({ isOpen, onClose, onInvite, loading = false }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'employee',
    is_guest: false,
    can_login: true,
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onInvite(formData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        email: '',
        name: '',
        role: 'employee',
        is_guest: false,
        can_login: true,
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-slate-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-slate-900 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
            Invite User
          </h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="user@example.com"
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="John Doe"
              disabled={loading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Role Field */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Role *
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
              disabled={loading}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* User Type Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="is_guest"
                  type="checkbox"
                  checked={formData.is_guest}
                  onChange={(e) => {
                    const isGuest = e.target.checked;
                    setFormData(prev => ({
                      ...prev,
                      is_guest: isGuest,
                      can_login: !isGuest // Auto-disable login for guests
                    }));
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
              <div className="ml-3">
                <label htmlFor="is_guest" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Guest User
                </label>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Guest users are external users (e.g., contractors, vendors)
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="can_login"
                  type="checkbox"
                  checked={formData.can_login}
                  onChange={(e) => handleInputChange('can_login', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={loading || formData.is_guest}
                />
              </div>
              <div className="ml-3">
                <label htmlFor="can_login" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Can Login
                </label>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Allow this user to log into the system
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Invite User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
