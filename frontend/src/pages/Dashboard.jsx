import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
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
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();

  // Redirect employees to their assignments page
  if (user && user.role !== 'admin') {
    return <Navigate to="/my-assignments" replace />;
  }
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

  // Extract stats from nested structure
  const dashboardStats = stats?.stats || {};
  const recentActivity = stats?.recent_activity || [];

  const {
    total_policies = 0,
    total_assignments = 0,
    acknowledged_assignments = 0,
    pending_assignments = 0,
    overdue_assignments = 0,
    acknowledgment_rate = 0,
    seat_capacity,
    seat_usage,
    seat_available,
    admin_count,
    admin_limit,
    sso_enabled
  } = dashboardStats;

  // Get recent policies from backend (convert recent_activity to a list of unique policies)
  const recent_policies = stats?.recent_policies || [];

  const hasPolicies = total_policies > 0;
  const acknowledgmentPercentage = total_assignments > 0
    ? Math.round((acknowledged_assignments / total_assignments) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-600 dark:text-slate-400">
              Welcome back, {user?.name?.split(' ')[0] || 'Admin'}! Here's what's happening with your policies.
            </p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg shadow-lg text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-violet-500/30"
          >
            <UsersIcon className="-ml-1 mr-2 h-5 w-5" />
            Invite Team
          </Link>
        </div>

        {/* Empty State Banner */}
        {!hasPolicies && (
          <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl p-6 shadow-lg shadow-violet-500/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-semibold text-white mb-2">
                  🚀 Get Started with Your First Policy
                </h3>
                <p className="text-sm text-white/90">
                  Create a policy, assign it to your team, and start tracking acknowledgments in minutes.
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/policies/new"
                  className="px-5 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:scale-105 transition-transform"
                >
                  Create Policy
                </Link>
                <button className="hidden px-5 py-2 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors">
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Policies */}
          <div className="relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 hover:border-violet-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10 overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <DocumentTextIcon className="h-5 w-5 text-violet-400" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Total Policies</span>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">{total_policies}</div>
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400">
              <span>→</span>
              <span>No change</span>
            </div>
          </div>

          {/* Acknowledged */}
          <div className="relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 hover:border-emerald-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-green-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Acknowledged</span>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {acknowledged_assignments} <span className="text-xl text-gray-500 dark:text-slate-500">/ {total_assignments}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400 mb-3">
              <span>{acknowledgmentPercentage}%</span>
              <span>completion rate</span>
            </div>
            {/* Progress Bar */}
            <div className="h-2 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-1000"
                style={{ width: `${acknowledgmentPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Pending */}
          <div className="relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 hover:border-amber-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-orange-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <ClockIcon className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Pending</span>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">{pending_assignments}</div>
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400">
              <span>→</span>
              <span>Awaiting responses</span>
            </div>
          </div>

          {/* Overdue */}
          <div className="relative bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 hover:border-red-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10 overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-rose-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Overdue</span>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">{overdue_assignments}</div>
            <div className="flex items-center gap-1 text-sm">
              {overdue_assignments === 0 ? (
                <>
                  <span className="text-emerald-400">✓</span>
                  <span className="text-emerald-400">Great! Nothing overdue</span>
                </>
              ) : (
                <>
                  <span className="text-red-400">⚠</span>
                  <span className="text-red-400">Needs attention</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chart and Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Assignment Status Overview */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Assignment Status Overview</h3>
              <Link to="/policies" className="text-sm text-violet-400 hover:text-violet-300 font-medium">
                View Policies →
              </Link>
            </div>

            {total_assignments > 0 ? (
              <div className="space-y-6">
                {/* Visual Progress Bar */}
                <div className="h-12 bg-gray-100 dark:bg-slate-900 rounded-lg overflow-hidden flex">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center text-white text-sm font-semibold transition-all duration-1000"
                    style={{ width: `${(acknowledged_assignments / total_assignments) * 100}%` }}
                  >
                    {acknowledged_assignments > 0 && `${acknowledged_assignments}`}
                  </div>
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-semibold"
                    style={{ width: `${(pending_assignments / total_assignments) * 100}%` }}
                  >
                    {pending_assignments > 0 && `${pending_assignments}`}
                  </div>
                  <div
                    className="bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center text-white text-sm font-semibold"
                    style={{ width: `${(overdue_assignments / total_assignments) * 100}%` }}
                  >
                    {overdue_assignments > 0 && `${overdue_assignments}`}
                  </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-emerald-500 to-green-500"></div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{acknowledged_assignments}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">Acknowledged</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-amber-500 to-orange-500"></div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{pending_assignments}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">Pending</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-red-500 to-rose-500"></div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{overdue_assignments}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">Overdue</div>
                    </div>
                  </div>
                </div>

                {/* Stats Summary */}
                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    <span className="font-semibold text-gray-900 dark:text-slate-100">{total_assignments}</span> total assignments •{' '}
                    <span className="font-semibold text-emerald-400">{acknowledgmentPercentage}%</span> completion rate
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 bg-gray-100 dark:bg-slate-900 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700">
                <div className="text-center text-gray-500 dark:text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <p className="font-semibold mb-1">No assignments yet</p>
                  <p className="text-sm">Data will appear once you assign policies to users</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Activity</h3>
              <Link to="/dashboard" className="text-sm text-violet-400 hover:text-violet-300 font-medium">
                View All →
              </Link>
            </div>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-gray-100 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:bg-slate-900/70 transition-colors">
                    <div className="w-8 h-8 rounded-md bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                      <CheckCircleIcon className="h-4 w-4 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 dark:text-slate-500">
                <div className="text-5xl mb-3">📭</div>
                <p className="font-semibold mb-1">No activity yet</p>
                <p className="text-sm">Activity will appear here as people acknowledge policies</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-5">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/policies/new"
              className="p-5 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-slate-700 hover:border-violet-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10 text-center group"
            >
              <div className="text-3xl mb-3">📝</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">Create Policy</div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Add a new policy document</div>
            </Link>

            <Link
              to="/admin/users"
              className="p-5 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-slate-700 hover:border-violet-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10 text-center group"
            >
              <div className="text-3xl mb-3">👥</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">Manage Users</div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Add or edit team members</div>
            </Link>

            <Link
              to="/dashboard"
              className="p-5 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-slate-700 hover:border-violet-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10 text-center group"
            >
              <div className="text-3xl mb-3">📊</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">View Reports</div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Export compliance reports</div>
            </Link>

            <Link
              to="/settings"
              className="p-5 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-slate-700 hover:border-violet-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10 text-center group"
            >
              <div className="text-3xl mb-3">⚙️</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">Settings</div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Configure your workspace</div>
            </Link>
          </div>
        </div>

        {/* Team Usage & SSO Section */}
        {seat_capacity && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Team Usage */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-5">Team Usage</h3>
              <div className="flex justify-between mb-6">
                <div>
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-2">Employee Seats</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {seat_usage} <span className="text-lg text-gray-500 dark:text-slate-500">/ {seat_capacity}</span>
                  </div>
                  <div className="text-xs text-emerald-400 mt-1">{seat_available} available seats</div>
                </div>
                {admin_count !== null && admin_limit !== null && (
                  <div>
                    <div className="text-xs text-gray-600 dark:text-slate-400 mb-2">Admins</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {admin_count} <span className="text-lg text-gray-500 dark:text-slate-500">/ {admin_limit}</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">Not billed</div>
                  </div>
                )}
              </div>
              <Link
                to="/admin/users"
                className="w-full block text-center py-3 bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg font-semibold hover:bg-slate-600 transition-colors"
              >
                Invite Team Members
              </Link>
            </div>

            {/* Security & Access */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-5">Security & Access</h3>
              <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-slate-900 rounded-lg mb-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">SSO Status</div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">Single Sign-On</div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  sso_enabled
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-slate-700 text-gray-600 dark:text-slate-400'
                }`}>
                  {sso_enabled ? 'Enabled' : 'Not Enabled'}
                </div>
              </div>
              <Link
                to="/settings/sso"
                className="w-full block text-center py-3 bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg font-semibold hover:bg-slate-600 transition-colors"
              >
                Manage SSO Settings
              </Link>
            </div>
          </div>
        )}

        {/* Recent Policies */}
        {recent_policies && recent_policies.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Policies</h3>
                <Link
                  to="/policies"
                  className="text-sm text-violet-400 hover:text-violet-300 font-medium"
                >
                  View all →
                </Link>
              </div>
            </div>
            <ul className="divide-y divide-slate-700">
              {recent_policies.slice(0, 5).map((policy) => (
                <li key={policy.id}>
                  <Link
                    to={`/policies/${policy.id}`}
                    className="block hover:bg-slate-700/50 px-6 py-4 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-600 dark:text-slate-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {policy.title}
                          </p>
                          {policy.description && (
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                              {policy.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {policy.assignments_count || 0} assignments
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-500">
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
      </div>
    </div>
  );
}
