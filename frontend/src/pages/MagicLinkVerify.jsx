import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI, paymentsAPI } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import { DocumentTextIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function MagicLinkVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const workspaceId = searchParams.get('workspace_id');

    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token');
      return;
    }

    if (!workspaceId) {
      setStatus('error');
      setMessage('Workspace ID is required');
      return;
    }

    // Verify the magic link token
    authAPI.verifyMagicLink(token, workspaceId)
      .then(async (response) => {
        const { access_token, user } = response.data;

        // Store token and user data
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));

        setStatus('success');
        setMessage('Successfully authenticated! Redirecting...');

        // Check if user needs to complete checkout
        const hasStripeCustomer = user.stripe_customer_id;
        const pendingCheckoutStr = localStorage.getItem('pendingCheckout');

        if (!hasStripeCustomer && pendingCheckoutStr) {
          // New signup - redirect to checkout
          try {
            const pendingCheckout = JSON.parse(pendingCheckoutStr);

            // Verify this is for the same workspace
            if (pendingCheckout.workspaceId === workspaceId) {
              // Create checkout session
              const checkoutResponse = await paymentsAPI.createCheckoutSession(
                pendingCheckout.plan,
                pendingCheckout.staffCount,
                pendingCheckout.billingInterval,
                pendingCheckout.ssoEnabled
              );

              if (checkoutResponse.data?.url) {
                // Clear pending checkout
                localStorage.removeItem('pendingCheckout');
                // Redirect to Stripe Checkout
                setTimeout(() => {
                  window.location.href = checkoutResponse.data.url;
                }, 1000);
                return;
              }
            }
          } catch (error) {
            console.error('Failed to create checkout session:', error);
            toast.error('Failed to create checkout session');
          }
        }

        // Normal login flow - redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.response?.data?.detail || 'Failed to verify magic link. It may have expired.');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-md w-full">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-600 rounded-2xl p-3 shadow-lg">
              <DocumentTextIcon className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Policy Acknowledgment Tracker
          </h1>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 dark:bg-slate-900 dark:border dark:border-slate-800">
          <div className="text-center">
            {status === 'verifying' && (
              <>
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  Verifying...
                </h2>
                <p className="mt-2 text-gray-600 dark:text-slate-400">
                  Please wait while we verify your link
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  Success!
                </h2>
                <p className="mt-2 text-gray-600 dark:text-slate-400">
                  {message}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                  Verification Failed
                </h2>
                <p className="mt-2 text-gray-600 dark:text-slate-400">
                  {message}
                </p>
                <div className="mt-6">
                  <Link
                    to="/login"
                    className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Go to Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
