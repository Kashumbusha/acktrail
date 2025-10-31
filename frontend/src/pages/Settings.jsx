import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircleIcon,
  CreditCardIcon,
  BellIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  BoltIcon,
  KeyIcon,
  Square3Stack3DIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { paymentsAPI, usersAPI, dashboardAPI } from '../api/client';
import { COUNTRIES } from '../utils/countries';
import LoadingSpinner from '../components/LoadingSpinner';
import SlackIntegration from '../components/SlackIntegration';
import toast from 'react-hot-toast';
import { PLAN_MAP } from '../data/plans';

const tabs = [
  { id: 'profile', name: 'Profile', icon: UserCircleIcon },
  { id: 'subscription', name: 'Subscription & Billing', icon: CreditCardIcon },
  { id: 'integrations', name: 'Integrations', icon: Square3Stack3DIcon },
  { id: 'notifications', name: 'Notifications', icon: BellIcon },
  { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  { id: 'account', name: 'Account', icon: Cog6ToothIcon },
];

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStaffCount, setNewStaffCount] = useState('');
  const [showUpdateStaff, setShowUpdateStaff] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedPlanStaffCount, setSelectedPlanStaffCount] = useState('');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [dataExporting, setDataExporting] = useState(false);
  const [workspaceExporting, setWorkspaceExporting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification preferences state
  const [notifications] = useState({
    email: true,
    security: true,
    digest: true,
  });

  // Profile state
  const [profile, setProfile] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.workspace_name || '',
    country: user?.country || '',
  });

  useEffect(() => {
    loadSubscription();
  }, []);

  // Update profile state when user data loads
  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.workspace_name || '',
        country: user.country || '',
      });
    }
  }, [user]);

  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.trial_ends_at).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const loadSubscription = async () => {
    try {
      const response = await paymentsAPI.getSubscription();
      setSubscription(response.data);
      setNewStaffCount(response.data.active_staff_count || 0);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStaffCount = async () => {
    if (!newStaffCount || newStaffCount === subscription.active_staff_count) {
      return;
    }

    setUpdating(true);
    try {
      await paymentsAPI.updateSubscription({ new_staff_count: parseInt(newStaffCount) });
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
    const isTrialing = subscription.status === 'trialing';

    const confirmMessage = isTrialing
      ? `Change to ${newPlan.name} plan with ${selectedPlanStaffCount} staff for $${monthlyTotal}/month? Your trial will continue and you won't be charged until ${subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString() : 'trial ends'}.`
      : `Change to ${newPlan.name} plan with ${selectedPlanStaffCount} staff for $${monthlyTotal}/month? Your billing will be prorated.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdating(true);
    try {
      await paymentsAPI.updateSubscription({
        new_plan: selectedPlan,
        new_staff_count: parseInt(selectedPlanStaffCount)
      });
      toast.success(isTrialing ? 'Plan changed! Your trial continues.' : 'Plan changed successfully! Your billing will be prorated.');
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
      toast.success('Subscription cancelled. You can continue using the service until the end of your billing period.');
      await loadSubscription();
    } catch (error) {
      toast.error('Failed to cancel subscription');
    } finally {
      setUpdating(false);
    }
  };

  const handleProfileSave = async () => {
    setUpdating(true);
    try {
      const response = await usersAPI.updateProfile({
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        country: profile.country,
      });

      // Update local user state with new data
      if (response.data?.user) {
        const updatedUser = {
          ...user,
          ...response.data.user
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleNotificationToggle = () => {
    toast('Notification preference controls are coming soon.');
  };

  const handleSupportSubmit = async () => {
    if (!supportMessage.trim()) {
      toast.error('Please include a short message');
      return;
    }

    setSupportSending(true);
    try {
      await usersAPI.contactSupport({
        message: supportMessage,
        from: user?.email,
      });
      toast.success('Message sent! We\'ll get back to you soon.');
      setSupportMessage('');
      setShowSupportModal(false);
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to send message';
      toast.error(detail);
    } finally {
      setSupportSending(false);
    }
  };

  const handleDataExport = async () => {
    setDataExporting(true);
    try {
      const response = await usersAPI.exportMyAssignments();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `policy-acknowledgments-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Export started. Check your downloads folder.');
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to export data';
      toast.error(detail);
    } finally {
      setDataExporting(false);
    }
  };

  const handleWorkspaceExport = async () => {
    setWorkspaceExporting(true);
    try {
      const response = await dashboardAPI.exportWorkspaceData();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `workspace-data-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Workspace data exported successfully!');
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to export workspace data';
      toast.error(detail);
    } finally {
      setWorkspaceExporting(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (!window.confirm('Delete your account and all associated data? This action cannot be undone.')) {
      return;
    }

    setDeletingAccount(true);
    try {
      await usersAPI.contactSupport({
        message: `Account deletion requested by ${user?.email || 'unknown user'} in workspace ${user?.workspace_name || 'unknown workspace'}. Please confirm once the deletion is complete.`,
        from: user?.email,
        name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.name,
        company: user?.workspace_name,
        goal: 'Account deletion request',
      });
      toast.success('Deletion request submitted. We will follow up via email.');
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to submit deletion request';
      toast.error(detail);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!passwordData.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setUpdating(true);
    try {
      await usersAPI.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to update password';
      toast.error(detail);
    } finally {
      setUpdating(false);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profile Information</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Update your account information</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center space-x-3">
            <QuestionMarkCircleIcon className="h-6 w-6 text-primary-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Need a hand?</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Contact support anytime – we're here for you.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Contact support
            </button>
            <button
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-200 rounded-lg shadow-sm hover:bg-primary-50 transition"
            >
              Email us
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 text-white shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <BoltIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Upgrade plan</p>
                <p className="text-sm opacity-90">
                  {trialDaysRemaining === null
                    ? 'Start your free trial and unlock all features'
                    : trialDaysRemaining > 0
                      ? `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left before your trial ends`
                      : 'Your trial ends today'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('subscription')}
              className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold bg-white text-primary-600 rounded-lg shadow-sm hover:bg-slate-100"
            >
              View plans
            </button>
          </div>
        </div>

        {subscription && subscription.staff_count ? (
          <div className="mb-8 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 p-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Employee Seats (Billable)</h4>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Licensed</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{subscription.staff_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In use</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{subscription.active_staff_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{Math.max(subscription.staff_count - subscription.active_staff_count, 0)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-slate-700 pt-3">
              ℹ️ Admins are not counted towards your seat limit. Your plan includes separate admin allocations.
            </p>
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company
            </label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Acme Labs"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Country
            </label>
            <select
              value={profile.country}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            >
              <option value="">Select country</option>
              {COUNTRIES.map((countryName) => (
                <option key={countryName} value={countryName}>
                  {countryName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setProfile({
              firstName: user?.first_name || '',
              lastName: user?.last_name || '',
              email: user?.email || '',
              phone: user?.phone || '',
              company: user?.workspace_name || '',
              country: user?.country || '',
            })}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleProfileSave}
            disabled={updating}
            className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {updating && <LoadingSpinner size="sm" className="mr-2" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  const renderSubscriptionTab = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (!subscription) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No subscription found</p>
        </div>
      );
    }

    const plan = PLAN_MAP[subscription.plan] || PLAN_MAP.small;
    // Use staff_count (licensed seats) for billing, not active_staff_count (current usage)
    const monthlyTotal = plan.basePrice + (plan.perStaffPrice * (subscription.staff_count || 0));
    const isTrialing = subscription.status === 'trialing';
    const isCancelled = subscription.status === 'canceled';

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Subscription & Billing</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your subscription, payment methods, and invoices</p>
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Plan</h3>
            <div className="flex items-center gap-3">
              {subscription.stripe_customer_id && !isCancelled && (
                <button
                  onClick={() => {
                    setShowChangePlan(!showChangePlan);
                    if (!showChangePlan) {
                      setSelectedPlan(subscription.plan);
                      setSelectedPlanStaffCount(subscription.staff_count || subscription.active_staff_count);
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
                subscription.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300'
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Staff Members (Licensed)</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {subscription.staff_count || 0} × ${plan.perStaffPrice}/month
              </p>
            </div>
          </div>

          {/* Plan Change Form */}
          {showChangePlan && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Select New Plan</h4>
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
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Preview */}
                {selectedPlan && selectedPlanStaffCount && (
                  <div className={`${isTrialing ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'} border rounded-lg p-4`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm font-medium ${isTrialing ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>New Monthly Total</span>
                      <span className={`text-xl font-bold ${isTrialing ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                        ${PLAN_MAP[selectedPlan].basePrice + (PLAN_MAP[selectedPlan].perStaffPrice * parseInt(selectedPlanStaffCount))}
                      </span>
                    </div>
                    <p className={`text-xs ${isTrialing ? 'text-blue-800 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400'}`}>
                      {isTrialing
                        ? `Your trial continues until ${subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString() : 'it ends'}. No charge until then.`
                        : 'Your billing will be prorated for the remaining period.'}
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

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Seats</h3>
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
                  Number of employee seats
                </label>
                <input
                  type="number"
                  min="1"
                  max={plan.maxStaff}
                  value={newStaffCount}
                  onChange={(e) => setNewStaffCount(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Maximum {plan.maxStaff} employees for {plan.name} plan (admins not included)
                </p>
              </div>
              <button
                onClick={handleUpdateStaffCount}
                disabled={updating || newStaffCount === subscription.active_staff_count}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating && <LoadingSpinner size="sm" className="mr-2" />}
                Save Changes
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-400">
                {subscription.staff_count ? (
                  <>
                    You are licensed for <strong>{subscription.staff_count}</strong> employee seats and currently using <strong>{subscription.active_staff_count}</strong>.
                    {' '}Billing is based on licensed seats, not usage. Admins are not counted.
                  </>
                ) : (
                  <>
                    Your <strong>{plan.name}</strong> plan supports up to <strong>{plan.maxStaff} employees</strong>.
                    {' '}Complete checkout to activate your subscription and start inviting employees.
                  </>
                )}
              </p>
              {subscription.staff_count > 0 && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 You pay for <strong>{subscription.staff_count} licensed seats</strong> regardless of usage. Currently {subscription.active_staff_count} in use, {subscription.staff_count - subscription.active_staff_count} available.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Manage Subscription</h3>

          <div className="space-y-3">
            {subscription.stripe_customer_id ? (
              <button
                onClick={handleOpenCustomerPortal}
                disabled={updating}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
  };

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Notification Preferences</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose how you receive alerts. More delivery options are coming soon.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-200 dark:divide-slate-700">
        {[
          { key: 'email', label: 'Email Notifications', description: 'Receive email updates about your account activity' },
          { key: 'security', label: 'Security Alerts', description: 'Get notified about security-related activities' },
          { key: 'digest', label: 'Weekly Digest', description: 'Receive a weekly summary of your account activity' },
        ].map((item) => (
          <div key={item.key} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">{item.label}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
              </div>
              <button
                onClick={handleNotificationToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications[item.key] ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-600'
                }`}
                disabled
                aria-disabled="true"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <BellIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You can always update your notification preferences later. Some notifications are required for account security and cannot be disabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Security Settings</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Protect your account</p>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button
          onClick={handlePasswordChange}
          disabled={updating}
          className="mt-4 px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {updating && <LoadingSpinner size="sm" className="mr-2" />}
          Update Password
        </button>
      </div>

      {/* SSO Settings - Show if admin and SSO purchased */}
      {user?.role === 'admin' && subscription?.sso_purchased && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Single Sign-On (SSO)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure Microsoft 365 SSO for your workspace</p>
            </div>
            {subscription.sso_enabled && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Enabled
              </span>
            )}
          </div>

          <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
            <KeyIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {subscription.sso_enabled
                  ? 'SSO is configured. Users can sign in with Microsoft 365.'
                  : 'Configure SSO to allow your team to sign in with their Microsoft 365 accounts.'
                }
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/settings/sso')}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
          >
            <KeyIcon className="h-4 w-4 mr-2" />
            {subscription.sso_enabled ? 'Manage SSO Configuration' : 'Configure SSO'}
          </button>
        </div>
      )}

    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Management</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Manage your account settings</p>
      </div>

      {/* Account Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Status</h3>
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Account Active</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your account is in good standing</p>
          </div>
          <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data & Privacy</h3>
        <div className="space-y-3">
          {user?.role === 'admin' && (
            <button
              onClick={handleWorkspaceExport}
              disabled={workspaceExporting}
              className="w-full text-left p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Export All Workspace Data</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Export complete workspace data including all policies, assignments, and users (CSV)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Includes: All policy details, employee info, acknowledgment details, IP addresses, and more</p>
                </div>
                {workspaceExporting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
          )}
          <button
            onClick={handleDataExport}
            disabled={dataExporting}
            className="w-full text-left p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Download Your Data</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Export your personal policy assignments (CSV)</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Includes: Policy titles, statuses, dates (assigned, viewed, acknowledged, due)</p>
              </div>
              {dataExporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-red-200 dark:border-red-800 p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">Danger Zone</h3>
        <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Delete Account</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Permanently delete your account and all data</p>
          </div>
          <button
            onClick={handleAccountDeletion}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={deletingAccount}
          >
            {deletingAccount && <LoadingSpinner size="sm" className="mr-2" />}
            {deletingAccount ? 'Submitting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'subscription' && renderSubscriptionTab()}
          {activeTab === 'integrations' && <SlackIntegration />}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'account' && renderAccountTab()}
        </div>
      </div>

      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact support</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Messages go straight to kashustephen@gmail.com</p>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={5}
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="How can we help?"
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
                disabled={supportSending}
              >
                Cancel
              </button>
              <button
                onClick={handleSupportSubmit}
                className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 disabled:opacity-60"
                disabled={supportSending}
              >
                {supportSending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
