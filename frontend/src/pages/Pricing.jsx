import { Link } from 'react-router-dom';
import { CheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import ThemeToggle from '../components/ThemeToggle';

export default function Pricing() {
  const tiers = [
    {
      name: 'Small Business',
      price: '$49',
      per: 'month + $5/staff',
      limits: ['Up to 10 staff', '5 guest invites/mo', '1 admin'],
      cta: 'Start small',
      highlighted: false,
    },
    {
      name: 'Medium',
      price: '$149',
      per: 'month + $1/staff',
      limits: ['11–49 staff', '50 guest invites/mo', '2 admins'],
      cta: 'Most popular',
      highlighted: true,
    },
    {
      name: 'Large',
      price: '$299',
      per: 'month + $2/staff',
      limits: ['50–100 staff', '100 guest invites/mo', '5 admins'],
      cta: 'Scale up',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800">
        <div className="container-page">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="bg-indigo-600 rounded-xl p-2 shadow">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-lg font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">Policy Acknowledgment Tracker</span>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Link to="/login" className="btn btn-secondary">Sign in</Link>
              <Link to="/signup" className="btn btn-primary">Sign up</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="container-page py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Simple, transparent pricing</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Guests are always free. Annual billing saves 15%.</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Add-on: SSO $199 one-time.</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className={`card ${t.highlighted ? 'ring-2 ring-indigo-500' : ''}`}>
              <div className="card-body">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t.name}</h3>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t.price}</span>
                  <span className="text-slate-500 dark:text-slate-400">{t.per}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {t.limits.map((l) => (
                    <li key={l} className="flex items-center text-slate-600 dark:text-slate-300">
                      <CheckIcon className="h-5 w-5 text-emerald-500 mr-2" /> {l}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`btn mt-6 ${t.highlighted ? 'btn-primary' : 'btn-secondary'}`}>{t.cta}</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What counts as a staff user?</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">Staff are managed users who can sign in and have history. One-time recipients are guests and free.</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Can I use teams inside a workspace?</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">Yes. Categorize policies by internal teams while keeping everything scoped to your workspace.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


