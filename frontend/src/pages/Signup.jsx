import { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { EnvelopeIcon, KeyIcon, ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail, isValidVerificationCode } from '../utils/validators';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Signup() {
  const { login, sendCode, isAuthenticated } = useAuth();
  const location = useLocation();
  const [step, setStep] = useState(1); // 1: email, 2: code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

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
        toast.success('We sent you a verification code');
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
        toast.success('Welcome! You are signed up');
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="w-full px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 transition-colors dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          <span className="font-medium">Back to home</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-600 rounded-2xl p-3 shadow-lg">
                <DocumentTextIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Sign up with your work email. We'll send a verification code.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 dark:bg-slate-900 dark:border dark:border-slate-800">
            {step === 1 ? (
              <form className="space-y-5" onSubmit={handleEmailSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
                    Work email
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
                      className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                        emailError ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'border-gray-300 dark:border-slate-700'
                      }`}
                      placeholder="you@company.com"
                      disabled={loading}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-2 text-sm text-red-600 flex items-start dark:text-red-400">
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
                  {loading ? 'Sending code...' : 'Send code'}
                </button>
              </form>
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
                      className={`appearance-none block w-full px-3 py-3 pl-10 border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center tracking-[0.5em] text-xl font-semibold transition-all dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 ${
                        codeError ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'border-gray-300 dark:border-slate-700'
                      }`}
                      placeholder="000000"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  {codeError && (
                    <p className="mt-2 text-sm text-red-600 flex items-start dark:text-red-400">
                      <span className="mr-1">⚠️</span>
                      {codeError}
                    </p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
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
                    {loading ? 'Verifying...' : 'Create account'}
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
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 transition-colors dark:text-indigo-400 dark:hover:text-indigo-300"
                    disabled={loading}
                  >
                    Didn't receive the code? <span className="underline">Send again</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium dark:text-indigo-400 dark:hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
