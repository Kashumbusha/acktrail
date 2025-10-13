import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { assignmentsAPI, usersAPI, ackAPI } from '../api/client';
import { formatDate, formatRelativeTime, getStatusBadgeClass, getStatusText } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function MyAssignments() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const perPage = 20;

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['myAssignments', page, perPage],
    queryFn: () => usersAPI.getMyAssignments({ page, per_page: perPage }).then(res => res.data),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">Failed to load assignments</div>
        <button
          onClick={() => refetch()}
          className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Try again
        </button>
      </div>
    );
  }

  const assignments = data?.assignments || [];

  const totalAssignments = data?.total ?? assignments.length;
  const acknowledgedCount = data?.acknowledged_count ?? assignments.filter(a => a.status === 'acknowledged').length;
  const pendingCount = data?.pending_count ?? assignments.filter(a => a.status === 'pending').length;
  const overdueCount = data?.overdue_count ?? 0;
  const viewedCount = data?.viewed_count ?? assignments.filter(a => a.status === 'viewed').length;
  const totalPages = data?.total_pages ?? 1;

  const handleReview = async (assignmentId) => {
    try {
      const response = await assignmentsAPI.selfMagicLink(assignmentId);
      const token = response.data?.token;
      if (!token) {
        throw new Error('Missing token');
      }
      navigate(`/ack/${token}`);
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to open acknowledgment';
      toast.error(message);
    }
  };

  const handleDownloadReceipt = async (assignmentId) => {
    try {
      const response = await ackAPI.downloadReceipt(assignmentId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `acknowledgment-receipt-${assignmentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to download receipt';
      toast.error(message);
    }
  };

  const handleExport = async () => {
    try {
      const response = await usersAPI.exportMyAssignments();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `acktrail-assignments-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to export assignments';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
          My Policy Assignments
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Review and acknowledge policies assigned to you
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" /> Export CSV
          </button>
          {viewedCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {viewedCount} assignment{viewedCount === 1 ? '' : 's'} viewed but not acknowledged yet.
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Assignments
                </dt>
                <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {totalAssignments}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Acknowledged
                </dt>
                <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {acknowledgedCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Pending
                </dt>
                <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {pendingCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Overdue
                </dt>
                <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {overdueCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="card overflow-hidden">
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No assignments
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You don't have any policy assignments yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Policy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden md:table-cell">
                    Assigned Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden lg:table-cell">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden lg:table-cell">
                    Acknowledged
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {assignment.policy_title}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(assignment.status)}`}>
                        {getStatusText(assignment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell">
                      <div>
                        <div>{formatDate(assignment.created_at)}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {formatRelativeTime(assignment.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden lg:table-cell">
                      {assignment.policy_due_at ? (
                        <div>
                          <div className={assignment.is_overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                            {formatDate(assignment.policy_due_at)}
                          </div>
                          <div className={`text-xs ${assignment.is_overdue ? 'text-red-500 dark:text-red-300' : 'text-gray-400 dark:text-gray-500'}`}>
                            {assignment.is_overdue ? `Overdue ${formatRelativeTime(assignment.policy_due_at)}` : formatRelativeTime(assignment.policy_due_at)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">No due date</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden lg:table-cell">
                      {assignment.acknowledged_at ? (
                        <div>
                          <div>{formatDate(assignment.acknowledged_at)}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {formatRelativeTime(assignment.acknowledged_at)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Not yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReview(assignment.id)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                          Review
                        </button>
                        {assignment.acknowledged_at && (
                          <button
                            onClick={() => handleDownloadReceipt(assignment.id)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Receipt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
