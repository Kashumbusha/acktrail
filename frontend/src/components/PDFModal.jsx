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
  const MINIMUM_VIEWING_TIME = 10; // 10 seconds minimum

  // Track page changes
  useEffect(() => {
    if (currentPage) {
      setViewedPages(prev => new Set([...prev, currentPage]));
    }
  }, [currentPage]);

  // Check if document has been fully viewed
  const checkIfFullyViewed = () => {
    if (requireScrollTracking && numPages) {
      // For recipients: must view all pages AND meet minimum time
      const allPagesViewed = viewedPages.size >= numPages;
      const timeRequirementMet = viewingTime >= MINIMUM_VIEWING_TIME;
      return allPagesViewed && timeRequirementMet;
    } else {
      // For non-recipients or time-only: just need minimum time
      return viewingTime >= MINIMUM_VIEWING_TIME;
    }
  };

  // Track viewing time
  useEffect(() => {
    if (!isOpen) return;

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
    }
  }, [isOpen]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfLoadError(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setPdfLoadError(true);
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
                    {!hasBeenViewed && requireScrollTracking && numPages && (
                      <div className="text-sm text-amber-600 mr-2">
                        View all {numPages} pages ({viewedPages.size}/{numPages}) & wait {Math.max(0, MINIMUM_VIEWING_TIME - viewingTime)}s
                      </div>
                    )}
                    {!hasBeenViewed && !requireScrollTracking && (
                      <div className="text-sm text-amber-600 mr-2">
                        Please review for {Math.max(0, MINIMUM_VIEWING_TIME - viewingTime)} more seconds
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
                  {pdfLoadError ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-600 mb-4">Unable to display PDF in viewer</p>
                      <iframe
                        src={pdfUrl}
                        className="w-full h-full border-0"
                        title="PDF Viewer Fallback"
                      />
                    </div>
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
                {numPages && numPages > 1 && !pdfLoadError && (
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
