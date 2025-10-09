import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { dashboardAPI } from '../api/client';
import { QUERY_KEYS } from '../utils/constants';
import { formatNumber, formatPercentage } from '../utils/formatters';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const {
    data: stats,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_STATS,
    queryFn: () => dashboardAPI.getStats().then(res => res.data),
    refetchOnWindowFocus: false,
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
        <div className="text-red-600 mb-4">Failed to load dashboard data</div>
        <button
          onClick={() => refetch()}
          className="text-indigo-600 hover:text-indigo-500"
        >
          Try again
        </button>
      </div>
    );
  }

  const {
    total_policies = 0,
    total_assignments = 0,
    acknowledged_assignments = 0,
    pending_assignments = 0,
    overdue_assignments = 0,
    recent_policies = [],
    acknowledgment_rate = 0
  } = stats || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Overview of your policy acknowledgment system
          </p>
        </div>
        <Link
          to="/policies/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Create Policy
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Policies"
          value={total_policies}
          icon={DocumentTextIcon}
          color="indigo"
          loading={isLoading}
        />

        <StatsCard
          title="Total Assignments"
          value={total_assignments}
          icon={UsersIcon}
          color="blue"
          loading={isLoading}
        />

        <StatsCard
          title="Acknowledged"
          value={acknowledged_assignments}
          subtitle={formatPercentage(acknowledged_assignments, total_assignments)}
          icon={CheckCircleIcon}
          color="green"
          loading={isLoading}
        />

        <StatsCard
          title="Overdue"
          value={overdue_assignments}
          icon={ExclamationTriangleIcon}
          color="red"
          loading={isLoading}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="bg-white overflow-hidden rounded-xl border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Assignments
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {formatNumber(pending_assignments)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden rounded-xl border border-slate-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 rounded-md bg-green-100">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Acknowledgment Rate
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {acknowledgment_rate}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Policies */}
      {recent_policies && recent_policies.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Policies
              </h3>
              <Link
                to="/policies"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View all
              </Link>
            </div>
          </div>
          <ul className="divide-y divide-slate-200">
            {recent_policies.slice(0, 5).map((policy) => (
              <li key={policy.id}>
                <Link
                  to={`/policies/${policy.id}`}
                  className="block hover:bg-slate-50 px-6 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-slate-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {policy.title}
                        </p>
                        {policy.description && (
                          <p className="text-sm text-slate-600 mt-1">
                            {policy.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">
                        {policy.assignments_count || 0} assignments
                      </p>
                      <p className="text-xs text-slate-400">
                        {policy.acknowledged_count || 0} acknowledged
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/policies/new"
            className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <PlusIcon className="h-6 w-6 text-indigo-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Create New Policy</p>
              <p className="text-xs text-gray-500">Add a new policy document</p>
            </div>
          </Link>

          <Link
            to="/policies"
            className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Manage Policies</p>
              <p className="text-xs text-gray-500">View and edit existing policies</p>
            </div>
          </Link>

          <div className="flex items-center p-4 border border-slate-200 rounded-lg bg-slate-50">
            <UsersIcon className="h-6 w-6 text-slate-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Bulk Actions</p>
              <p className="text-xs text-slate-400">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
