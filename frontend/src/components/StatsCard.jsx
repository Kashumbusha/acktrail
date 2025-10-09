import { formatNumber } from '../utils/formatters';

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  loading = false
}) {
  const colorClasses = {
    indigo: 'bg-indigo-500 text-indigo-600',
    green: 'bg-green-500 text-green-600',
    yellow: 'bg-yellow-500 text-yellow-600',
    red: 'bg-red-500 text-red-600',
    blue: 'bg-blue-500 text-blue-600',
    gray: 'bg-gray-500 text-gray-600',
  };

  return (
    <div className="bg-white overflow-hidden rounded-xl border border-slate-200 hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {Icon && (
              <div className={`p-3 rounded-lg ${colorClasses[color]?.split(' ')[0]} bg-opacity-10`}>
                <Icon className={`h-6 w-6 ${colorClasses[color]?.split(' ')[1]}`} />
              </div>
            )}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate dark:text-slate-400">
                {title}
              </dt>
              <dd className="flex items-baseline">
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse dark:bg-slate-800"></div>
                ) : (
                  <div className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                    {formatNumber(value)}
                  </div>
                )}
                {subtitle && (
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-600 dark:text-slate-300">
                    {subtitle}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
