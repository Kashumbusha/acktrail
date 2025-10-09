import { useState } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { validateEmailList, validateCSV } from '../utils/validators';

export default function RecipientUploader({ onRecipientsChange, disabled = false }) {
  const [activeTab, setActiveTab] = useState('paste');
  const [emailText, setEmailText] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [validation, setValidation] = useState({ valid: true, emails: [] });

  const handleEmailTextChange = (text) => {
    setEmailText(text);
    const result = validateEmailList(text);
    setValidation(result);
    onRecipientsChange(result.valid ? result.emails : []);
  };

  const handleFileSelect = (file) => {
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target.result;
        const result = validateCSV(csvContent);
        setValidation(result);
        onRecipientsChange(result.valid ? result.emails : []);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv');
    if (csvFile) {
      handleFileSelect(csvFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const resetUploader = () => {
    setEmailText('');
    setCsvFile(null);
    setValidation({ valid: true, emails: [] });
    onRecipientsChange([]);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Add Recipients</h3>
        <p className="text-sm text-gray-600">
          Add email addresses for policy recipients using one of the methods below.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('paste')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            disabled={disabled}
          >
            Paste Emails
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            disabled={disabled}
          >
            Upload CSV
          </button>
        </nav>
      </div>

      {/* Paste Emails Tab */}
      {activeTab === 'paste' && (
        <div>
          <label htmlFor="emails" className="block text-sm font-medium text-gray-700 mb-2">
            Email Addresses
          </label>
          <textarea
            id="emails"
            rows={6}
            value={emailText}
            onChange={(e) => handleEmailTextChange(e.target.value)}
            placeholder="Enter email addresses, separated by commas or new lines:

user1@example.com
user2@example.com
user3@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={disabled}
          />
          <p className="mt-1 text-xs text-gray-500">
            Separate multiple emails with commas or new lines
          </p>
        </div>
      )}

      {/* Upload CSV Tab */}
      {activeTab === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="csv-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Upload a CSV file
                </span>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="sr-only"
                  disabled={disabled}
                />
              </label>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              CSV must contain an 'email' column
            </p>
          </div>

          {csvFile && (
            <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{csvFile.name}</span>
              </div>
              <button
                onClick={() => {
                  setCsvFile(null);
                  resetUploader();
                }}
                className="text-sm text-red-600 hover:text-red-800"
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Validation Results */}
      {validation && !validation.valid && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Validation Errors</h4>
              {validation.error && (
                <p className="text-sm text-red-700 mt-1">{validation.error}</p>
              )}
              {validation.invalidEmails && validation.invalidEmails.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-red-700">Invalid email addresses:</p>
                  <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                    {validation.invalidEmails.slice(0, 5).map((email, index) => (
                      <li key={index}>{email}</li>
                    ))}
                    {validation.invalidEmails.length > 5 && (
                      <li>...and {validation.invalidEmails.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
              {validation.invalidRows && validation.invalidRows.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-red-700">Invalid rows in CSV:</p>
                  <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                    {validation.invalidRows.slice(0, 5).map((row, index) => (
                      <li key={index}>Row {row.row}: {row.email}</li>
                    ))}
                    {validation.invalidRows.length > 5 && (
                      <li>...and {validation.invalidRows.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {validation && validation.valid && validation.emails.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-2">
              <p className="text-sm text-green-800">
                Successfully added {validation.emails.length} valid email{validation.emails.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clear Button */}
      {(emailText || csvFile) && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={resetUploader}
            className="text-sm text-gray-600 hover:text-gray-800"
            disabled={disabled}
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
