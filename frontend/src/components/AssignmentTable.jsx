import { useState } from 'react';
import { MagnifyingGlassIcon, ArrowPathIcon, ExclamationCircleIcon, TrashIcon, PaperAirplaneIcon, ClipboardDocumentIcon, ChevronDownIcon, ChevronUpIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { formatDate, formatRelativeTime, getStatusBadgeClass, getStatusText } from '../utils/formatters';
import { ASSIGNMENT_STATUS } from '../utils/constants';
import LoadingSpinner from './LoadingSpinner';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: ASSIGNMENT_STATUS.PENDING, label: 'Pending' },
  { value: ASSIGNMENT_STATUS.VIEWED, label: 'Viewed' },
  { value: ASSIGNMENT_STATUS.ACKNOWLEDGED, label: 'Acknowledged' },
  { value: ASSIGNMENT_STATUS.DECLINED, label: 'Declined' },
];

export default function AssignmentTable({
  assignments,
  loading = false,
  onRemind,
  onDelete,
  onRefresh,
  onResendLink,
  onCopyLink
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [remindingAssignments, setRemindingAssignments] = useState(new Set());
  const [deletingAssignments, setDeletingAssignments] = useState(new Set());
  const [resendingAssignments, setResendingAssignments] = useState(new Set());
  const [selectedAssignments, setSelectedAssignments] = useState(new Set());
  const [expandedAssignments, setExpandedAssignments] = useState(new Set());

  // Filter and sort assignments
  const filteredAssignments = assignments
    ?.filter(assignment => {
      const matchesSearch = !search || 
        assignment.user_email?.toLowerCase().includes(search.toLowerCase()) ||
        assignment.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        assignment.user_department?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = !statusFilter || assignment.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;
      
      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    }) || [];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRemind = async (assignmentId) => {
    setRemindingAssignments(prev => new Set(prev).add(assignmentId));
    try {
      await onRemind(assignmentId);
    } catch (error) {
      console.error('Failed to send reminder:', error);
    } finally {
      setRemindingAssignments(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  const handleDelete = async (assignmentId, userEmail) => {
    if (!window.confirm(`Are you sure you want to delete the assignment for ${userEmail}?`)) {
      return;
    }

    setDeletingAssignments(prev => new Set(prev).add(assignmentId));
    try {
      await onDelete(assignmentId);
    } catch (error) {
      console.error('Failed to delete assignment:', error);
    } finally {
      setDeletingAssignments(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  const handleResendLink = async (assignmentId) => {
    setResendingAssignments(prev => new Set(prev).add(assignmentId));
    try {
      await onResendLink(assignmentId);
    } catch (error) {
      console.error('Failed to resend link:', error);
    } finally {
      setResendingAssignments(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  const handleCopyLink = (assignmentId, magicLinkUrl) => {
    if (onCopyLink) {
      onCopyLink(assignmentId, magicLinkUrl);
    }
  };

  const toggleExpanded = (assignmentId) => {
    setExpandedAssignments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assignmentId)) {
        newSet.delete(assignmentId);
      } else {
        newSet.add(assignmentId);
      }
      return newSet;
    });
  };

  const canSendReminder = (assignment) => {
    return assignment.status === 'pending' || assignment.status === 'viewed';
  };

  const canDelete = (assignment) => {
    return assignment.status !== 'acknowledged';
  };

  const canResendLink = (assignment) => {
    return assignment.status === 'pending' || assignment.status === 'viewed';
  };

  const getReminderBadgeColor = (count) => {
    if (count === 0) return 'bg-gray-100 text-gray-800';
    if (count === 1) return 'bg-blue-100 text-blue-800';
    if (count === 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Bulk actions handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedAssignments(new Set(filteredAssignments.map(a => a.id)));
    } else {
      setSelectedAssignments(new Set());
    }
  };

  const handleSelectAssignment = (assignmentId) => {
    setSelectedAssignments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assignmentId)) {
        newSet.delete(assignmentId);
      } else {
        newSet.add(assignmentId);
      }
      return newSet;
    });
  };

  const handleBulkRemind = async () => {
    const selectedArray = Array.from(selectedAssignments);
    const eligibleAssignments = filteredAssignments.filter(a =>
      selectedArray.includes(a.id) && canSendReminder(a) && (a.reminder_count || 0) < 3
    );

    if (eligibleAssignments.length === 0) {
      alert('No eligible assignments selected for reminders');
      return;
    }

    if (!window.confirm(`Send reminders to ${eligibleAssignments.length} selected assignment(s)?`)) {
      return;
    }

    for (const assignment of eligibleAssignments) {
      await handleRemind(assignment.id);
    }
    setSelectedAssignments(new Set());
  };

  const handleBulkDelete = async () => {
    const selectedArray = Array.from(selectedAssignments);
    const eligibleAssignments = filteredAssignments.filter(a =>
      selectedArray.includes(a.id) && canDelete(a)
    );

    if (eligibleAssignments.length === 0) {
      alert('No eligible assignments selected for deletion');
      return;
    }

    if (!window.confirm(`Delete ${eligibleAssignments.length} selected assignment(s)? This action cannot be undone.`)) {
      return;
    }

    for (const assignment of eligibleAssignments) {
      await onDelete(assignment.id);
    }
    setSelectedAssignments(new Set());
  };

  const allSelected = filteredAssignments.length > 0 && selectedAssignments.size === filteredAssignments.length;
  const someSelected = selectedAssignments.size > 0;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">
            Assignments ({filteredAssignments.length})
            {someSelected && (
              <span className="ml-2 text-sm text-indigo-600">
                ({selectedAssignments.size} selected)
              </span>
            )}
          </h3>

          <div className="flex items-center space-x-4">
            {someSelected && (
              <>
                <button
                  onClick={handleBulkRemind}
                  className="flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Bulk Remind
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Bulk Delete
                </button>
              </>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
            )}
          </div>
        </div>
        
        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by email, name, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th
                onClick={() => handleSort('user_email')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center">
                  Email
                  {sortField === 'user_email' && (
                    <span className="ml-2">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('user_name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center">
                  Name
                  {sortField === 'user_name' && (
                    <span className="ml-2">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center">
                  Status
                  {sortField === 'status' && (
                    <span className="ml-2">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('created_at')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center">
                  Assigned
                  {sortField === 'created_at' && (
                    <span className="ml-2">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('viewed_at')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center">
                  Viewed
                  {sortField === 'viewed_at' && (
                    <span className="ml-2">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('acknowledged_at')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center">
                  Acknowledged
                  {sortField === 'acknowledged_at' && (
                    <span className="ml-2">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reminders
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    {assignments?.length === 0 ? 'No assignments found' : 'No assignments match your filters'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredAssignments.map((assignment) => {
                const isExpanded = expandedAssignments.has(assignment.id);
                return (
                  <>
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedAssignments.has(assignment.id)}
                          onChange={() => handleSelectAssignment(assignment.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assignment.user_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assignment.user_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.user_department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(assignment.status)}>
                      {getStatusText(assignment.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.created_at ? (
                      <div>
                        <div>{formatDate(assignment.created_at)}</div>
                        <div className="text-xs text-gray-400">
                          {formatRelativeTime(assignment.created_at)}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.viewed_at ? (
                      <div>
                        <div>{formatDate(assignment.viewed_at)}</div>
                        <div className="text-xs text-gray-400">
                          {formatRelativeTime(assignment.viewed_at)}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.acknowledged_at ? (
                      <div>
                        <div>{formatDate(assignment.acknowledged_at)}</div>
                        <div className="text-xs text-gray-400">
                          {formatRelativeTime(assignment.acknowledged_at)}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReminderBadgeColor(assignment.reminder_count || 0)}`}>
                      {assignment.reminder_count || 0}
                      {assignment.reminder_count >= 3 && (
                        <ExclamationCircleIcon className="ml-1 h-3 w-3" />
                      )}
                    </span>
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {assignment.status === 'acknowledged' && assignment.has_acknowledgment && (
                            <button
                              onClick={() => toggleExpanded(assignment.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                              title="View audit trail"
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="h-4 w-4" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {canResendLink(assignment) && onResendLink && (
                            <button
                              onClick={() => handleResendLink(assignment.id)}
                              disabled={resendingAssignments.has(assignment.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-green-600 hover:text-green-900 hover:bg-green-50 disabled:opacity-50"
                              title="Regenerate and send fresh magic link"
                            >
                              {resendingAssignments.has(assignment.id) ? (
                                <LoadingSpinner size="sm" className="mr-1" />
                              ) : (
                                <PaperAirplaneIcon className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {canSendReminder(assignment) && onRemind && (
                            <button
                              onClick={() => handleRemind(assignment.id)}
                              disabled={remindingAssignments.has(assignment.id) || (assignment.reminder_count || 0) >= 3}
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                                (assignment.reminder_count || 0) >= 3
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50'
                              }`}
                            >
                              {remindingAssignments.has(assignment.id) ? (
                                <LoadingSpinner size="sm" className="mr-1" />
                              ) : null}
                              {(assignment.reminder_count || 0) >= 3 ? 'Max Reached' : 'Remind'}
                            </button>
                          )}
                          {canDelete(assignment) && onDelete && (
                            <button
                              onClick={() => handleDelete(assignment.id, assignment.user_email)}
                              disabled={deletingAssignments.has(assignment.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-600 hover:text-red-900 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingAssignments.has(assignment.id) ? (
                                <LoadingSpinner size="sm" className="mr-1" />
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expandable Audit Trail Row */}
                    {assignment.status === 'acknowledged' && assignment.has_acknowledgment && isExpanded && (
                      <tr key={`${assignment.id}-audit`} className="bg-gray-50">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="border-l-4 border-green-500 bg-white p-4 rounded-r-lg shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                              <h4 className="text-sm font-semibold text-gray-900">Acknowledgment Audit Trail</h4>
                              <button
                                onClick={() => window.open(`/api/ack/assignment/${assignment.id}/receipt.pdf`, '_blank')}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                                Download Receipt
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Acknowledged At:</span>
                                <div className="text-gray-900 mt-1">
                                  {formatDate(assignment.ack_created_at)}
                                  <div className="text-xs text-gray-500">{formatRelativeTime(assignment.ack_created_at)}</div>
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Method:</span>
                                <div className="text-gray-900 mt-1">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {assignment.ack_method === 'typed' ? 'Typed Signature' : 'One-Click'}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Policy Version:</span>
                                <div className="text-gray-900 mt-1">v{assignment.ack_policy_version}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">IP Address:</span>
                                <div className="text-gray-900 mt-1 font-mono text-xs">{assignment.ack_ip_address || 'N/A'}</div>
                              </div>
                              {assignment.ack_typed_signature && (
                                <div className="md:col-span-2">
                                  <span className="font-medium text-gray-700">Typed Signature:</span>
                                  <div className="text-gray-900 mt-1 font-serif italic">&quot;{assignment.ack_typed_signature}&quot;</div>
                                </div>
                              )}
                              <div className="lg:col-span-3">
                                <span className="font-medium text-gray-700">Policy Hash (Cryptographic Verification):</span>
                                <div className="text-gray-900 mt-1 font-mono text-xs break-all bg-gray-100 p-2 rounded">
                                  {assignment.ack_policy_hash}
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 text-xs text-gray-500 border-t pt-3">
                              <p className="flex items-center">
                                <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                This acknowledgment has been cryptographically verified and cannot be tampered with.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}