import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PDFModal({ isOpen, onClose, pdfUrl, fileName, onViewed, requireScrollTracking = false }) {
  const [viewingTime, setViewingTime] = useState(0);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewedPages, setViewedPages] = useState(new Set([1])); // Track which pages have been viewed
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canConfirmViewed, setCanConfirmViewed] = useState(false); // For iframe viewers: enable confirm button after minimum time
  const LOADING_TIMEOUT = 5000; // 5 second timeout for PDF loading
  const IFRAME_MIN_VIEWING_TIME = 5; // 5 seconds minimum for iframe-based viewers before they can confirm

  // Detect Safari browser
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Track page changes
  useEffect(() => {
    if (currentPage) {
      setViewedPages(prev => new Set([...prev, currentPage]));
    }
  }, [currentPage]);

  // Check if document has been fully viewed
  const checkIfFullyViewed = () => {
    if (requireScrollTracking && numPages) {
      // For recipients with react-pdf viewer: must view all pages (no timer!)
      if (!pdfLoadError && !isSafari) {
        return viewedPages.size >= numPages;
      }
      // For iframe viewers: NO automatic marking - user must click confirm button
      // We just enable the confirm button after minimum viewing time
      if (viewingTime >= IFRAME_MIN_VIEWING_TIME && !canConfirmViewed) {
        setCanConfirmViewed(true);
      }
    }
    return false;
  };

  // Track viewing time (only if scroll tracking is required)
  useEffect(() => {
    if (!isOpen || !requireScrollTracking) return;

    const interval = setInterval(() => {
      setViewingTime(prev => {
        const newTime = prev + 1;
        const fullyViewed = checkIfFullyViewed();
        if (fullyViewed && !hasBeenViewed) {
          setHasBeenViewed(true);
          if (onViewed) {
            onViewed();
          }
        }
        return newTime;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, hasBeenViewed, onViewed, viewingTime, viewedPages, numPages, requireScrollTracking]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setViewingTime(0);
      setCurrentPage(1);
      setViewedPages(new Set([1]));
      setPdfLoadError(false);
      setIsLoading(true);
      setCanConfirmViewed(false);
    }
  }, [isOpen]);

  // Add timeout for PDF loading - fallback to iframe if taking too long
  useEffect(() => {
    if (!isOpen || !isLoading) return;

    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('PDF loading timeout - falling back to iframe viewer');
        setPdfLoadError(true);
        setIsLoading(false);
      }
    }, LOADING_TIMEOUT);

    return () => clearTimeout(timeout);
  }, [isOpen, isLoading]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfLoadError(false);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setPdfLoadError(true);
    setIsLoading(false);
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(numPages || prev, prev + 1));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                      {fileName || 'Document Preview'}
                    </Dialog.Title>
                    {hasBeenViewed && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Reviewed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!hasBeenViewed && requireScrollTracking && (
                      <div className="text-sm text-amber-600 mr-2">
                        {!pdfLoadError && !isSafari && numPages ? (
                          // For react-pdf viewer: only show page requirement
                          <>View all {numPages} pages ({viewedPages.size}/{numPages})</>
                        ) : (
                          // For iframe viewers: show message about reviewing
                          <>Please review entire document</>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* PDF Viewer */}
                <div className="relative bg-gray-100" style={{ height: '75vh' }}>
                  {pdfLoadError || isSafari ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full border-0"
                      title="PDF Viewer"
                      onLoad={() => {
                        setIsLoading(false);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full overflow-auto p-4">
                      <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <span className="ml-3 text-sm text-gray-600">Loading PDF...</span>
                          </div>
                        }
                      >
                        <Page
                          pageNumber={currentPage}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="shadow-lg"
                          width={Math.min(window.innerWidth * 0.7, 800)}
                        />
                      </Document>
                    </div>
                  )}
                </div>

                {/* Page Navigation */}
                {numPages && numPages > 1 && !pdfLoadError && !isSafari && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage <= 1}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="h-4 w-4 mr-1" />
                      Previous
                    </button>

                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-700">
                        Page {currentPage} of {numPages}
                      </span>
                      {requireScrollTracking && (
                        <span className="text-xs text-gray-500 mt-1">
                          {viewedPages.size === numPages ? '✓ All pages viewed' : `Viewed: ${viewedPages.size}/${numPages} pages`}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage >= numPages}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                )}

                {/* Confirmation Button for Iframe Viewers */}
                {requireScrollTracking && (pdfLoadError || isSafari) && !hasBeenViewed && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-amber-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900">
                          {canConfirmViewed
                            ? '✓ Minimum viewing time met. Click below to confirm you have reviewed the entire document.'
                            : `⏱ Please review the entire document (${Math.max(0, IFRAME_MIN_VIEWING_TIME - viewingTime)}s remaining)`
                          }
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          You must scroll through and review all pages of the document before confirming.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setHasBeenViewed(true);
                          if (onViewed) onViewed();
                        }}
                        disabled={!canConfirmViewed}
                        className="ml-4 inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        I Have Reviewed This Document
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
