import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCardIcon, UserGroupIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { paymentsAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { PLAN_MAP } from '../data/plans';

export default function Billing() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStaffCount, setNewStaffCount] = useState('');
  const [showUpdateStaff, setShowUpdateStaff] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedPlanStaffCount, setSelectedPlanStaffCount] = useState('');

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await paymentsAPI.getSubscription();
      setSubscription(response.data);
      setNewStaffCount(response.data.staff_count);  // Use licensed seats, not active count
    } catch (error) {
      console.error('Failed to load subscription:', error);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStaffCount = async () => {
    if (!newStaffCount || newStaffCount === subscription.staff_count) {
      return;
    }

    setUpdating(true);
    try {
      await paymentsAPI.updateSubscription({ new_staff_count: parseInt(newStaffCount) });

      // Wait for Stripe webhooks to complete (can take 1-5 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Staff count updated successfully');
      await loadSubscription();
      setShowUpdateStaff(false);
    } catch (error) {
      toast.error('Failed to update staff count');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    setUpdating(true);
    try {
      const response = await paymentsAPI.createCustomerPortal();
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to open customer portal');
      setUpdating(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlan || !selectedPlanStaffCount) {
      toast.error('Please select a plan and staff count');
      return;
    }

    if (selectedPlan === subscription.plan) {
      toast.error('Please select a different plan');
      return;
    }

    const newPlan = PLAN_MAP[selectedPlan];
    const monthlyTotal = newPlan.basePrice + (newPlan.perStaffPrice * parseInt(selectedPlanStaffCount));

    if (!window.confirm(`Change to ${newPlan.name} plan with ${selectedPlanStaffCount} staff for $${monthlyTotal}/month?`)) {
      return;
    }

    setUpdating(true);
    try {
      await paymentsAPI.updateSubscription({
        new_plan: selectedPlan,
        new_staff_count: parseInt(selectedPlanStaffCount)
      });

      // Wait for Stripe webhooks to complete (can take 1-5 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Plan changed successfully! Your billing will be prorated.');

      // Force reload subscription data from server
      await loadSubscription();
      setShowChangePlan(false);
    } catch (error) {
      toast.error('Failed to change plan');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setUpdating(true);
    try {
      await paymentsAPI.cancelSubscription();

      // Wait for Stripe webhooks to complete (can take 1-5 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success('Subscription cancelled. You can continue using the service until the end of your billing period.');
      await loadSubscription();
    } catch (error) {
      toast.error('Failed to cancel subscription');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!subscription || !subscription.status || subscription.status === 'canceled') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border dark:border-slate-700">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            Your Trial Has Expired
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            Subscribe now to continue using AckTrail and unlock all features.
          </p>
          <a
            href="/pricing"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg"
          >
            View Plans & Subscribe
          </a>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-4">
            Choose the plan that works best for your team
          </p>
        </div>
      </div>
    );
  }

  const plan = PLAN_MAP[subscription.plan] || PLAN_MAP.small;
  const monthlyTotal = plan.basePrice + (plan.perStaffPrice * subscription.staff_count);
  const isTrialing = subscription.status === 'trialing';
  const isCancelled = subscription.status === 'canceled';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your subscription, payment methods, and invoices
        </p>
      </div>

      {/* Trial Banner */}
      {isTrialing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">Free Trial Active</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Your 7-day free trial ends on {subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString() : 'N/A'}.
                You won't be charged until then.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Banner */}
      {isCancelled && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-100">Subscription Cancelled</h3>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                Your subscription has been cancelled. You can continue using the service until {subscription.subscription_current_period_end ? new Date(subscription.subscription_current_period_end).toLocaleDateString() : 'the end of your billing period'}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Plan</h2>
          <div className="flex items-center gap-3">
            {subscription.stripe_customer_id && !isCancelled && (
              <button
                onClick={() => {
                  setShowChangePlan(!showChangePlan);
                  if (!showChangePlan) {
                    setSelectedPlan(subscription.plan);
                    setSelectedPlanStaffCount(subscription.staff_count);
                  }
                }}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                disabled={updating}
              >
                {showChangePlan ? 'Cancel' : 'Change Plan'}
              </button>
            )}
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              isTrialing ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
              subscription.status === 'active' ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300' :
              'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-300'
            }`}>
              {subscription.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Plan</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Billing</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {subscription.billing_interval === 'monthly' ? 'Monthly' : 'Annual'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Base Price</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">${plan.basePrice}/month</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Licensed Seats</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {subscription.staff_count} × ${plan.perStaffPrice}/month
            </p>
          </div>
        </div>

        {/* Plan Change Form */}
        {showChangePlan && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Select New Plan</h3>
            <div className="space-y-4">
              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plan Tier
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => {
                    setSelectedPlan(e.target.value);
                  const newPlan = PLAN_MAP[e.target.value];
                    const currentStaff = parseInt(selectedPlanStaffCount);

                    // Auto-adjust staff count to meet new plan requirements
                    if (newPlan.minStaff && currentStaff < newPlan.minStaff) {
                      // If below minimum, set to minimum
                      setSelectedPlanStaffCount(newPlan.minStaff.toString());
                    } else if (currentStaff > newPlan.maxStaff) {
                      // If above maximum, set to maximum
                      setSelectedPlanStaffCount(newPlan.maxStaff.toString());
                    }
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="small">Small Business - ${PLAN_MAP.small.basePrice} + ${PLAN_MAP.small.perStaffPrice}/staff (1-{PLAN_MAP.small.maxStaff} staff)</option>
                  <option value="medium">Medium Team - ${PLAN_MAP.medium.basePrice} + ${PLAN_MAP.medium.perStaffPrice}/staff ({PLAN_MAP.medium.minStaff}-{PLAN_MAP.medium.maxStaff} staff)</option>
                  <option value="large">Large - ${PLAN_MAP.large.basePrice} + ${PLAN_MAP.large.perStaffPrice}/staff ({PLAN_MAP.large.minStaff}-{PLAN_MAP.large.maxStaff} staff)</option>
                </select>
              </div>

              {/* Staff Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Staff
                </label>
                <input
                  type="number"
                  min="1"
                  max={PLAN_MAP[selectedPlan]?.maxStaff || 10}
                  value={selectedPlanStaffCount}
                  onChange={(e) => setSelectedPlanStaffCount(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Preview */}
              {selectedPlan && selectedPlanStaffCount && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">New Monthly Total</span>
                    <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                      ${PLAN_MAP[selectedPlan].basePrice + (PLAN_MAP[selectedPlan].perStaffPrice * parseInt(selectedPlanStaffCount))}
                    </span>
                  </div>
                  <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                    Your billing will be prorated for the remaining period.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleChangePlan}
                disabled={updating || !selectedPlan || !selectedPlanStaffCount || selectedPlan === subscription.plan}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating && <LoadingSpinner size="sm" className="mr-2" />}
                Confirm Plan Change
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total per month</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">${monthlyTotal}</span>
          </div>
          {subscription.subscription_current_period_end && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Next billing date: {new Date(subscription.subscription_current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Staff Management */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <UserGroupIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Staff Members</h2>
          </div>
          {subscription.stripe_customer_id && (
            <button
              onClick={() => setShowUpdateStaff(!showUpdateStaff)}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              disabled={updating}
            >
              {showUpdateStaff ? 'Cancel' : 'Update'}
            </button>
          )}
        </div>

        {showUpdateStaff ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of staff members
              </label>
              <input
                type="number"
                min="1"
                max={plan.maxStaff}
                value={newStaffCount}
                onChange={(e) => setNewStaffCount(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Maximum {plan.maxStaff} staff for {plan.name} plan
              </p>
            </div>
            <button
              onClick={handleUpdateStaffCount}
              disabled={updating || newStaffCount === subscription.staff_count}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating && <LoadingSpinner size="sm" className="mr-2" />}
              Save Changes
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              You have <strong>{subscription.staff_count} licensed seats</strong> on the <strong>{plan.name}</strong> plan.
              {' '}Currently, <strong>{subscription.active_staff_count} of {subscription.staff_count} seats</strong> are in use.
            </p>
            <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Seat Usage</span>
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {subscription.active_staff_count} / {subscription.staff_count}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((subscription.active_staff_count / subscription.staff_count) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                You can invite {subscription.staff_count - subscription.active_staff_count} more {subscription.staff_count - subscription.active_staff_count === 1 ? 'member' : 'members'}.
                {' '}Guest users don't count toward this limit.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SSO & Integrations (Included) */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Single Sign-On & Integrations</h2>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300">
            Included
          </span>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Microsoft 365 SSO and Slack integration are included in your plan at no extra cost. Configure them in Settings to enable seamless authentication and user sync.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            <strong>Available Integrations:</strong>
          </p>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
            <li>Microsoft 365 SSO - Single sign-on with Azure AD</li>
            <li>Slack Integration - Sync users from your Slack workspace</li>
          </ul>
          <Link
            to="/settings/sso"
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Configure Microsoft SSO →
          </Link>
          <Link
            to="/settings/slack"
            className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Configure Slack Integration →
          </Link>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Manage Subscription</h2>

        <div className="space-y-3">
          {subscription.stripe_customer_id ? (
            <button
              onClick={handleOpenCustomerPortal}
              disabled={updating}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-slate-700 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {updating && <LoadingSpinner size="sm" className="mr-2" />}
              <CreditCardIcon className="h-4 w-4 mr-2" />
              Manage Payment Methods & Invoices
            </button>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Complete Your Checkout</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    A checkout link was sent to your email. Click it and complete the payment form to activate your subscription and manage billing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isCancelled && subscription.stripe_customer_id && (
            <button
              onClick={handleCancelSubscription}
              disabled={updating}
              className="w-full flex justify-center items-center py-2 px-4 border border-red-300 dark:border-red-800 text-sm font-medium rounded-lg text-red-700 dark:text-red-300 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {updating && <LoadingSpinner size="sm" className="mr-2" />}
              Cancel Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
