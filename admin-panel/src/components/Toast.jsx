import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Toast Context
const ToastContext = createContext(null);

// Toast types with icons and colors
const toastConfig = {
  success: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  error: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  info: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
};

// Single Toast Component
function ToastItem({ id, type, message, onDismiss }) {
  const config = toastConfig[type] || toastConfig.info;
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 200);
  }, [id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, 4000);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm
        ${config.bg} ${config.border}
        transform transition-all duration-200 ease-out
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      <div className={`flex-shrink-0 p-1 rounded-full ${config.iconBg} ${config.iconColor}`}>
        {config.icon}
      </div>
      <p className={`flex-1 text-sm font-medium ${config.text}`}>{message}</p>
      <button
        onClick={handleDismiss}
        className={`flex-shrink-0 p-1 rounded hover:bg-gray-100 ${config.text} opacity-60 hover:opacity-100`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Toast Container
function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          {...toast}
          onDismiss={removeToast}
        />
      ))}
    </div>,
    document.body
  );
}

// Toast Provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message) => addToast('success', message),
    error: (message) => addToast('error', message),
    warning: (message) => addToast('warning', message),
    info: (message) => addToast('info', message),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;

