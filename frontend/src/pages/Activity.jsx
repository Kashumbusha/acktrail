import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityAPI } from '../api/client';
import { QUERY_KEYS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateTime } from '../utils/formatters';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const FILTERS = [
  { value: 'all', label: 'All events' },
  { value: 'policy_created', label: 'Policies created' },
  { value: 'assignment_sent', label: 'Assignments sent' },
  { value: 'acknowledgment_received', label: 'Acknowledgments' },
];

const LIMIT = 25;

export default function Activity() {
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [logs, setLogs] = useState([]);

  const params = useMemo(() => {
    const base = { limit: LIMIT, offset };
    if (filter !== 'all') {
      base.event_type = filter;
    }
    return base;
  }, [filter, offset]);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.ACTIVITY_LOGS(params),
    queryFn: () => activityAPI.getLogs(params),
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data) return;
    setLogs((current) => {
      if (offset === 0) {
        return data.items;
      }
      const existingIds = new Set(current.map((item) => item.id));
      const merged = [...current];
      data.items.forEach((item) => {
        if (!existingIds.has(item.id)) {
          merged.push(item);
        }
      });
      return merged;
    });
  }, [data, offset]);

  const handleFilterChange = (value) => {
    setFilter(value);
    setOffset(0);
  };

  const handleLoadMore = () => {
    setOffset((prev) => prev + LIMIT);
  };

  const handleRefresh = () => {
    setOffset(0);
    refetch();
  };

  const total = data?.total ?? 0;
  const hasMore = offset + LIMIT < total;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100">Activity</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">Every policy event, in one searchable timeline.</p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-indigo-500"
        >
          <ArrowPathIcon className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="card p-4 sm:p-5 flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleFilterChange(value)}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === value
                ? 'bg-gray-900 text-white shadow-sm dark:bg-indigo-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-6">
        {isLoading && logs.length === 0 ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12 space-y-3 text-sm text-gray-500 dark:text-slate-400">
            <p>We couldn't load the activity timeline right now.</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowPathIcon className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            No events yet—send a policy to generate your first activity.
          </div>
        ) : (
          <ul className="space-y-4">
            {logs.map((log) => (
              <li key={log.id} className="flex gap-4">
                <div className="w-16 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
                  {formatDateTime(log.created_at)}
                </div>
                <div className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                      {log.event_type.replace('_', ' ')}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{log.description}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {log.actor_name && <span>{log.actor_name} • </span>}
                      {log.policy_title}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasMore && !error && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isFetching ? (
                <>
                  <LoadingSpinner size="sm" /> Loading…
                </>
              ) : (
                'Load more'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

