import { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { EnvelopeIcon, KeyIcon, ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail, isValidVerificationCode } from '../utils/validators';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, sendCode, isAuthenticated } = useAuth();
  const location = useLocation();
  const [step, setStep] = useState(1); // 1: email, 2: code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setEmailError('');

    try {
      const result = await sendCode(email);
      if (result.success) {
        setStep(2);
        toast.success('Verification code sent to your email');
      } else {
        setEmailError(result.error);
      }
    } catch (error) {
      setEmailError('Failed to send verification code');
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
      const result = await login(email, code);
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
    setStep(1);
    setCode('');
    setCodeError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <div className="w-full px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          <span className="font-medium">Back to home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo/Branding */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-600 rounded-2xl p-3 shadow-lg">
                <DocumentTextIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Policy Acknowledgment Tracker
            </h1>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                {step === 1 ? 'Sign in' : 'Verify your email'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {step === 1
                  ? 'Enter your email address to receive a verification code'
                  : `We sent a 6-digit code to`
                }
              </p>
              {step === 2 && (
                <p className="text-sm font-medium text-indigo-600">{email}</p>
              )}
            </div>

            {step === 1 ? (
              <form className="space-y-5" onSubmit={handleEmailSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
                      className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="you@example.com"
                      disabled={loading}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-2 text-sm text-red-600 flex items-start">
                      <span className="mr-1">⚠️</span>
                      {emailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading && <LoadingSpinner size="sm" className="mr-2" />}
                  {loading ? 'Sending code...' : 'Continue'}
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleCodeSubmit}>
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
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
                        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                        setCode(value);
                        setCodeError('');
                      }}
                      className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center tracking-[0.5em] text-xl font-semibold transition-all ${
                        codeError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="000000"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  {codeError && (
                    <p className="mt-2 text-sm text-red-600 flex items-start">
                      <span className="mr-1">⚠️</span>
                      {codeError}
                    </p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
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
                      sendCode(email)
                        .then((result) => {
                          if (result.success) {
                            toast.success('New code sent');
                          } else {
                            toast.error(result.error);
                          }
                        })
                        .finally(() => setLoading(false));
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 transition-colors"
                    disabled={loading}
                  >
                    Didn't receive the code? <span className="underline">Send again</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-600">
            By continuing, you agree to our{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
