import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PrinterIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PolicyViewer({ policy, token }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error) => {
    setError(error.message);
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  // Track scroll to ensure user has seen the content
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledToBottom(true);
    }
  };

  // Render PDF content
  if (policy.file_url && policy.file_url.endsWith('.pdf')) {
    // Use proxy endpoint to avoid CORS issues with B2
    // Use different endpoint based on whether we have a token (acknowledgment page) or not (admin page)
    const pdfUrl = token
      ? `/api/ack/${token}/file`
      : `/api/policies/${policy.id}/file`;

    return (
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
                onClick={() => window.open(pdfUrl, '_blank')}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
              >
                <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1" />
                Open in New Tab
              </button>
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

        <div className="p-4">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-sm text-gray-600">Loading PDF...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">Failed to load PDF</div>
              <div className="text-sm text-gray-500 mb-4">{error}</div>
              <button
                onClick={() => window.open(pdfUrl, '_blank')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                Open PDF in New Tab
              </button>
            </div>
          )}

          {!loading && !error && (
            <div
              className="max-h-96 overflow-y-auto border rounded-lg bg-gray-50"
              onScroll={handleScroll}
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                error={null}
                noData={null}
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="mx-auto"
                  scale={1.0}
                />
              </Document>
            </div>
          )}

          {numPages && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Page {pageNumber} of {numPages}
                </span>
                {numPages > 1 && (
                  <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    Please review all pages before acknowledging
                  </div>
                )}
              </div>

              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
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
        <div 
          className="prose max-w-none text-gray-900 max-h-96 overflow-y-auto"
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
          <div className="mt-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
            Please scroll through and read the entire policy content before acknowledging
          </div>
        )}
      </div>
    </div>
  );
}