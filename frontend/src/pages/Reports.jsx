import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../api/client';
import { QUERY_KEYS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate } from '../utils/formatters';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

export default function Reports() {
  const [policyLimit] = useState(20);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: QUERY_KEYS.REPORTS_SUMMARY,
    queryFn: () => reportsAPI.getSummary(),
    refetchOnWindowFocus: false,
  });

  const {
    data: policyData,
    isLoading: policiesLoading,
    error: policiesError,
    refetch: refetchPolicies,
  } = useQuery({
    queryKey: QUERY_KEYS.REPORTS_POLICIES({ limit: policyLimit }),
    queryFn: () => reportsAPI.getPolicies({ limit: policyLimit }),
    refetchOnWindowFocus: false,
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchPolicies();
  };

  if (summaryLoading && !summary) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-500">We couldn't load your reports yet.</p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowPathIcon className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const summaryStats = summary || {};
  const policySnapshots = policyData?.policies || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100">Reports</h1>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Export-ready summaries of your policy acknowledgments and outstanding tasks.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-indigo-500"
        >
          <ArrowPathIcon className="h-4 w-4" /> Refresh data
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Total assignments</h2>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{summaryStats.total_assignments}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Across {summaryStats.total_policies} policies</p>
        </div>
        <div className="card p-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Acknowledged</h2>
          <p className="text-3xl font-bold text-emerald-500">{summaryStats.acknowledged_assignments}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{summaryStats.acknowledgment_rate?.toFixed?.(1) ?? summaryStats.acknowledgment_rate}% completion rate</p>
        </div>
        <div className="card p-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Pending & Overdue</h2>
          <p className="text-3xl font-bold text-amber-500">{summaryStats.pending_assignments}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{summaryStats.overdue_assignments} currently overdue</p>
        </div>
      </div>

      {/* Top outstanding */}
      <div className="card p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Policies needing attention</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Prioritise follow-ups where the most people are still pending.</p>
          </div>
          <a
            href="/api/dashboard/policies/export.csv"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <DocumentArrowDownIcon className="h-4 w-4" /> Export summary CSV
          </a>
        </div>

        {policiesLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : policiesError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-sm text-gray-500 dark:text-slate-400">
            <p>Couldn't load the policy breakdown right now.</p>
            <button
              onClick={refetchPolicies}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowPathIcon className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : policySnapshots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            All set—no outstanding work at the moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Acknowledged</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {policySnapshots.map((policy) => {
                  const outstanding = policy.pending_assignments + policy.overdue_assignments;
                  return (
                    <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{policy.title}</td>
                      <td className="px-4 py-3 text-amber-500">
                        {outstanding}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                        {policy.acknowledged_assignments}/{policy.total_assignments} ({policy.acknowledgment_rate}%)
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                        {policy.due_at ? formatDate(policy.due_at) : 'No due date'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                        {policy.created_at ? formatDate(policy.created_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/policies/${policy.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-500 hover:text-indigo-400"
                        >
                          View
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guidance */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6 space-y-3 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
          <h2 className="text-lg font-semibold">Proof bundles</h2>
          <p className="text-sm text-white/80">
            Need to show an auditor that everyone signed? Export the full workspace CSV
            or download receipts per policy from the policy detail page.
          </p>
          <a
            href="/api/dashboard/workspace/export.csv"
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25"
          >
            Download workspace export
            <DocumentArrowDownIcon className="h-4 w-4" />
          </a>
        </div>
        <div className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Best practices</h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-400 list-disc list-inside">
            <li>Schedule monthly exports to keep an audit trail handy.</li>
            <li>Escalate policies with pending > acknowledged to managers.</li>
            <li>Close policies once everyone acknowledges to keep the inbox clean.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

