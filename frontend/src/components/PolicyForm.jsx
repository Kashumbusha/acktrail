import { useState, useEffect } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { validatePolicy, validateFile } from '../utils/validators';
import { formatDate } from '../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { teamsAPI } from '../api/client';

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
  const [targetAudience, setTargetAudience] = useState(policy?.target_audience || 'all_users'); // e.g., 'all_users', 'teams', 'manual'
  const [selectedTeams, setSelectedTeams] = useState(policy?.selected_teams || []);
  const [recipientsCount, setRecipientsCount] = useState(policy?.recipients_count || 0);
  const [acknowledgedCount, setAcknowledgedCount] = useState(policy?.acknowledged_count || 0);
  const [pendingCount, setPendingCount] = useState(policy?.pending_count || 0);
  const [nextReminder, setNextReminder] = useState(policy?.next_reminder || null); // Date string or null
  const [distributionInProgress, setDistributionInProgress] = useState(false);

  // Fetch teams for selection
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.list().then(res => res.data),
  });

  const teams = teamsData?.teams || [];

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

  const handleDistributePolicy = () => {
    setDistributionInProgress(true);
    // Simulate distribution progress
    let currentAcknowledged = 0;
    const totalRecipients = 100; // Dummy total recipients
    setRecipientsCount(totalRecipients);

    const interval = setInterval(() => {
      currentAcknowledged += Math.floor(Math.random() * 5) + 1; // Acknowledge 1-5 more
      if (currentAcknowledged >= totalRecipients) {
        currentAcknowledged = totalRecipients;
        clearInterval(interval);
        setDistributionInProgress(false);
        setNextReminder(null);
      } else {
        setNextReminder(new Date(Date.now() + 5 * 60 * 1000).toISOString()); // Next reminder in 5 minutes
      }
      setAcknowledgedCount(currentAcknowledged);
      setPendingCount(totalRecipients - currentAcknowledged);
    }, 1000);
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
      submitData.append('body_markdown', formData.content);
    }
    submitData.append('target_audience', targetAudience);

    // Add selected teams if team-based audience is selected
    if (targetAudience === 'teams' && selectedTeams.length > 0) {
      submitData.append('selected_teams', JSON.stringify(selectedTeams));
    }

    onSubmit(submitData);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Policy Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500 ${
            errors.title ? 'border-red-300 dark:border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter policy title"
          disabled={loading || distributionInProgress}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Brief description of the policy"
          disabled={loading || distributionInProgress}
        />
      </div>

      {/* Due Date */}
      <div>
        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Due Date (Optional)
        </label>
        <input
          type="date"
          id="due_date"
          value={formData.due_date}
          onChange={(e) => handleInputChange('due_date', e.target.value)}
          min={today}
          className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 ${
            errors.due_date ? 'border-red-300 dark:border-red-500' : 'border-gray-300'
          }`}
          disabled={loading || distributionInProgress}
        />
        {errors.due_date && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.due_date}</p>
        )}
      </div>

      {/* Target Audience */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Target Audience
        </label>
        <select
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          disabled={loading || distributionInProgress}
        >
          <option value="all_users">All Users</option>
          <option value="teams">Specific Teams</option>
          <option value="manual">Manual Selection</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Select who should acknowledge this policy.
        </p>

        {/* Team Selection - Show when Specific Teams is selected */}
        {targetAudience === 'teams' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Teams *
            </label>
            {teams.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No teams available. Create a team first to assign policies by team.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teams.map((team) => (
                  <label key={team.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(team.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeams([...selectedTeams, team.id]);
                        } else {
                          setSelectedTeams(selectedTeams.filter(id => id !== team.id));
                        }
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                      disabled={loading || distributionInProgress}
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{team.name}</span>
                  </label>
                ))}
              </div>
            )}
            {selectedTeams.length > 0 && (
              <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* Manual Selection Note */}
        {targetAudience === 'manual' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              After creating the policy, you'll be able to add recipients manually by email or CSV upload.
            </p>
          </div>
        )}
      </div>

      {/* Content Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content Type
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="text"
              checked={formData.content_type === 'text'}
              onChange={(e) => handleInputChange('content_type', e.target.value)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
              disabled={loading || distributionInProgress}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Text Content</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="pdf"
              checked={formData.content_type === 'pdf'}
              onChange={(e) => handleInputChange('content_type', e.target.value)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
              disabled={loading || distributionInProgress}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">PDF Upload</span>
          </label>
        </div>
      </div>

      {/* Content Input */}
      {formData.content_type === 'text' ? (
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Policy Content *
          </label>
          <textarea
            id="content"
            rows={12}
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 font-mono text-sm placeholder-gray-400 dark:placeholder-gray-500 ${
              errors.content ? 'border-red-300 dark:border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter or paste your policy text here..."
            disabled={loading || distributionInProgress}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Simply type or paste plain text. Markdown formatting is optional (e.g. # for headers, ** for bold).
          </p>
          {errors.content && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload PDF File *
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : errors.file || errors.content
                ? 'border-red-300 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            } ${loading || distributionInProgress ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <div className="mt-4">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                  Upload a PDF file
                </span>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="sr-only"
                  disabled={loading || distributionInProgress}
                />
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              PDF files up to 10MB
            </p>
          </div>

          {formData.file && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                  <div>
                    <span className="text-sm text-gray-900 dark:text-white">{formData.file.name}</span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
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
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  disabled={loading || distributionInProgress}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {errors.file && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.file}</p>
          )}
          {errors.content && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>
          )}
        </div>
      )}

      {/* Policy Distribution & Status */}
      {isEditing && ( // Only show distribution panel for existing policies
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Policy Distribution</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage the distribution and tracking of this policy.</p>

          <button
            type="button"
            onClick={handleDistributePolicy}
            className="btn btn-primary w-full sm:w-auto"
            disabled={loading || distributionInProgress}
          >
            {distributionInProgress ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Distributing...
              </div>
            ) : (
              'Distribute Policy'
            )}
          </button>

          {recipientsCount > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mt-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{recipientsCount}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Recipients</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{acknowledgedCount}</div>
                <div className="text-sm text-green-600 dark:text-green-400">Acknowledged</div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{pendingCount}</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Pending</div>
              </div>
            </div>
          )}

          {nextReminder && ( !distributionInProgress) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              Next reminder scheduled for: {formatDate(nextReminder)} ({formatRelativeTime(nextReminder)})
            </p>
          )}
          
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          disabled={loading || distributionInProgress}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || distributionInProgress}
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