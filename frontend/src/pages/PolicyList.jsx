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
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('inbox');
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

  const now = new Date();
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

    const dueDate = policy.due_at ? new Date(policy.due_at) : null;
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / msPerDay) : null;
    const daysPastDue = dueDate ? Math.max(Math.ceil((now.getTime() - dueDate.getTime()) / msPerDay), 0) : null;
    const hasRecipients = totalAssignments > 0;
    const outstanding = hasRecipients ? Math.max(totalAssignments - acknowledgedAssignments, 0) : 0;

    const needsAttention =
      derivedStatus === 'overdue' ||
      (derivedStatus === 'in_progress' && daysUntilDue !== null && daysUntilDue <= 3 && outstanding > 0);

    let nextStep = 'Launch policy to recipients';
    if (!hasRecipients) {
      nextStep = 'Add recipients and send this policy';
    } else if (derivedStatus === 'completed') {
      nextStep = 'All acknowledgments collected';
    } else if (derivedStatus === 'overdue') {
      nextStep = `Escalate to ${outstanding} pending recipient${outstanding === 1 ? '' : 's'}`;
    } else if (derivedStatus === 'in_progress') {
      if (daysUntilDue !== null && daysUntilDue <= 0) {
        nextStep = `Follow up with ${outstanding} pending recipient${outstanding === 1 ? '' : 's'}`;
      } else if (daysUntilDue !== null && daysUntilDue <= 3) {
        nextStep = `Automatic reminder scheduled in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
      } else {
        nextStep = `Monitor ${outstanding} pending acknowledgment${outstanding === 1 ? '' : 's'}`;
      }
    }

    const progressTitle = hasRecipients
      ? `${acknowledgedAssignments}/${totalAssignments} acknowledged`
      : 'No recipients yet';
    const progressPrimary = hasRecipients ? `${acknowledgmentRate}% complete` : 'Draft';
    const progressSecondary = hasRecipients
      ? outstanding > 0
        ? `${outstanding} waiting`
        : 'Everyone signed'
      : 'Add recipients to start tracking';

    const duePrimary = derivedStatus === 'completed'
      ? 'Completed'
      : dueDate
        ? formatDate(policy.due_at)
        : 'No due date set';
    const dueSecondary = derivedStatus === 'completed'
      ? formatRelativeTime(policy.updated_at || policy.created_at)
      : dueDate
        ? (dueDate < now
          ? `Overdue by ${daysPastDue} day${daysPastDue === 1 ? '' : 's'}`
          : `Due ${formatRelativeTime(policy.due_at)}`)
        : 'Set a due date to trigger reminders';

    const timeline = [
      {
        id: 'created',
        title: 'Policy created',
        primary: formatDate(policy.created_at),
        secondary: formatRelativeTime(policy.created_at),
      },
      {
        id: 'progress',
        title: progressTitle,
        primary: progressPrimary,
        secondary: progressSecondary,
      },
      {
        id: 'next',
        title: 'Next step',
        primary: nextStep,
        secondary: dueSecondary,
      },
    ];

    return {
      ...policy,
      _status: derivedStatus,
      _acknowledgmentRate: acknowledgmentRate,
      _totalAssignments: totalAssignments,
      _acknowledgedAssignments: acknowledgedAssignments,
      _pendingAssignments: outstanding,
      _needsAttention: needsAttention,
      _nextStep: nextStep,
      _timeline: timeline,
      _duePrimary: duePrimary,
      _dueSecondary: dueSecondary,
    };
  });

  const filteredPolicies = processedPolicies.filter(policy => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      policy.title?.toLowerCase().includes(term) ||
      policy.creator_name?.toLowerCase().includes(term)
    );
  });

  const statusFilteredPolicies = filteredPolicies.filter(policy => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'attention') return policy._needsAttention;
    return policy._status === statusFilter;
  });

  const summaryStats = processedPolicies.reduce(
    (acc, policy) => {
      acc.totalPolicies += 1;
      acc.totalAssignments += policy._totalAssignments;
      acc.totalAcknowledged += policy._acknowledgedAssignments;
      acc.totalPending += policy._pendingAssignments;

      if (policy._status === 'completed') acc.completed += 1;
      else if (policy._status === 'overdue') acc.overdue += 1;
      else if (policy._status === 'in_progress') acc.inProgress += 1;
      if (policy._needsAttention) acc.needsAttention += 1;

      acc.totalAckRate += policy._acknowledgmentRate;

      const dueDate = policy.due_at ? new Date(policy.due_at) : null;
      if (dueDate && dueDate > new Date()) {
        acc.upcomingDue.push({
          id: policy.id,
          title: policy.title,
          due_at: policy.due_at,
        });
      }

      return acc;
    },
    {
      totalPolicies: 0,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      needsAttention: 0,
      totalAckRate: 0,
      totalAssignments: 0,
      totalAcknowledged: 0,
      totalPending: 0,
      upcomingDue: [],
    }
  );

  const averageAckRate = summaryStats.totalPolicies
    ? Math.round(summaryStats.totalAckRate / summaryStats.totalPolicies)
    : 0;

  summaryStats.upcomingDue.sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
  const nextDue = summaryStats.upcomingDue.slice(0, 3);

  const visiblePolicies = statusFilteredPolicies;
  const hasPolicies = (policies?.length || 0) > 0;
  const hasVisiblePolicies = visiblePolicies.length > 0;

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
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 lg:items-start">
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6 lg:p-8 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-1">Policies</h1>
              <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl">
                Manage acknowledgeable documents, monitor completion, and export results directly from one workspace.
              </p>
            </div>
            <Link
              to="/policies/new"
              className="btn btn-primary w-full sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create New Policy
            </Link>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by title or owner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Policy workspace */}
        <div className="space-y-5">
          <div className="card p-5 sm:p-6 space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {[{
                  value: 'all',
                  label: 'All',
                  count: summaryStats.totalPolicies,
                }, {
                  value: 'attention',
                  label: 'Needs attention',
                  count: summaryStats.needsAttention,
                }, {
                  value: 'in_progress',
                  label: 'In progress',
                  count: summaryStats.inProgress,
                }, {
                  value: 'overdue',
                  label: 'Overdue',
                  count: summaryStats.overdue,
                }, {
                  value: 'completed',
                  label: 'Completed',
                  count: summaryStats.completed,
                }].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      statusFilter === option.value
                        ? 'bg-gray-900 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{option.label}</span>
                    {typeof option.count === 'number' && (
                      <span className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold ${
                        statusFilter === option.value
                          ? 'bg-white/20'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {option.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 self-start rounded-full bg-gray-100 p-1 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setViewMode('inbox')}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    viewMode === 'inbox'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
                  }`}
                >
                  Inbox view
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    viewMode === 'table'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
                  }`}
                >
                  Table view
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Track acknowledgments like conversations - see who needs a nudge, what's already done, and the next automation at a glance.
            </p>
          </div>

          {!hasVisiblePolicies ? (
            <div className="card p-10 text-center space-y-4">
              <div className="text-gray-500 dark:text-slate-400">
                {hasPolicies
                  ? 'No policies match your current filters. Try adjusting the filters or search term.'
                  : 'No policies created yet. Launch your first policy to keep acknowledgments organized.'}
              </div>
              {!hasPolicies && (
                <Link
                  to="/policies/new"
                  className="btn btn-primary inline-flex items-center justify-center"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create your first policy
                </Link>
              )}
            </div>
          ) : viewMode === 'inbox' ? (
            <div className="space-y-4">
              {visiblePolicies.map((policy) => (
                <div
                  key={policy.id}
                  className={`card border-l-4 ${
                    policy._needsAttention
                      ? 'border-l-amber-500 dark:border-l-amber-400'
                      : 'border-l-transparent'
                  }`}
                >
                  <div className="p-6 space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <Link to={`/policies/${policy.id}`} className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                          {policy.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(policy._status)}`}>
                            {getStatusText(policy._status)}
                          </span>
                          <span>
                            {policy._totalAssignments > 0
                              ? `${policy._acknowledgedAssignments}/${policy._totalAssignments} acknowledged`
                              : 'No recipients yet'}
                          </span>
                          <span className="hidden sm:inline" aria-hidden="true">•</span>
                          {policy.due_at ? (
                            <span>{policy._dueSecondary}</span>
                          ) : (
                            <span>No due date</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
                          {policy._acknowledgmentRate}%
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/policies/${policy.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                            title="View details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                          <Link
                            to={`/policies/${policy.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                            title="Edit policy"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => handleExport(policy.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-2 rounded-full hover:bg-green-50 dark:hover:bg-emerald-900/30 transition"
                            title="Export acknowledgment CSV"
                            disabled={exportMutation.isPending}
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(policy.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                            title="Delete policy"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
                      <ul className="space-y-4">
                        {policy._timeline.map(item => (
                          <li key={item.id} className="flex items-start gap-3">
                            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{item.title}</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.primary}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{item.secondary}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Automation</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {policy._nextStep}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            AckTrail will nudge pending recipients automatically based on your reminder playbook.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                          onClick={() => handleExport(policy.id)}
                          disabled={exportMutation.isPending}
                        >
                          Download latest receipt log
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        Policy
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden md:table-cell">
                        Assignments
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden md:table-cell">
                        Progress
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden lg:table-cell">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden lg:table-cell">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {visiblePolicies.map((policy) => (
                      <tr
                        key={policy.id}
                        className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${policy._needsAttention ? 'border-l-4 border-l-amber-500' : ''}`}
                      >
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {policy.title}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(policy._status)}`}>
                            {getStatusText(policy._status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 hidden md:table-cell">
                          <div>
                            <div>{policy._totalAssignments} total</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {policy._acknowledgedAssignments} acknowledged
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
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
                        <td className="px-4 py-4 whitespace-nowrap text-gray-500 dark:text-gray-300 hidden lg:table-cell">
                          <div>
                            <div>{formatDate(policy.created_at)}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {formatRelativeTime(policy.created_at)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-500 dark:text-gray-300 hidden lg:table-cell">
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
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                              title="Export all assignments for this policy (employee names, emails, departments, acknowledgment details)"
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
            </div>
          )}
        </div>
      </div>

      <aside className="mt-8 lg:mt-0 space-y-6">
        <div className="card p-6 lg:p-7 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Policy Summary</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Snapshot of policy health across your workspace.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-4">
              <dt className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">Policies</dt>
              <dd className="mt-1 text-2xl font-semibold text-blue-900 dark:text-blue-100">{summaryStats.totalPolicies}</dd>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-4">
              <dt className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Avg. acknowledged</dt>
              <dd className="mt-1 text-2xl font-semibold text-emerald-900 dark:text-emerald-100">{averageAckRate}%</dd>
            </div>
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 p-4">
              <dt className="text-xs uppercase tracking-wide text-indigo-700 dark:text-indigo-300">In progress</dt>
              <dd className="mt-1 text-xl font-semibold text-indigo-900 dark:text-indigo-100">{summaryStats.inProgress}</dd>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-4">
              <dt className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Need attention</dt>
              <dd className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-100">{summaryStats.needsAttention}</dd>
            </div>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-900/30 p-4">
              <dt className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">Overdue</dt>
              <dd className="mt-1 text-xl font-semibold text-rose-900 dark:text-rose-100">{summaryStats.overdue}</dd>
            </div>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">Pending follow-ups</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-100">{summaryStats.totalPending}</dd>
            </div>
          </dl>
          {nextDue.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Upcoming due</h3>
              <ul className="mt-3 space-y-3 text-sm">
                {nextDue.map(item => (
                  <li key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <span className="font-medium text-gray-700 dark:text-gray-200 truncate mr-3">{item.title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(item.due_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card p-6 lg:p-7 space-y-4 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 text-white dark:from-slate-900 dark:via-indigo-900 dark:to-slate-800">
          <h2 className="text-lg font-semibold">Need inspiration?</h2>
          <p className="text-sm opacity-80">
            Create policy templates, reuse past assignments, or invite teams to review draft content before launch.
          </p>
          <Link
            to="/policies/new"
            className="inline-flex items-center justify-center rounded-lg bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/20 transition"
          >
            Build another policy
          </Link>
        </div>
      </aside>

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





