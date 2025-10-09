import { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

export default function AcknowledgeForm({ ackPageData, onSubmit, loading = false }) {
  const [formData, setFormData] = useState({
    signer_name: ackPageData?.user_name || '',
    signer_email: ackPageData?.user_email || '',
    typed_signature: '',
    acknowledged: false,
    ack_method: ackPageData?.require_typed_signature ? 'typed' : 'oneclick'
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.signer_name.trim()) {
      newErrors.signer_name = 'Name is required';
    }

    if (!formData.signer_email.trim()) {
      newErrors.signer_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.signer_email)) {
      newErrors.signer_email = 'Please enter a valid email address';
    }

    // Check if typed signature is required
    if (ackPageData?.require_typed_signature || formData.ack_method === 'typed') {
      if (!formData.typed_signature.trim()) {
        newErrors.typed_signature = 'Typed signature is required for this policy';
      }
    }

    if (!formData.acknowledged) {
      newErrors.acknowledged = 'You must acknowledge that you have read and understood the policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Prepare submission data according to backend API
      const submissionData = {
        signer_name: formData.signer_name,
        signer_email: formData.signer_email,
        ack_method: formData.ack_method
      };

      // Add typed signature if this is a typed acknowledgment
      if (formData.ack_method === 'typed' && formData.typed_signature) {
        submissionData.typed_signature = formData.typed_signature;
      }

      onSubmit(submissionData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMethodChange = (method) => {
    setFormData(prev => ({ ...prev, ack_method: method }));
    // Clear typed signature error if switching to one-click
    if (method === 'oneclick' && errors.typed_signature) {
      setErrors(prev => ({ ...prev, typed_signature: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Policy Acknowledgment
        </h3>
        <p className="text-sm text-gray-600">
          Please review the policy above and complete the acknowledgment form below.
        </p>
        {ackPageData?.require_typed_signature && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> This policy requires a typed signature for acknowledgment.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="signer_name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="signer_name"
            value={formData.signer_name}
            onChange={(e) => handleInputChange('signer_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
              errors.signer_name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your full name"
            disabled={loading}
          />
          {errors.signer_name && (
            <p className="mt-1 text-sm text-red-600">{errors.signer_name}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="signer_email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="signer_email"
            value={formData.signer_email}
            onChange={(e) => handleInputChange('signer_email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
              errors.signer_email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your email address"
            disabled={loading}
          />
          {errors.signer_email && (
            <p className="mt-1 text-sm text-red-600">{errors.signer_email}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Must match the email address this policy was sent to
          </p>
        </div>

        {/* Acknowledgment Method Selection */}
        {!ackPageData?.require_typed_signature && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Acknowledgment Method
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="oneclick"
                  type="radio"
                  name="ack_method"
                  value="oneclick"
                  checked={formData.ack_method === 'oneclick'}
                  onChange={(e) => handleMethodChange(e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  disabled={loading}
                />
                <label htmlFor="oneclick" className="ml-3 text-sm text-gray-700">
                  <strong>One-Click Acknowledgment</strong> - Quick acknowledgment with your name and email
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="typed"
                  type="radio"
                  name="ack_method"
                  value="typed"
                  checked={formData.ack_method === 'typed'}
                  onChange={(e) => handleMethodChange(e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  disabled={loading}
                />
                <label htmlFor="typed" className="ml-3 text-sm text-gray-700">
                  <strong>Typed Signature</strong> - Provide additional typed signature
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Typed Signature Field */}
        {(formData.ack_method === 'typed' || ackPageData?.require_typed_signature) && (
          <div>
            <label htmlFor="typed_signature" className="block text-sm font-medium text-gray-700 mb-1">
              Typed Signature *
            </label>
            <input
              type="text"
              id="typed_signature"
              value={formData.typed_signature}
              onChange={(e) => handleInputChange('typed_signature', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                errors.typed_signature ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Type your full name as your digital signature"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              By typing your name, you are providing your digital signature
            </p>
            {errors.typed_signature && (
              <p className="mt-1 text-sm text-red-600">{errors.typed_signature}</p>
            )}
          </div>
        )}

        {/* Acknowledgment Checkbox */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="acknowledged"
              type="checkbox"
              checked={formData.acknowledged}
              onChange={(e) => handleInputChange('acknowledged', e.target.checked)}
              className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                errors.acknowledged ? 'border-red-300' : ''
              }`}
              disabled={loading}
            />
          </div>
          <div className="ml-3">
            <label htmlFor="acknowledged" className="text-sm text-gray-700">
              I acknowledge that I have read, understood, and agree to comply with this policy. *
            </label>
            {errors.acknowledged && (
              <p className="mt-1 text-sm text-red-600">{errors.acknowledged}</p>
            )}
          </div>
        </div>

        {/* Policy Details */}
        <div className="bg-gray-50 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Policy Details</h4>
          <dl className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <dt>Policy Title:</dt>
              <dd className="font-medium">{ackPageData?.policy_title}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Version:</dt>
              <dd>{ackPageData?.policy_version}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Assignment ID:</dt>
              <dd className="font-mono">{ackPageData?.assignment_id}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Policy Hash:</dt>
              <dd className="font-mono text-xs break-all">{ackPageData?.policy_hash}</dd>
            </div>
          </dl>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <CheckIcon className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Submitting...' : 'Submit Acknowledgment'}
          </button>
        </div>
      </form>
    </div>
  );
}