import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircleIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatDateTime } from '../utils/formatters';
import toast from 'react-hot-toast';
import { ackAPI } from '../api/client';

export default function SuccessPage() {
  const location = useLocation();
  const { policyTitle, submittedAt, assignmentId } = location.state || {};
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  const downloadReceipt = async () => {
    if (!assignmentId) {
      toast.error('Unable to download receipt - assignment ID not found');
      return;
    }

    setDownloadingReceipt(true);
    try {
      const response = await ackAPI.downloadReceipt(assignmentId);

      if (response.status !== 200) {
        throw new Error('Failed to download receipt');
      }

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `acknowledgment_receipt_${assignmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const closeWindow = () => {
    // Try to close the window
    try {
      window.close();

      // If we're still here after 100ms, the browser blocked window.close()
      setTimeout(() => {
        // Try to go back in browser history as alternative
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // As last resort, navigate to a blank page
          window.location.href = 'about:blank';
        }
      }, 100);
    } catch (error) {
      // Fallback: try to navigate back
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'about:blank';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Acknowledgment Submitted
          </h2>
          
          <p className="mt-2 text-sm text-gray-600">
            Thank you for acknowledging the policy. Your submission has been recorded successfully.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Submission Details
          </h3>
          
          <dl className="space-y-3">
            {policyTitle && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Policy</dt>
                <dd className="text-sm text-gray-900">{policyTitle}</dd>
              </div>
            )}
            
            {submittedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
                <dd className="text-sm text-gray-900">
                  {formatDateTime(submittedAt)}
                </dd>
              </div>
            )}
            
            {assignmentId && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Assignment ID</dt>
                <dd className="text-sm text-gray-900 font-mono">{assignmentId}</dd>
              </div>
            )}
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="text-sm text-green-600 font-medium">Acknowledged</dd>
            </div>
          </dl>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {assignmentId && (
            <button
              onClick={downloadReceipt}
              disabled={downloadingReceipt}
              className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingReceipt ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Download Receipt (PDF)
                </>
              )}
            </button>
          )}

          <button
            onClick={closeWindow}
            className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Close Window
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Important Information
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Your acknowledgment has been securely recorded with timestamp and IP address</li>
                  <li>A digital receipt is available for download above</li>
                  <li>You may receive a confirmation email shortly</li>
                  <li>Save or screenshot this page for your records</li>
                  <li>Contact your administrator if you have any questions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            You can safely close this page. Thank you for your compliance.
          </p>
        </div>
      </div>
    </div>
  );
}