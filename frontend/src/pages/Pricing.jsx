import { Link } from 'react-router-dom';
import { CheckIcon } from '@heroicons/react/24/outline';

export default function Pricing() {
  const tiers = [
    {
      name: 'Small Business',
      price: '$49',
      per: 'month + $5/staff',
      limits: ['Up to 10 staff', '5 guest invites/mo', '1 admin'],
      value: 'Launch policy acknowledgments in under 15 minutes with passwordless access and cryptographic receipts.',
      benefits: [
        'Magic-link access for staff and guests',
        'Audit-ready PDF receipts & CSV exports'
      ],
      cta: 'Start small',
      highlighted: false,
    },
    {
      name: 'Medium',
      price: '$149',
      per: 'month + $1/staff',
      limits: ['11–49 staff', '50 guest invites/mo', '2 admins'],
      value: 'Scale compliance for growing teams with analytics, reminders, and seat management controls.',
      benefits: [
        'Priority support during audits',
        'Seat capacity insights & reminder automation'
      ],
      cta: 'Most popular',
      highlighted: true,
    },
    {
      name: 'Large',
      price: '$299',
      per: 'month + $2/staff',
      limits: ['50–100 staff', '100 guest invites/mo', '5 admins'],
      value: 'Enterprise readiness with SSO, enhanced security, and early access to Slack notifications.',
      benefits: [
        'SSO add-on and advanced security controls',
        'Slack notifications & HRIS sync (beta access)'
      ],
      cta: 'Scale up',
      highlighted: false,
    },
  ];

  return (
    <section className="container-page py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Simple, transparent pricing</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Guests are always free. Annual billing saves 15%.</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Every plan includes SHA-256 receipt hashing, PDF evidence, and CSV exports.</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Add-on: SSO $50/month.</p>
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
                {t.value && (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t.value}</p>
                )}
                <ul className="mt-4 space-y-2">
                  {t.limits.map((l) => (
                    <li key={l} className="flex items-center text-slate-600 dark:text-slate-300">
                      <CheckIcon className="h-5 w-5 text-emerald-500 mr-2" /> {l}
                    </li>
                  ))}
                </ul>
                {t.benefits && (
                  <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Includes</h4>
                    <ul className="mt-2 space-y-2">
                      {t.benefits.map((item) => (
                        <li key={item} className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                          <CheckIcon className="h-4 w-4 text-indigo-500 mr-2" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link to="/signup" className={`btn mt-6 ${t.highlighted ? 'btn-primary' : 'btn-secondary'}`}>{t.cta}</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What counts as a staff user?</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Staff are managed users with login access and history. One-time recipients, contractors, or vendors can acknowledge policies as guests for free—seat limits are enforced automatically.
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What’s next on the roadmap?</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Slack notifications are in active development with HRIS roster sync close behind. Book a demo to request early access or share integrations that would make Acktrail indispensable.
              </p>
            </div>
          </div>
        </div>
      </section>
  );
}
