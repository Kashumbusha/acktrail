import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  PencilIcon, 
  UserPlusIcon, 
  PaperAirplaneIcon,
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { policiesAPI, assignmentsAPI } from '../api/client';
import { QUERY_KEYS } from '../utils/constants';
import { formatDate, getStatusBadgeClass, getStatusText } from '../utils/formatters';
import PolicyViewer from '../components/PolicyViewer';
import AssignmentTable from '../components/AssignmentTable';
import RecipientUploader from '../components/RecipientUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function PolicyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddRecipients, setShowAddRecipients] = useState(false);
  const [recipients, setRecipients] = useState({ recipients: [], includeAdmins: false });

  const { 
    data: policy, 
    isLoading: policyLoading, 
    error: policyError 
  } = useQuery({
    queryKey: QUERY_KEYS.POLICY(id),
    queryFn: () => policiesAPI.get(id).then(res => res.data),
    enabled: !!id,
  });

  const { 
    data: assignments, 
    isLoading: assignmentsLoading,
    refetch: refetchAssignments
  } = useQuery({
    queryKey: QUERY_KEYS.POLICY_ASSIGNMENTS(id),
    queryFn: () => policiesAPI.getAssignments(id).then(res => res.data),
    enabled: !!id,
  });

  const addRecipientsMutation = useMutation({
    mutationFn: ({ policyId, recipients }) => 
      policiesAPI.addRecipients(policyId, recipients),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POLICY_ASSIGNMENTS(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POLICY(id) });
      toast.success('Recipients added successfully');
      setShowAddRecipients(false);
      setRecipients({ recipients: [], includeAdmins: false });
    },
    onError: () => {
      toast.error('Failed to add recipients');
    },
  });

  const sendAssignmentsMutation = useMutation({
    mutationFn: (policyId) => policiesAPI.send(policyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POLICY_ASSIGNMENTS(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POLICY(id) });
      toast.success('Assignments sent successfully');
    },
    onError: () => {
      toast.error('Failed to send assignments');
    },
  });

  const remindMutation = useMutation({
    mutationFn: (assignmentId) => assignmentsAPI.remind(assignmentId),
    onSuccess: (response) => {
      refetchAssignments();
      const data = response.data;
      toast.success(data.message);
      if (data.max_reminders_reached) {
        toast.info('Maximum reminders reached for this assignment');
      }
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Failed to send reminder';
      toast.error(message);
    },
  });

  const exportMutation = useMutation({
    mutationFn: (policyId) => policiesAPI.exportCSV(policyId),
    onSuccess: (response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `policy-${id}-assignments.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    },
    onError: () => {
      toast.error('Failed to export CSV');
    },
  });

  const bulkRemindMutation = useMutation({
    mutationFn: (policyId) => policiesAPI.sendBulkReminders(policyId),
    onSuccess: (response) => {
      refetchAssignments();
      const { sent_reminders, failed_reminders, max_reached_count } = response.data;
      if (sent_reminders > 0) {
        toast.success(`${sent_reminders} reminder(s) sent successfully`);
      }
      if (failed_reminders.length > 0) {
        toast.error(`${failed_reminders.length} reminder(s) failed to send`);
      }
      if (max_reached_count > 0) {
        toast.info(`${max_reached_count} assignment(s) already at maximum reminders`);
      }
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Failed to send bulk reminders';
      toast.error(message);
    },
  });

  const handleAddRecipients = () => {
    if (recipients.recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    addRecipientsMutation.mutate({ policyId: id, recipients });
  };

  const handleSendAssignments = () => {
    sendAssignmentsMutation.mutate(id);
  };

  const handleRemind = (assignmentId) => {
    remindMutation.mutate(assignmentId);
  };

  const deleteMutation = useMutation({
    mutationFn: (assignmentId) => assignmentsAPI.delete(assignmentId),
    onSuccess: () => {
      refetchAssignments();
      toast.success('Assignment deleted successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Failed to delete assignment';
      toast.error(message);
    },
  });

  const handleDelete = (assignmentId) => {
    deleteMutation.mutate(assignmentId);
  };

  const resendLinkMutation = useMutation({
    mutationFn: (assignmentId) => assignmentsAPI.regenerateLink(assignmentId),
    onSuccess: (response) => {
      refetchAssignments();
      const data = response.data;
      toast.success(data.message || 'Fresh link sent successfully');

      // Copy the magic link to clipboard
      if (data.magic_link_url) {
        navigator.clipboard.writeText(data.magic_link_url).then(() => {
          toast.success('Magic link copied to clipboard!', { icon: '📋' });
        }).catch(() => {
          toast.error('Failed to copy link to clipboard');
        });
      }
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Failed to regenerate link';
      toast.error(message);
    },
  });

  const handleResendLink = (assignmentId) => {
    resendLinkMutation.mutate(assignmentId);
  };

  const handleExport = () => {
    exportMutation.mutate(id);
  };

  const handleBulkRemind = () => {
    const eligibleAssignments = assignments?.assignments?.filter(
      assignment => (assignment.status === 'pending' || assignment.status === 'viewed') && 
                   (assignment.reminder_count || 0) < 3
    ) || [];
    
    if (eligibleAssignments.length === 0) {
      toast.info('No assignments eligible for reminders');
      return;
    }
    
    if (window.confirm(`Send reminders to ${eligibleAssignments.length} eligible assignments?`)) {
      bulkRemindMutation.mutate(id);
    }
  };

  if (policyLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (policyError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load policy</div>
        <Link to="/policies" className="text-indigo-600 hover:text-indigo-500">
          Back to policies
        </Link>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">Policy not found</div>
        <Link to="/policies" className="text-indigo-600 hover:text-indigo-500">
          Back to policies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/policies')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to policies
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBulkRemind}
            disabled={bulkRemindMutation.isPending}
            className="inline-flex items-center px-3 py-2 border border-orange-300 shadow-sm text-sm leading-4 font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
          >
            {bulkRemindMutation.isPending ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <BellIcon className="-ml-0.5 mr-2 h-4 w-4" />
            )}
            {bulkRemindMutation.isPending ? 'Sending...' : 'Send Bulk Reminders'}
          </button>
          
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <DocumentArrowDownIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Export CSV
          </button>
          
          <Link
            to={`/policies/${id}/edit`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Policy Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{policy.title}</h1>
            {policy.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{policy.description}</p>
            )}
            <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div>
                <span className="font-medium">Status:</span>
                <span className={`ml-2 ${getStatusBadgeClass(policy.status)}`}>
                  {getStatusText(policy.status)}
                </span>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <span className="ml-2">{formatDate(policy.created_at)}</span>
              </div>
              {policy.due_date && (
                <div>
                  <span className="font-medium">Due:</span>
                  <span className="ml-2">{formatDate(policy.due_date)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Policy Content */}
      <PolicyViewer policy={policy} />

      {/* Assignment Management */}
      <div className="space-y-6">
        {/* Add Recipients Section */}
        {!showAddRecipients ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recipients</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage who needs to acknowledge this policy
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddRecipients(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add Recipients
                </button>
                {assignments && assignments.assignments && assignments.assignments.length > 0 && (
                  <button
                    onClick={handleSendAssignments}
                    disabled={sendAssignmentsMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {sendAssignmentsMutation.isPending ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <PaperAirplaneIcon className="-ml-1 mr-2 h-5 w-5" />
                    )}
                    {sendAssignmentsMutation.isPending ? 'Sending...' : 'Send Assignments'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <RecipientUploader
              onRecipientsChange={setRecipients}
              disabled={addRecipientsMutation.isPending}
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddRecipients(false);
                  setRecipients({ recipients: [], includeAdmins: false });
                }}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={addRecipientsMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecipients}
                disabled={addRecipientsMutation.isPending || recipients.recipients.length === 0}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {addRecipientsMutation.isPending ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    Adding...
                  </div>
                ) : (() => {
                  // Check if we're dealing with teams (team:uuid format)
                  const isTeamSelection = recipients.recipients.some(r => r.startsWith('team:'));
                  if (isTeamSelection) {
                    const teamCount = recipients.recipients.length;
                    return `Add ${teamCount} Team${teamCount !== 1 ? 's' : ''} ${recipients.includeAdmins ? '(All Members)' : '(Staff Only)'}`;
                  }
                  return `Add ${recipients.recipients.length} Recipient${recipients.recipients.length !== 1 ? 's' : ''}`;
                })()}
              </button>
            </div>
          </div>
        )}

        {/* Assignments Table */}
        <AssignmentTable
          assignments={assignments?.assignments || []}
          loading={assignmentsLoading}
          onRemind={handleRemind}
          onDelete={handleDelete}
          onRefresh={refetchAssignments}
          onResendLink={handleResendLink}
        />
      </div>
    </div>
  );
}