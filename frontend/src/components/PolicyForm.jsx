import { useState } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { validatePolicy, validateFile } from '../utils/validators';
import { formatDate } from '../utils/formatters';

export default function PolicyForm({ 
  policy = null, 
  onSubmit, 
  onCancel, 
  loading = false 
}) {
  const [formData, setFormData] = useState({
    title: policy?.title || '',
    description: policy?.description || '',
    content: policy?.content || '',
    due_date: policy?.due_date ? policy.due_date.split('T')[0] : '',
    file: null,
    fileHash: null,
    content_type: policy?.content_type || 'text',
  });
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);

  const isEditing = !!policy;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateSHA256 = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, file: validation.errors.join(', ') }));
      return;
    }

    // Clear file errors
    setErrors(prev => ({ ...prev, file: '' }));

    try {
      // Calculate SHA-256 hash
      const fileHash = await calculateSHA256(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setFormData(prev => ({
          ...prev,
          file,
          fileHash,
          content: file.type === 'application/pdf' ? '' : content,
          content_type: file.type === 'application/pdf' ? 'pdf' : 'text',
        }));
      };
      
      if (file.type === 'application/pdf') {
        // For PDF files, we'll send the file itself
        setFormData(prev => ({
          ...prev,
          file,
          fileHash,
          content: '',
          content_type: 'pdf',
        }));
      } else {
        reader.readAsText(file);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, file: 'Failed to process file' }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const allowedTypes = ['application/pdf', 'text/markdown', 'text/plain'];
    const validFile = files.find(file => allowedTypes.includes(file.type));
    if (validFile) {
      handleFileSelect(validFile);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validatePolicy({
      title: formData.title,
      content: formData.content_type === 'pdf' ? (formData.file ? 'has_file' : '') : formData.content,
      due_date: formData.due_date
    });
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Additional validation for PDF upload
    if (formData.content_type === 'pdf' && !formData.file) {
      setErrors(prev => ({ ...prev, file: 'Please upload a PDF file' }));
      return;
    }

    // Create form data for file upload
    const submitData = new FormData();
    submitData.append('title', formData.title);
    if (formData.description) {
      submitData.append('description', formData.description);
    }
    submitData.append('content_type', formData.content_type);
    
    if (formData.due_date) {
      submitData.append('due_date', formData.due_date);
    }
    
    if (formData.file) {
      submitData.append('file', formData.file);
      if (formData.fileHash) {
        submitData.append('file_hash', formData.fileHash);
      }
    } else if (formData.content) {
      submitData.append('content', formData.content);
    }

    onSubmit(submitData);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Policy Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
            errors.title ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter policy title"
          disabled={loading}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Brief description of the policy"
          disabled={loading}
        />
      </div>

      {/* Due Date */}
      <div>
        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
          Due Date (Optional)
        </label>
        <input
          type="date"
          id="due_date"
          value={formData.due_date}
          onChange={(e) => handleInputChange('due_date', e.target.value)}
          min={today}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
            errors.due_date ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={loading}
        />
        {errors.due_date && (
          <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
        )}
      </div>

      {/* Content Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content Type
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="text"
              checked={formData.content_type === 'text'}
              onChange={(e) => handleInputChange('content_type', e.target.value)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              disabled={loading}
            />
            <span className="ml-2 text-sm text-gray-700">Text Content</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="pdf"
              checked={formData.content_type === 'pdf'}
              onChange={(e) => handleInputChange('content_type', e.target.value)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              disabled={loading}
            />
            <span className="ml-2 text-sm text-gray-700">PDF Upload</span>
          </label>
        </div>
      </div>

      {/* Content Input */}
      {formData.content_type === 'text' ? (
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Policy Content *
          </label>
          <textarea
            id="content"
            rows={12}
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm ${
              errors.content ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter policy content (supports Markdown formatting)"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">
            You can use Markdown formatting for headers, lists, and emphasis
          </p>
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload PDF File *
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50'
                : errors.file || errors.content
                ? 'border-red-300'
                : 'border-gray-300 hover:border-gray-400'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Upload a PDF file
                </span>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="sr-only"
                  disabled={loading}
                />
              </label>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              PDF files up to 10MB
            </p>
          </div>

          {formData.file && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <span className="text-sm text-gray-900">{formData.file.name}</span>
                    <div className="text-xs text-gray-500">
                      {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                      {formData.fileHash && (
                        <span className="ml-2">• SHA-256: {formData.fileHash.substring(0, 16)}...</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, file: null, fileHash: null, content: '' }));
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {errors.file && (
            <p className="mt-1 text-sm text-red-600">{errors.file}</p>
          )}
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isEditing ? 'Updating...' : 'Creating...'}
            </div>
          ) : (
            isEditing ? 'Update Policy' : 'Create Policy'
          )}
        </button>
      </div>
    </form>
  );
}