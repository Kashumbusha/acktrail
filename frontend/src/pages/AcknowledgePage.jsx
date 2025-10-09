import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ackAPI } from '../api/client';
import { QUERY_KEYS } from '../utils/constants';
import PolicyViewer from '../components/PolicyViewer';
import AcknowledgeForm from '../components/AcknowledgeForm';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AcknowledgePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const { 
    data: ackPageData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: QUERY_KEYS.ACKNOWLEDGMENT(token),
    queryFn: () => ackAPI.get(token).then(res => res.data),
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (formData) => ackAPI.submit(token, formData),
    onSuccess: (response) => {
      toast.success('Acknowledgment submitted successfully');
      navigate('/success', { 
        state: { 
          policyTitle: ackPageData?.policy_title,
          submittedAt: response.data.created_at,
          assignmentId: ackPageData?.assignment_id
        }
      });
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Failed to submit acknowledgment';
      toast.error(message);
      setSubmitting(false);
    },
  });

  const handleSubmit = (formData) => {
    setSubmitting(true);
    submitMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    const is401 = error.response?.status === 401;
    const is404 = error.response?.status === 404;
    const isExpired = is401 && error.response?.data?.detail?.includes('expired');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {is404 ? 'Invalid Link' : isExpired ? 'Link Expired' : 'Access Denied'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {is404 
              ? 'This acknowledgment link is invalid or does not exist.'
              : isExpired 
              ? 'This acknowledgment link has expired.'
              : 'Unable to access this acknowledgment page.'
            }
          </p>
          <p className="text-xs text-gray-500">
            Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (!ackPageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
          <div className="text-gray-500">No acknowledgment data found</div>
        </div>
      </div>
    );
  }

  // Check if already acknowledged
  if (ackPageData.already_acknowledged) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Already Acknowledged
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            You have already acknowledged this policy.
          </p>
          <div className="text-xs text-gray-500">
            <div>Policy: {ackPageData.policy_title}</div>
            <div>Version: {ackPageData.policy_version}</div>
          </div>
        </div>
      </div>
    );
  }

  // Check if expired
  if (ackPageData.is_expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Policy Acknowledgment Expired
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            The deadline for acknowledging this policy has passed.
          </p>
          <div className="text-xs text-gray-500">
            <div>Policy: {ackPageData.policy_title}</div>
            <div>Please contact your administrator for assistance.</div>
          </div>
        </div>
      </div>
    );
  }

  // Create policy object for PolicyViewer
  const policy = {
    title: ackPageData.policy_title,
    body_markdown: ackPageData.policy_body_markdown,
    file_url: ackPageData.policy_file_url,
    version: ackPageData.policy_version
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Policy Acknowledgment Required
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Please review the policy below and complete the acknowledgment form
            </p>
            
            {/* Policy info */}
            <div className="mt-4 text-sm text-gray-500">
              <div className="flex justify-center space-x-6">
                <span>Policy: <strong>{ackPageData.policy_title}</strong></span>
                <span>Version: <strong>{ackPageData.policy_version}</strong></span>
                <span>For: <strong>{ackPageData.user_name}</strong></span>
              </div>
            </div>
          </div>

          {/* Policy Content */}
          <PolicyViewer policy={policy} />

          {/* Acknowledgment Form */}
          <AcknowledgeForm
            ackPageData={ackPageData}
            onSubmit={handleSubmit}
            loading={submitting}
          />

          {/* Footer */}
          <div className="text-center text-xs text-gray-500">
            <p>
              This is a secure acknowledgment page. Your information will be recorded and stored securely.
            </p>
            <p className="mt-1">
              IP address, browser information, and timestamp will be logged for verification purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}