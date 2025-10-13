import { useState } from 'react';
import { usersAPI } from '../api/client';
import { isValidEmail } from '../utils/validators';
import toast from 'react-hot-toast';

const initialForm = {
  name: '',
  email: '',
  company: '',
  role: '',
  teamSize: '',
  country: '',
  goal: ''
};

export default function DemoRequestModal({ open, onClose }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (!form.email.trim() || !isValidEmail(form.email)) nextErrors.email = 'Valid email is required';
    if (!form.company.trim()) nextErrors.company = 'Company is required';
    if (!form.role.trim()) nextErrors.role = 'Role is required';
    if (!form.teamSize.trim()) nextErrors.teamSize = 'Team size is required';
    if (!form.country.trim()) nextErrors.country = 'Country is required';
    if (!form.goal.trim()) nextErrors.goal = 'Let us know what you want to solve';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const messageLines = [
        'New demo request:',
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        `Company: ${form.company || 'n/a'}`,
        `Role: ${form.role || 'n/a'}`,
        `Team size: ${form.teamSize || 'n/a'}`,
        `Country: ${form.country || 'n/a'}`,
        `Goals: ${form.goal}`
      ];

      await usersAPI.contactSupport({
        message: messageLines.join('\n'),
        from_email: form.email,
        name: form.name,
        company: form.company,
        role: form.role,
        team_size: form.teamSize,
        country: form.country,
        goal: form.goal,
        source: 'demo_modal'
      });

      toast.success('Thanks! We\'ll reach out shortly.');
      setForm(initialForm);
      onClose?.();
    } catch (error) {
      // Error toast handled by interceptor; leave here for silent catch
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !loading) {
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Book a live walkthrough</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tell us about your team and we&apos;ll schedule a personalised session.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Full name"
              value={form.name}
              onChange={(value) => handleChange('name', value)}
              error={errors.name}
              autoFocus
            />
            <InputField
              label="Work email"
              value={form.email}
              onChange={(value) => handleChange('email', value)}
              error={errors.email}
              type="email"
            />
            <InputField
              label="Company"
              value={form.company}
              onChange={(value) => handleChange('company', value)}
              error={errors.company}
            />
            <InputField
              label="Role"
              value={form.role}
              onChange={(value) => handleChange('role', value)}
              error={errors.role}
            />
            <InputField
              label="Team size"
              value={form.teamSize}
              onChange={(value) => handleChange('teamSize', value)}
              error={errors.teamSize}
              placeholder="e.g. 25"
            />
            <InputField
              label="Country"
              value={form.country}
              onChange={(value) => handleChange('country', value)}
              error={errors.country}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              What do you want to solve with Acktrail?
            </label>
            <textarea
              value={form.goal}
              onChange={(event) => handleChange('goal', event.target.value)}
              rows={4}
              className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${
                errors.goal ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'
              }`}
              placeholder="Share the compliance headaches, audits, or policy challenges you want to streamline."
              disabled={loading}
            />
            {errors.goal && <p className="mt-1 text-xs text-red-600">{errors.goal}</p>}
          </div>

        <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We respond to every request within one business day.
            </p>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              ) : null}
              {loading ? 'Sending...' : 'Request demo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, error, type = 'text', placeholder, autoFocus = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
