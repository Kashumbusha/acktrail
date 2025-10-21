import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent running multiple times
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        // Handle SSO errors
        const errorMessages = {
          invalid_state: 'Invalid authentication state. Please try again.',
          sso_not_configured: 'SSO is not configured for your workspace.',
          sso_config_error: 'SSO configuration error. Please contact your administrator.',
          token_exchange_failed: 'Failed to authenticate with Microsoft. Please try again.',
          oauth_failed: 'Microsoft authentication failed. Please try again.',
          no_token: 'No authentication token received. Please try again.',
          graph_api_failed: 'Failed to retrieve user information. Please try again.',
          no_email: 'No email found in your Microsoft account. Please contact your administrator.',
          user_not_found: 'User not found. Please contact your administrator to be added to the workspace.',
          access_denied: 'Access denied. Your account may be disabled.',
        };

        const errorMessage = errorMessages[error] || 'Authentication failed. Please try again.';
        navigate('/login', { state: { error: errorMessage } });
        return;
      }

      if (token) {
        // Store token and redirect to dashboard
        try {
          const result = await loginWithToken(token);
          if (result.success) {
            navigate('/dashboard');
          } else {
            navigate('/login', { state: { error: result.error || 'Failed to complete sign-in.' } });
          }
        } catch (err) {
          console.error('Failed to process SSO login:', err);
          navigate('/login', { state: { error: 'Failed to complete sign-in. Please try again.' } });
        }
      } else {
        // No token or error - redirect to login
        navigate('/login');
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Completing sign-in...</p>
      </div>
    </div>
  );
}
