import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { policiesAPI } from '../api/client';
import { QUERY_KEYS } from '../utils/constants';
import { formatDate, formatRelativeTime, getStatusBadgeClass, getStatusText } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function PolicyList() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const queryClient = useQueryClient();

  // Redirect employees to their assignments page
  if (user && user.role !== 'admin') {
    return <Navigate to="/my-assignments" replace />;
  }

  const {
    data: policies,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.POLICIES,
    queryFn: () => policiesAPI.list().then(res => res.data?.policies || []),
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (policyId) => policiesAPI.delete(policyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POLICIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_STATS });
      toast.success('Policy deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error('Failed to delete policy');
    },
  });

  const exportMutation = useMutation({
    mutationFn: (policyId) => policiesAPI.exportCSV(policyId),
    onSuccess: (response, policyId) => {
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `policy-${policyId}-assignments.csv`);
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

  const processedPolicies = (policies || []).map((policy) => {
    const totalAssignments = policy.total_assignments ?? 0;
    const acknowledgedAssignments = policy.acknowledged_assignments ?? 0;
    const overdueAssignments = policy.overdue_assignments ?? 0;
    let derivedStatus = 'draft';
    if (totalAssignments > 0) {
      if (acknowledgedAssignments === totalAssignments) {
        derivedStatus = 'completed';
      } else if (overdueAssignments > 0) {
        derivedStatus = 'overdue';
      } else {
        derivedStatus = 'in_progress';
      }
    }

    const acknowledgmentRate =
      totalAssignments === 0 ? 0 : Math.round((acknowledgedAssignments / totalAssignments) * 100);

    const summary = policy.body_markdown
      ? policy.body_markdown.replace(/\s+/g, ' ').trim().slice(0, 120) +
        (policy.body_markdown.length > 120 ? '…' : '')
      : '';

    return {
      ...policy,
      _status: derivedStatus,
      _acknowledgmentRate: acknowledgmentRate,
      _totalAssignments: totalAssignments,
      _acknowledgedAssignments: acknowledgedAssignments,
      _summary: summary,
    };
  });

  const filteredPolicies = processedPolicies.filter(policy => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      policy.title?.toLowerCase().includes(term) ||
      policy._summary?.toLowerCase().includes(term) ||
      policy.creator_name?.toLowerCase().includes(term)
    );
  });

  const handleDelete = (policyId) => {
    deleteMutation.mutate(policyId);
  };

  const handleExport = (policyId) => {
    exportMutation.mutate(policyId);
  };

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
        <div className="text-red-600 mb-4">Failed to load policies</div>
        <button
          onClick={() => refetch()}
          className="text-indigo-600 hover:text-indigo-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Policies</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Manage your policy documents and assignments</p>
        </div>
        <Link
          to="/policies/new"
          className="btn btn-primary mt-4 sm:mt-0"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Create New Policy
        </Link>
      </div>

      {/* Search */}
      <div className="card p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Policies List */}
      <div className="card overflow-hidden">
        {filteredPolicies.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-slate-400 mb-4">
              {policies?.length === 0 ? 'No policies created yet.' : 'No policies match your search.'}
            </div>
            {policies?.length === 0 && (
              <Link
                to="/policies/new"
                className="btn btn-secondary"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create your first policy
              </Link>
            )}
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
                    Assignments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden md:table-cell">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden lg:table-cell">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden lg:table-cell">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {policy.title}
                        </div>
                        {policy._summary && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {policy._summary}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(policy._status)}`}>
                        {getStatusText(policy._status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden md:table-cell">
                      <div>
                        <div>{policy._totalAssignments} total</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {policy._acknowledgedAssignments} acknowledged
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${policy._acknowledgmentRate}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {policy._acknowledgmentRate}% acknowledged
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden lg:table-cell">
                      <div>
                        <div>{formatDate(policy.created_at)}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {formatRelativeTime(policy.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden lg:table-cell">
                      {policy.due_at ? (
                        <div>
                          <div>{formatDate(policy.due_at)}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {formatRelativeTime(policy.due_at)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">No due date</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/policies/${policy.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="View details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <Link
                          to={`/policies/${policy.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="Edit policy"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleExport(policy.id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="Export CSV"
                          disabled={exportMutation.isPending}
                        >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(policy.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="Delete policy"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-8 border w-full max-w-md shadow-lg rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 transform transition-all sm:my-8 sm:align-middle">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mt-4">
                Delete Policy
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this policy? This action cannot be undone and will also delete all associated assignments.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-4 mt-6">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="btn btn-secondary"
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:opacity-50"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Deleting...
                    </div>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
