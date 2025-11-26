import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable success dialog component using React Portal
 */
export default function SuccessDialog({
  isOpen,
  title = 'Success!',
  message,
  children,
  onClose,
  closeText = 'OK'
}) {
  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        style={{ position: 'relative', zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
          {title}
        </h3>
        {message && (
          <p className="text-gray-700 text-center mb-4">{message}</p>
        )}
        {children && (
          <div className="mb-4">{children}</div>
        )}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
          >
            {closeText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

