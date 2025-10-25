import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckIcon } from '@heroicons/react/24/outline';
import { PLANS, ANNUAL_DISCOUNT } from '../data/plans';
import { paymentsAPI } from '../api/client';
import toast from 'react-hot-toast';

const BILLING_OPTIONS = [
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Annual', badge: 'Save 20%' },
];

function formatStaffRange(plan) {
  if (plan.minStaff && plan.maxStaff) {
    if (plan.minStaff === 1) {
      return `Up to ${plan.maxStaff} staff`;
    }
    return `${plan.minStaff}–${plan.maxStaff} staff`;
  }

  if (plan.maxStaff) {
    return `Up to ${plan.maxStaff} staff`;
  }

  if (plan.minStaff) {
    return `${plan.minStaff}+ staff`;
  }

  return 'Flexible staff seats';
}

export default function Pricing() {
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState('month');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [processingPlan, setProcessingPlan] = useState(null);

  // Handle plan selection for logged-in users
  const handleSelectPlan = async (planId) => {
    // If not logged in, go to signup
    if (!isLoggedIn) {
      navigate('/signup');
      return;
    }

    // If logged in, create checkout session and redirect to Stripe
    setProcessingPlan(planId);
    try {
      const plan = PLANS.find(p => p.id === planId);
      const staffCount = plan.minStaff || 1;

      const response = await paymentsAPI.createCheckoutSession(
        planId,
        staffCount,
        billingInterval
      );

      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error(error.response?.data?.detail || 'Failed to start checkout. Please try again.');
      setProcessingPlan(null);
    }
  };

  const plans = useMemo(() => {
    return PLANS.map((plan) => {
      const annualMultiplier = 12 * (1 - ANNUAL_DISCOUNT);
      const annualBase = Math.round(plan.basePrice * annualMultiplier);
      const annualPerStaff = Math.round(plan.perStaffPrice * annualMultiplier);
      const baseMonthlyDiscounted = Math.round(plan.basePrice * (1 - ANNUAL_DISCOUNT));
      const perStaffMonthlyDiscounted = Math.round(plan.perStaffPrice * (1 - ANNUAL_DISCOUNT));

      const isAnnual = billingInterval === 'year';
      const priceLabel = isAnnual ? `$${annualBase}` : `$${plan.basePrice}`;
      const perLabel = isAnnual
        ? `year + $${annualPerStaff}/staff/year`
        : `month + $${plan.perStaffPrice}/staff`;

      return {
        id: plan.id,
        name: plan.name,
        highlighted: Boolean(plan.marketing?.highlighted),
        ctaLabel: plan.marketing?.ctaLabel ?? 'Choose plan',
        tagline: plan.marketing?.tagline,
        benefits: plan.marketing?.benefits ?? [],
        limits: [
          formatStaffRange(plan),
          `${plan.guestInvites} guest invites/mo`,
          `${plan.admins} ${plan.admins === 1 ? 'admin' : 'admins'}`,
        ],
        priceLabel,
        perLabel,
        approxMonthly: isAnnual
          ? {
              base: baseMonthlyDiscounted,
              perStaff: perStaffMonthlyDiscounted,
            }
          : null,
      };
    });
  }, [billingInterval]);

  return (
    <section className="container-page py-16">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Flat-rate pricing. No per-user charges. Toggle annual billing to save 20%.
        </p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Every plan includes Microsoft 365 SSO, SHA-256 receipt hashing, and CSV exports.
        </p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">Guest acknowledgments are always free on all plans.</p>
      </div>

      <div className="mt-10 flex justify-center">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {BILLING_OPTIONS.map((option) => {
            const isActive = billingInterval === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setBillingInterval(option.id)}
                aria-pressed={isActive}
                className={`relative flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {option.label}
                {option.badge && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                    {option.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`card ${plan.highlighted ? 'ring-2 ring-indigo-500 shadow-xl' : ''}`}
          >
            <div className="card-body">
              {plan.highlighted && (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                  Most popular
                </span>
              )}
              <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {plan.name}
              </h3>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {plan.priceLabel}
                </span>
                <span className="text-slate-500 dark:text-slate-400">{plan.perLabel}</span>
              </div>
              {plan.approxMonthly && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  ≈ ${plan.approxMonthly.base}/mo + ${plan.approxMonthly.perStaff}/staff/mo after savings
                </p>
              )}
              {plan.tagline && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{plan.tagline}</p>
              )}
              <ul className="mt-4 space-y-2">
                {plan.limits.map((limit) => (
                  <li key={limit} className="flex items-center text-slate-600 dark:text-slate-300">
                    <CheckIcon className="mr-2 h-5 w-5 text-emerald-500" aria-hidden="true" /> {limit}
                  </li>
                ))}
              </ul>
              {plan.benefits.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Includes
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {plan.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-center text-sm text-slate-600 dark:text-slate-300"
                      >
                        <CheckIcon className="mr-2 h-4 w-4 text-indigo-500" aria-hidden="true" />{' '}
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={processingPlan !== null}
                className={`btn mt-6 w-full ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} ${
                  processingPlan === plan.id ? 'opacity-75 cursor-wait' : ''
                }`}
              >
                {processingPlan === plan.id ? 'Processing...' : plan.ctaLabel}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              What counts as a staff user?
            </h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Staff are managed users with login access and history. One-time recipients, contractors,
              or vendors can acknowledge policies as guests for free—seat limits are enforced
              automatically.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              What’s next on the roadmap?
            </h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Slack notifications are in active development with HRIS roster sync close behind. Book a
              demo to request early access or share integrations that would make Acktrail indispensable.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
