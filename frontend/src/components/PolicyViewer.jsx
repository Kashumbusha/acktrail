import { useState, useEffect } from 'react';
import { PrinterIcon, DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline';
import PDFModal from './PDFModal';

export default function PolicyViewer({ policy, token, onDocumentViewed }) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [hasViewedDocument, setHasViewedDocument] = useState(false);

  // Track scroll to ensure user has seen the content
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledToBottom(true);
      if (!hasViewedDocument) {
        setHasViewedDocument(true);
        if (onDocumentViewed) {
          onDocumentViewed();
        }
      }
    }
  };

  // Callback when PDF has been viewed
  const handlePDFViewed = () => {
    if (!hasViewedDocument) {
      setHasViewedDocument(true);
      if (onDocumentViewed) {
        onDocumentViewed();
      }
    }
  };

  // Notify parent when document viewing state changes
  useEffect(() => {
    if (hasViewedDocument && onDocumentViewed) {
      onDocumentViewed();
    }
  }, [hasViewedDocument, onDocumentViewed]);

  // Render PDF content
  if (policy.file_url && policy.file_url.endsWith('.pdf')) {
    // Use proxy endpoint to avoid CORS issues with B2
    // Use different endpoint based on whether we have a token (acknowledgment page) or not (admin page)
    let pdfUrl;

    if (token) {
      // For acknowledgment page (magic link token)
      pdfUrl = `/api/ack/${token}/file`;
    } else {
      // For admin page (JWT token in localStorage)
      pdfUrl = `/api/policies/${policy.id}/file`;
      // Add JWT token as query parameter for modal viewer
      const jwtToken = localStorage.getItem('token');
      pdfUrl = jwtToken ? `${pdfUrl}?token=${jwtToken}` : pdfUrl;
    }

    // Extract filename from file_url or use default
    const fileName = policy.file_url.split('/').pop() || `${policy.title}.pdf`;

    return (
      <>
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{policy.title}</h3>
                <div className="mt-1 flex items-center text-sm text-gray-500 space-x-4">
                  <span>Version {policy.version}</span>
                  <span>PDF Document</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100"
                >
                  <PrinterIcon className="h-3 w-3 mr-1" />
                  Print
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* PDF File Display */}
            <div className={`border-2 rounded-lg p-6 ${hasViewedDocument ? 'border-green-200 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {hasViewedDocument ? (
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <EyeIcon className="h-6 w-6 text-green-600" />
                    </div>
                  ) : (
                    <DocumentTextIcon className="h-12 w-12 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setShowPDFModal(true)}
                    className="text-left w-full group"
                  >
                    <p className="text-sm font-medium text-indigo-600 group-hover:text-indigo-800 truncate">
                      {fileName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Click to view document
                    </p>
                  </button>
                  {hasViewedDocument && (
                    <div className="mt-2 inline-flex items-center text-xs font-medium text-green-700">
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Document reviewed
                    </div>
                  )}
                </div>
              </div>

              <div className={`mt-4 text-xs px-3 py-2 rounded border ${
                hasViewedDocument
                  ? 'text-green-700 bg-green-100 border-green-200'
                  : 'text-amber-700 bg-amber-100 border-amber-200 animate-pulse'
              }`}>
                {hasViewedDocument
                  ? '✓ You have reviewed this document. You may now proceed to acknowledge.'
                  : '⚠ START HERE: Please open and review the entire policy document before acknowledging'}
              </div>
            </div>
          </div>
        </div>

        {/* PDF Modal */}
        <PDFModal
          isOpen={showPDFModal}
          onClose={() => setShowPDFModal(false)}
          pdfUrl={pdfUrl}
          fileName={fileName}
          onViewed={handlePDFViewed}
        />
      </>
    );
  }

  // Render markdown/text content
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{policy.title}</h3>
            <div className="mt-1 flex items-center text-sm text-gray-500 space-x-4">
              <span>Version {policy.version}</span>
              <span>Text Document</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              <PrinterIcon className="h-3 w-3 mr-1" />
              Print
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {!hasViewedDocument && policy.body_markdown && (
          <div className="mb-4 text-sm text-amber-700 bg-amber-100 px-4 py-3 rounded border border-amber-200 animate-pulse font-medium">
            ⚠ START HERE: Please scroll to the bottom of the policy to continue
          </div>
        )}

        <div
          className="prose max-w-none text-gray-900 max-h-96 overflow-y-auto border rounded-lg p-4"
          onScroll={handleScroll}
        >
          {policy.body_markdown ? (
            <div
              className="whitespace-pre-wrap leading-relaxed"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {policy.body_markdown}
            </div>
          ) : (
            <div className="text-gray-500 italic text-center py-12">
              No content available for this policy
            </div>
          )}
        </div>

        {policy.body_markdown && (
          <div className={`mt-4 text-xs px-3 py-2 rounded border ${
            hasViewedDocument
              ? 'text-green-700 bg-green-100 border-green-200'
              : 'text-amber-600 bg-amber-50 border-amber-200'
          }`}>
            {hasViewedDocument ? (
              <div className="flex items-center">
                <EyeIcon className="h-4 w-4 mr-2" />
                ✓ You have read the entire policy. You may now proceed to acknowledge.
              </div>
            ) : (
              'Please scroll through and read the entire policy content before acknowledging'
            )}
          </div>
        )}
      </div>
    </div>
  );
}