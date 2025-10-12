import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Give Stripe webhook time to process (2-3 seconds)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(space.16))] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 dark:bg-slate-900 dark:border dark:border-slate-800">
          {loading ? (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Setting up your subscription...
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please wait while we process your payment
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="bg-success-100 dark:bg-success-900/30 rounded-full p-3">
                  <CheckCircleIcon className="h-16 w-16 text-success-600 dark:text-success-400" />
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to AckTrail!
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Your subscription is now active and your 7-day free trial has begun.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">What's next?</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-primary-600 dark:text-primary-400 mr-2">✓</span>
                    <span>Invite your team members</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 dark:text-primary-400 mr-2">✓</span>
                    <span>Create your first policy</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 dark:text-primary-400 mr-2">✓</span>
                    <span>Send policy assignments to your team</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 dark:text-primary-400 mr-2">✓</span>
                    <span>Track acknowledgments in real-time</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Free Trial:</strong> You won't be charged for 7 days. Cancel anytime during your trial period.
                </p>
              </div>

              <button
                onClick={handleContinue}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all shadow-lg hover:shadow-xl"
              >
                Go to Dashboard →
              </button>

              {sessionId && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Session ID: {sessionId.substring(0, 20)}...
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
