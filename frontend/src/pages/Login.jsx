import { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { EnvelopeIcon, KeyIcon, DocumentTextIcon, BuildingOfficeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { teamsAPI, authAPI } from '../api/client';
import { isValidEmail, isValidVerificationCode } from '../utils/validators';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, sendCode, isAuthenticated } = useAuth();
  const location = useLocation();
  const [step, setStep] = useState(1); // 1: workspace name, 2: email+password, 3: code (if magic link chosen)
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceId, setWorkspaceId] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false); // Toggle between password and magic link
  const [loading, setLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [codeError, setCodeError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleWorkspaceSubmit = async (e) => {
    e.preventDefault();

    if (!workspaceName.trim()) {
      setWorkspaceError('Please enter a workspace name');
      return;
    }

    setLoading(true);
    setWorkspaceError('');

    try {
      const response = await teamsAPI.checkWorkspace(workspaceName);
      if (response.data.success && response.data.workspace_id) {
        setWorkspaceId(response.data.workspace_id);
        setStep(2); // Move to email/password input
      } else {
        throw new Error('Workspace ID not returned from server');
      }
    } catch (error) {
      setWorkspaceError(error.response?.data?.detail || error.message || 'Workspace not found');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setPasswordError('Please enter your password');
      return;
    }

    if (!workspaceId) {
      setEmailError('Workspace information is missing. Please start over.');
      return;
    }

    setLoading(true);
    setEmailError('');
    setPasswordError('');

    try {
      const response = await authAPI.loginPassword(email, password, workspaceId);
      if (response.data.access_token) {
        // Store token and user
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Successfully logged in');
        window.location.href = from; // Force a full page reload to update auth state
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to login';
      if (errorMsg.includes('password')) {
        setPasswordError(errorMsg);
      } else {
        setEmailError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkRequest = async (e) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!workspaceId) {
      setEmailError('Workspace information is missing. Please start over.');
      return;
    }

    setLoading(true);
    setEmailError('');

    try {
      const result = await sendCode(email, workspaceId);
      if (result.success) {
        setStep(3); // Move to code verification
        toast.success('Verification code sent to your email');
      } else {
        setEmailError(result.error);
      }
    } catch (error) {
      setEmailError(error.response?.data?.detail || error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();

    if (!isValidVerificationCode(code)) {
      setCodeError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setCodeError('');

    try {
      const result = await login(email, code, workspaceId);
      if (result.success) {
        toast.success('Successfully logged in');
        // Navigation will be handled by the auth state change
      } else {
        setCodeError(result.error);
      }
    } catch (error) {
      setCodeError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep(2);
    setCode('');
    setCodeError('');
  };

  const handleBackToWorkspace = () => {
    setStep(1);
    setEmail('');
    setPassword('');
    setEmailError('');
    setPasswordError('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo/Branding */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-600 rounded-2xl p-3 shadow-lg">
                <DocumentTextIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Policy Acknowledgment Tracker
            </h1>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100">
                {step === 1 ? 'Sign in' : step === 2 ? 'Enter your credentials' : 'Verify your email'}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                {step === 1
                  ? 'Enter your workspace name to continue'
                  : step === 2
                  ? `Sign in to workspace "${workspaceName}"`
                  : `We sent a 6-digit code to ${email}`
                }
              </p>
            </div>

            {step === 1 ? (
              <form className="space-y-5" onSubmit={handleWorkspaceSubmit}>
                <div>
                  <label htmlFor="workspace" className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                    Workspace Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="workspace"
                      name="workspace"
                      type="text"
                      autoComplete="organization"
                      required
                      value={workspaceName}
                      onChange={(e) => {
                        setWorkspaceName(e.target.value);
                        setWorkspaceError('');
                      }}
                      className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                        workspaceError ? 'border-danger-300 bg-danger-50 dark:bg-danger-950/20' : 'border-gray-300 dark:border-slate-700'
                      }`}
                      placeholder="acme"
                      disabled={loading}
                    />
                  </div>
                  {workspaceError && (
                    <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                      <span className="mr-1">⚠️</span>
                      {workspaceError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !workspaceName}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading && <LoadingSpinner size="sm" className="mr-2" />}
                  {loading ? 'Checking...' : 'Continue'}
                </button>
              </form>
            ) : step === 2 ? (
              <div>
                {!useMagicLink ? (
                  // Password Login Form
                  <form className="space-y-5" onSubmit={handlePasswordLogin}>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                        Email address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
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
                          className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                            emailError ? 'border-danger-300 bg-danger-50 dark:bg-danger-950/20' : 'border-gray-300 dark:border-slate-700'
                          }`}
                          placeholder="you@example.com"
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
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setPasswordError('');
                          }}
                          className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                            passwordError ? 'border-danger-300 bg-danger-50 dark:bg-danger-950/20' : 'border-gray-300 dark:border-slate-700'
                          }`}
                          placeholder="••••••••"
                          disabled={loading}
                        />
                      </div>
                      {passwordError && (
                        <p className="mt-2 text-sm text-danger-600 flex items-start dark:text-danger-400">
                          <span className="mr-1">⚠️</span>
                          {passwordError}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleBackToWorkspace}
                        className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
                        disabled={loading}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !email || !password}
                        className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                      >
                        {loading && <LoadingSpinner size="sm" className="mr-2" />}
                        {loading ? 'Signing in...' : 'Sign in'}
                      </button>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setUseMagicLink(true)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Use magic link instead
                      </button>
                    </div>
                  </form>
                ) : (
                  // Magic Link Form
                  <form className="space-y-5" onSubmit={handleMagicLinkRequest}>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                        Email address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
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
                          className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                            emailError ? 'border-danger-300 bg-danger-50 dark:bg-danger-950/20' : 'border-gray-300 dark:border-slate-700'
                          }`}
                          placeholder="you@example.com"
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

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleBackToWorkspace}
                        className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
                        disabled={loading}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !email}
                        className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                      >
                        {loading && <LoadingSpinner size="sm" className="mr-2" />}
                        {loading ? 'Sending code...' : 'Send code'}
                      </button>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setUseMagicLink(false)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Use password instead
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleCodeSubmit}>
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                    Verification code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyIcon className="h-5 w-5 text-gray-400" />
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
                      className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center tracking-[0.5em] text-xl font-semibold transition-all dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
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
                    onClick={handleBackToEmail}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {loading && <LoadingSpinner size="sm" className="mr-2" />}
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      sendCode(email, workspaceId)
                        .then((result) => {
                          if (result.success) {
                            toast.success('New code sent');
                          } else {
                            toast.error(result.error);
                          }
                        })
                        .finally(() => setLoading(false));
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 transition-colors dark:text-primary-400 dark:hover:text-primary-300"
                    disabled={loading}
                  >
                    Didn't receive the code? <span className="underline">Send again</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
            Don't have a workspace?{' '}
            <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300">
              Create one
            </Link>
          </p>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300">
              Privacy Policy
            </a>
          </p>
        </div>
    </div>
  );
}
