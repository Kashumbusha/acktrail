import { useNavigate } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/outline';

export default function CheckoutCancelled() {
  const navigate = useNavigate();

  const handleRetry = () => {
    navigate('/signup');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@acktrail.com';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(space.16))] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 dark:bg-slate-900 dark:border dark:border-slate-800">
          <div className="flex justify-center">
            <div className="bg-gray-100 dark:bg-slate-800 rounded-full p-3">
              <XCircleIcon className="h-16 w-16 text-gray-600 dark:text-gray-400" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Checkout Cancelled
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your payment was not completed. No charges were made to your account.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">What happened?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              You closed the payment page before completing your subscription. Your workspace has been created,
              but you'll need to complete payment to start using AckTrail.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all shadow-lg hover:shadow-xl"
            >
              Try Again →
            </button>

            <button
              onClick={handleContactSupport}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              Contact Support
            </button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Need help?</strong> Our team is here to assist you. Reach out if you have any questions about pricing or features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
