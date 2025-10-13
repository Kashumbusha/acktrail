import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { usersAPI } from '../api/client';
import { formatDate, formatRelativeTime, getStatusBadgeClass, getStatusText } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MyAssignments() {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['myAssignments'],
    queryFn: () => usersAPI.getMyAssignments().then(res => res.data),
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

  // Calculate stats
  const totalAssignments = assignments.length;
  const acknowledgedCount = assignments.filter(a => a.status === 'acknowledged').length;
  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const viewedCount = assignments.filter(a => a.status === 'viewed').length;

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
              <EyeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Viewed
                </dt>
                <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {viewedCount}
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
                          <div>{formatDate(assignment.policy_due_at)}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {formatRelativeTime(assignment.policy_due_at)}
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
                      {assignment.policy_id && (
                        <Link
                          to={`/policies/${assignment.policy_id}`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors inline-flex items-center"
                          title="View policy"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
