import { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { EnvelopeIcon, KeyIcon, DocumentTextIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { teamsAPI, paymentsAPI } from '../api/client';
import { isValidEmail, isValidVerificationCode } from '../utils/validators';
import { COUNTRIES } from '../utils/countries';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { PLANS, SSO_MONTHLY_PRICE, calculatePlanPrice } from '../data/plans';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Math.round(value));

export default function Signup() {
  const { login, sendCode, isAuthenticated } = useAuth();
  const location = useLocation();
  const [step, setStep] = useState(1); // 1: team+email, 2: plan selection, 3: verification code
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('medium'); // Default to medium (popular)
  const [staffCount, setStaffCount] = useState(11); // Default 11 staff (minimum for medium plan)
  const [billingInterval, setBillingInterval] = useState('month'); // 'month' or 'year'
  const [ssoEnabled, setSsoEnabled] = useState(false); // SSO addon
  const [workspaceId, setWorkspaceId] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [teamError, setTeamError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [countryError, setCountryError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [goingToCheckout, setGoingToCheckout] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  // Don't redirect if we're in the checkout flow
  if (isAuthenticated && !goingToCheckout) {
    return <Navigate to={from} replace />;
  }

  const pricing = calculatePlanPrice(selectedPlan, staffCount, billingInterval, ssoEnabled);
  const selectedPlanConfig = PLANS.find(p => p.id === selectedPlan);
  const annualSavings = Math.max(0, pricing.undiscountedMonthly * 12 - pricing.annual);

  // Handle plan change - automatically adjust staff count to plan's default
  const handlePlanChange = (planId) => {
    setSelectedPlan(planId);
    const plan = PLANS.find(p => p.id === planId);

    // Set staff count based on plan defaults
    if (planId === 'small') {
      setStaffCount(5); // Small: default to 5 staff
    } else if (planId === 'medium') {
      setStaffCount(11); // Medium: minimum 11 staff
    } else if (planId === 'large') {
      setStaffCount(50); // Large: minimum 50 staff
    }
  };

  // Step 1: Submit team name and email (create workspace)
  const handleTeamEmailSubmit = async (e) => {
    e.preventDefault();

    let hasError = false;

    setTeamError('');
    setEmailError('');
    setFirstNameError('');
    setLastNameError('');
    setPhoneError('');
    setCountryError('');
    setPasswordError('');

    if (!teamName.trim()) {
      setTeamError('Please enter a workspace name');
      hasError = true;
    }

    if (!firstName.trim()) {
      setFirstNameError('Please enter your first name');
      hasError = true;
    }

    if (!lastName.trim()) {
      setLastNameError('Please enter your last name');
      hasError = true;
    }

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    if (!phone.trim()) {
      setPhoneError('Please enter your phone number');
      hasError = true;
    }

    if (!country.trim()) {
      setCountryError('Please select your country');
      hasError = true;
    }

    if (!password || password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setLoading(true);

    try {
      // Register workspace with all user details including plan selection
      const registerResponse = await teamsAPI.register(
        teamName,
        email,
        selectedPlan,      // Use selected plan from state
        ssoEnabled,        // Use SSO selection from state
        firstName,
        lastName,
        phone,
        country,
        password,
        staffCount,        // Pass staff count
        billingInterval    // Pass billing interval
      );
      const newWorkspaceId = registerResponse.data.workspace_id;

      if (!newWorkspaceId) {
        throw new Error('Failed to create workspace - no workspace ID returned');
      }

      setWorkspaceId(newWorkspaceId);
      setStep(2); // Move to plan selection
      toast.success('Workspace created! Now choose your plan.');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to create workspace';
      if (errorMsg.includes('already exists')) {
        setTeamError(errorMsg);
      } else {
        setEmailError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit plan selection
  const handlePlanSubmit = async (e) => {
    e.preventDefault();

    // Validate staff count for selected plan
    if (selectedPlanConfig.maxStaff && staffCount > selectedPlanConfig.maxStaff) {
      toast.error(`${selectedPlanConfig.name} supports up to ${selectedPlanConfig.maxStaff} staff`);
      return;
    }
    if (selectedPlanConfig.minStaff && staffCount < selectedPlanConfig.minStaff) {
      toast.error(`${selectedPlanConfig.name} requires at least ${selectedPlanConfig.minStaff} staff`);
      return;
    }

    setLoading(true);

    try {
      // Store plan selection in localStorage for magic link verification
      localStorage.setItem('pendingCheckout', JSON.stringify({
        workspaceId,
        plan: selectedPlan,
        staffCount,
        billingInterval,
        ssoEnabled
      }));

      // Send verification code
      const result = await sendCode(email, workspaceId);
      if (result.success) {
        setStep(3);
        toast.success('We sent you a verification code');
      } else {
        const errorMsg = result.error || 'Failed to send verification code';
        toast.error(errorMsg);
        console.error('Send code error:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to send verification code';
      toast.error(errorMsg);
      console.error('Send code exception:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify code and redirect to Stripe Checkout
  const handleCodeSubmit = async (e) => {
    e.preventDefault();

    if (!isValidVerificationCode(code)) {
      setCodeError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setCodeError('');

    try {
      // Set flag to prevent auto-redirect to dashboard after login
      setGoingToCheckout(true);

      // First verify the code and login
      const result = await login(email, code, workspaceId);
      if (!result.success) {
        setCodeError(result.error);
        setLoading(false);
        setGoingToCheckout(false);
        return;
      }

      // Now create checkout session and redirect to Stripe
      const checkoutResponse = await paymentsAPI.createCheckoutSession(
        selectedPlan,
        staffCount,
        billingInterval,
        ssoEnabled
      );

      if (checkoutResponse.data?.url) {
        // Clear pending checkout from localStorage
        localStorage.removeItem('pendingCheckout');
        // Redirect to Stripe Checkout
        window.location.href = checkoutResponse.data.url;
      } else {
        toast.error('Failed to create checkout session');
        setLoading(false);
        setGoingToCheckout(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to process signup';
      setCodeError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      setGoingToCheckout(false);
    }
  };

  const handleBackToEmail = () => {
    setStep(1);
    setCode('');
    setCodeError('');
  };

  const handleBackToPlan = () => {
    setStep(2);
    setCode('');
    setCodeError('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(space.16))] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-600 rounded-2xl p-3 shadow-lg">
                <DocumentTextIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {step === 1 && 'Create your workspace'}
              {step === 2 && 'Choose your plan'}
              {step === 3 && 'Verify your email'}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              {step === 1 && 'Add a workspace name and your email to get started.'}
              {step === 2 && 'Start your 7-day free trial'}
              {step === 3 && `We sent a code to ${email}`}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-6 flex items-center justify-center space-x-2">
            <div className={`h-2 w-16 rounded-full transition-all ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
            <div className={`h-2 w-16 rounded-full transition-all ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
            <div className={`h-2 w-16 rounded-full transition-all ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 dark:bg-slate-900 dark:border dark:border-slate-800">
            {/* Step 1: Team Name & User Details */}
            {step === 1 && (
              <form className="space-y-4" onSubmit={handleTeamEmailSubmit}>
                <div>
                  <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
                    Workspace name
                  </label>
                  <input
                    id="team"
                    name="team"
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      setTeamError('');
                    }}
                    className={`appearance-none block w-full px-3 py-3 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 ${
                      teamError ? 'border-danger-300 bg-danger-50 dark:bg-danger-950/20' : 'border-gray-300 dark:border-slate-700'
                    }`}
                    placeholder="Acme Workspace"
                    disabled={loading}
                  />
                  {teamError && (
                    <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                      <span className="mr-1">⚠️</span>
                      {teamError}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setFirstNameError('');
                      }}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg placeholder-gray-400 text-gray-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="John"
                      disabled={loading}
                    />
                    {firstNameError && (
                      <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                        <span className="mr-1">⚠️</span>
                        {firstNameError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setLastNameError('');
                      }}
                      className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg placeholder-gray-400 text-gray-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="Doe"
                      disabled={loading}
                    />
                    {lastNameError && (
                      <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                        <span className="mr-1">⚠️</span>
                        {lastNameError}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
                    Work email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 ${
                        emailError ? 'border-danger-300 bg-danger-50 dark:bg-danger-950/20' : 'border-gray-300 dark:border-slate-700'
                      }`}
                      placeholder="you@company.com"
                      disabled={loading}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                      <span className="mr-1">⚠️</span>
                      {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError('');
                    }}
                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg placeholder-gray-400 text-gray-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="+1 (555) 123-4567"
                    disabled={loading}
                  />
                  {phoneError && (
                    <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                      <span className="mr-1">⚠️</span>
                      {phoneError}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Country
                  </label>
                  <select
                    id="country"
                    required
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setCountryError('');
                    }}
                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    disabled={loading}
                  >
                    <option value="">Select your country</option>
                    {COUNTRIES.map((countryName) => (
                      <option key={countryName} value={countryName}>
                        {countryName}
                      </option>
                    ))}
                  </select>
                  {countryError && (
                    <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                      <span className="mr-1">⚠️</span>
                      {countryError}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg placeholder-gray-400 text-gray-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    minLength="8"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum 8 characters</p>
                  {passwordError && (
                    <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                      <span className="mr-1">⚠️</span>
                      {passwordError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !teamName || !firstName || !lastName || !phone || !country || !password}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading && <LoadingSpinner size="sm" className="mr-2" />}
                  {loading ? 'Creating workspace...' : 'Next →'}
                </button>
              </form>
            )}

            {/* Step 2: Plan Selection */}
            {step === 2 && (
              <form className="space-y-5" onSubmit={handlePlanSubmit}>
                {/* Billing Interval Toggle */}
                <div className="flex justify-center mb-4">
                  <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 p-1 bg-gray-50 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setBillingInterval('month')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        billingInterval === 'month'
                          ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingInterval('year')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all relative ${
                        billingInterval === 'year'
                          ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Annual
                      <span className="ml-1 text-xs text-success-600 dark:text-success-400 font-semibold">
                        Save 15%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Staff Count Input */}
                <div>
                  <label htmlFor="staffCount" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
                    Number of staff members
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UsersIcon className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                    </div>
                    <input
                      id="staffCount"
                      name="staffCount"
                      type="number"
                      min={selectedPlanConfig.minStaff || 1}
                      max={selectedPlanConfig.maxStaff}
                      required
                      value={staffCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        const minStaff = selectedPlanConfig.minStaff || 1;
                        const maxStaff = selectedPlanConfig.maxStaff;
                        if (value >= minStaff && value <= maxStaff) {
                          setStaffCount(value);
                        }
                      }}
                      className="appearance-none block w-full px-3 py-3 pl-10 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 dark:border-slate-700"
                      placeholder={selectedPlanConfig.minStaff || 1}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {selectedPlanConfig.minStaff
                      ? `${selectedPlanConfig.minStaff}-${selectedPlanConfig.maxStaff} staff for ${selectedPlanConfig.name} plan • Guest users don't count`
                      : `Up to ${selectedPlanConfig.maxStaff} staff • Guest users don't count`
                    }
                  </p>
                </div>

                {/* Plan Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 dark:text-gray-200">
                    Select your plan
                  </label>
                  <div className="grid gap-3">
                    {PLANS.map((plan) => {
                      const planPricing = calculatePlanPrice(plan.id, staffCount, billingInterval, false);
                      const isAnnual = billingInterval === 'year';
                      const primaryAmount = isAnnual ? planPricing.annual : planPricing.monthly;
                      const primaryLabel = isAnnual ? '/year' : '/month';
                      const monthlyEquivalent = isAnnual ? planPricing.discountedMonthly : null;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => handlePlanChange(plan.id)}
                          className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                            selectedPlan === plan.id
                              ? 'border-primary-600 bg-primary-50/50 dark:bg-slate-800 dark:border-primary-500'
                              : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-800/50'
                          }`}
                        >
                          {plan.popular && (
                            <span className="absolute -top-2 right-4 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                              Popular
                            </span>
                          )}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                {formatCurrency(plan.basePrice)}/mo base + {formatCurrency(plan.perStaffPrice)}/staff
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {plan.minStaff ? `${plan.minStaff}-${plan.maxStaff}` : `Up to ${plan.maxStaff}`} staff • {plan.guestInvites} guest invites/mo
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(primaryAmount)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {primaryLabel}
                              </div>
                              {isAnnual && (
                                <div className="text-xs text-success-600 dark:text-success-400 font-medium mt-0.5">
                                  ≈ {formatCurrency(monthlyEquivalent)} /mo after savings
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            {plan.features.map((feature, idx) => (
                              <p key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-center">
                                <span className="mr-1.5">✓</span>
                                {feature}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SSO Addon */}
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-4 bg-gray-50/50 dark:bg-slate-800/50">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ssoEnabled}
                      onChange={(e) => setSsoEnabled(e.target.checked)}
                      className="mt-1 h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">SSO Add-on</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(SSO_MONTHLY_PRICE)}
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/mo</span>
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        Enable Single Sign-On (SAML, OAuth) for seamless authentication
                      </p>
                    </div>
                  </label>
                </div>

                {/* Price Summary */}
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Base plan</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(billingInterval === 'year' ? pricing.baseAnnual : pricing.baseMonthly)}/{billingInterval === 'year' ? 'year' : 'mo'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {staffCount} staff × {formatCurrency(selectedPlanConfig.perStaffPrice)}/mo
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(billingInterval === 'year' ? pricing.staffAnnual : pricing.staffMonthly)}/{billingInterval === 'year' ? 'year' : 'mo'}
                    </span>
                  </div>
                  {billingInterval === 'year' && annualSavings > 0 && (
                    <div className="flex justify-between text-sm text-success-600 dark:text-success-400">
                      <span>Annual savings (15%)</span>
                      <span className="font-medium">
                        -{formatCurrency(annualSavings)}
                      </span>
                    </div>
                  )}
                  {ssoEnabled && (
                    <div className="flex justify-between text-sm border-t border-gray-200 dark:border-slate-700 pt-2 mt-2">
                      <span className="text-gray-600 dark:text-gray-300">SSO Add-on</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(billingInterval === 'year' ? pricing.ssoAnnual : pricing.ssoMonthly)}/{billingInterval === 'year' ? 'year' : 'mo'}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">Recurring total</span>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(billingInterval === 'year' ? pricing.annual : pricing.monthly)}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                          /{billingInterval === 'year' ? 'year' : 'mo'}
                        </span>
                      </div>
                      {billingInterval === 'year' && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Equivalent to {formatCurrency(pricing.discountedMonthly)}/mo billed annually
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
                    7-day free trial • Cancel anytime
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 dark:hover:bg-slate-700"
                    disabled={loading}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {loading && <LoadingSpinner size="sm" className="mr-2" />}
                    {loading ? 'Processing...' : 'Continue →'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Verification Code */}
            {step === 3 && (
              <form className="space-y-5" onSubmit={handleCodeSubmit}>
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
                    Verification code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyIcon className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                    </div>
                    <input
                      id="code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="6"
                      required
                      value={code}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setCode(value);
                        setCodeError('');
                      }}
                      className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center tracking-[0.5em] text-xl font-semibold transition-all dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 ${
                        codeError ? 'border-danger-300 bg-danger-50 dark:bg-danger-950/20' : 'border-gray-300 dark:border-slate-700'
                      }`}
                      placeholder="000000"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  {codeError && (
                    <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                      <span className="mr-1">⚠️</span>
                      {codeError}
                    </p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleBackToPlan}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 dark:hover:bg-slate-700"
                    disabled={loading}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {loading && <LoadingSpinner size="sm" className="mr-2" />}
                    {loading ? 'Processing...' : 'Start free trial →'}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setResendingCode(true);
                      try {
                        const result = await sendCode(email, workspaceId);
                        if (result.success) {
                          toast.success('New code sent');
                        } else {
                          toast.error(result.error);
                        }
                      } catch (error) {
                        toast.error(error.response?.data?.detail || error.message || 'Failed to resend code');
                      } finally {
                        setResendingCode(false);
                      }
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 transition-colors dark:text-primary-400 dark:hover:text-primary-300"
                    disabled={loading || resendingCode}
                  >
                    {resendingCode ? 'Sending another code...' : (
                      <>Didn't receive the code? <span className="underline">Send again</span></>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-200">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300">
              Sign in
            </Link>
          </p>
        </div>
    </div>
  );
}
