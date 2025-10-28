import { useState, useEffect } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { validatePolicy, validateFile } from '../utils/validators';
import { useQuery } from '@tanstack/react-query';
import { teamsAPI } from '../api/client';
import RichTextEditor from './RichTextEditor';

export default function PolicyForm({ 
  policy = null, 
  onSubmit, 
  onCancel, 
  loading = false 
}) {
  const [formData, setFormData] = useState({
    title: policy?.title || '',
    description: policy?.description || '',
    content: policy?.body_markdown || '',
    due_date: policy?.due_at ? policy.due_at.split('T')[0] : '',
    file: null,
    fileHash: null,
    content_type: policy?.file_url ? 'pdf' : 'text',
  });
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [targetAudience, setTargetAudience] = useState(policy?.target_audience || 'all_users'); // e.g., 'all_users', 'teams', 'manual'
  const [selectedTeams, setSelectedTeams] = useState(policy?.selected_teams || []);
  const [questionsEnabled, setQuestionsEnabled] = useState(false);
  const [questions, setQuestions] = useState([]); // {prompt, choices[], correct_index}

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
      submitData.append('due_at', formData.due_date);
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

    // Questions (optional)
    submitData.append('questions_enabled', questionsEnabled ? 'true' : 'false');
    if (questionsEnabled) {
      // client-side validation
      if (questions.length === 0) {
        setErrors(prev => ({ ...prev, questions: 'Add at least one question or disable the toggle' }));
        return;
      }
      const sanitized = questions.map((q, idx) => ({
        prompt: (q.prompt || '').trim(),
        choices: (q.choices || []).map(c => (c || '').trim()).filter(Boolean),
        correct_index: typeof q.correct_index === 'number' ? q.correct_index : -1,
        order_index: idx,
      }));
      for (const q of sanitized) {
        if (!q.prompt) {
          setErrors(prev => ({ ...prev, questions: 'Each question needs a prompt' }));
          return;
        }
        if (q.choices.length < 2 || q.choices.length > 6) {
          setErrors(prev => ({ ...prev, questions: 'Each question must have 2 to 6 choices' }));
          return;
        }
        if (q.correct_index < 0 || q.correct_index >= q.choices.length) {
          setErrors(prev => ({ ...prev, questions: 'Select a correct answer for each question' }));
          return;
        }
      }
      submitData.append('questions_json', JSON.stringify(sanitized.slice(0, 5)));
    }

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
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
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
                      disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">PDF Upload</span>
          </label>
        </div>
      </div>

      {/* Content Input */}
      {formData.content_type === 'text' ? (
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Policy Content *
          </label>
          <RichTextEditor
            content={formData.content}
            onChange={(value) => handleInputChange('content', value)}
            placeholder="Enter your policy content here..."
            error={errors.content}
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Use the formatting toolbar to style your policy content. Supports bold, italic, headings, lists, colors, and more.
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
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                  disabled={loading}
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
                  disabled={loading}
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

      {/* Comprehension Questions (Optional) */}
      <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Require comprehension questions</span>
          <input
            type="checkbox"
            checked={questionsEnabled}
            onChange={(e) => setQuestionsEnabled(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
            disabled={loading}
          />
        </label>

        {questionsEnabled && (
          <div className="mt-4 space-y-6">
            {errors.questions && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.questions}</p>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400">Add 1 to 5 multiple-choice questions. Each needs 2+ options and one correct answer.</div>
            {questions.map((q, qi) => (
              <div key={qi} className="p-4 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700">
                <div className="flex items-start justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Question {qi + 1}</label>
                  <button type="button" className="text-xs text-red-600 dark:text-red-400" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>Remove</button>
                </div>
                <input
                  type="text"
                  value={q.prompt || ''}
                  onChange={(e) => setQuestions(questions.map((qq, i) => i === qi ? { ...qq, prompt: e.target.value } : qq))}
                  placeholder="Enter the question prompt"
                  className="mt-2 w-full px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={loading}
                />
                <div className="mt-3 space-y-2">
                  {(q.choices || []).map((choice, ci) => (
                    <div key={ci} className="flex items-center">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correct_index === ci}
                        onChange={() => setQuestions(questions.map((qq, i) => i === qi ? { ...qq, correct_index: ci } : qq))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500"
                        disabled={loading}
                      />
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) => setQuestions(questions.map((qq, i) => i === qi ? { ...qq, choices: (qq.choices || []).map((c, j) => j === ci ? e.target.value : c) } : qq))}
                        placeholder={`Option ${ci + 1}`}
                        className="ml-3 flex-1 px-3 py-2 border rounded-md shadow-sm bg-white dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setQuestions(questions.map((qq, i) => i === qi ? { ...qq, choices: (qq.choices || []).filter((_, j) => j !== ci) } : qq))}
                        className="ml-2 text-xs text-red-600 dark:text-red-400"
                      >Remove</button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setQuestions(questions.map((qq, i) => i === qi ? { ...qq, choices: [...(qq.choices || []), ''] } : qq))}
                    className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800"
                    disabled={loading || (q.choices || []).length >= 6}
                  >Add Option</button>
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">{questions.length}/5 questions</div>
              <button
                type="button"
                onClick={() => setQuestions([...questions, { prompt: '', choices: ['', ''], correct_index: -1 }])}
                className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800"
                disabled={loading || questions.length >= 5}
              >Add Question</button>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
