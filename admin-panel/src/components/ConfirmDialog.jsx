import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable confirmation dialog component using React Portal
 * Prevents layout shifts by rendering outside the normal DOM hierarchy
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-blue-500 hover:bg-blue-600',
  isLoading = false
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        style={{ position: 'relative', zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 ${confirmButtonClass}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

