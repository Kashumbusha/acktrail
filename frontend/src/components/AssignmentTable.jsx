import { useState } from 'react';
import { MagnifyingGlassIcon, ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
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
  onRefresh 
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [remindingAssignments, setRemindingAssignments] = useState(new Set());

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

  const canSendReminder = (assignment) => {
    return assignment.status === 'pending' || assignment.status === 'viewed';
  };

  const getReminderBadgeColor = (count) => {
    if (count === 0) return 'bg-gray-100 text-gray-800';
    if (count === 1) return 'bg-blue-100 text-blue-800';
    if (count === 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

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
          </h3>
          
          <div className="flex items-center space-x-4">
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
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    {assignments?.length === 0 ? 'No assignments found' : 'No assignments match your filters'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
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
                      {assignment.status === 'acknowledged' && assignment.has_acknowledgment && (
                        <button
                          onClick={() => {
                            // This will be handled by the parent component
                            window.open(`/api/ack/assignment/${assignment.id}/receipt.pdf`, '_blank');
                          }}
                          className="text-green-600 hover:text-green-900 text-xs"
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}