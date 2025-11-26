/**
 * Reusable loading spinner with different sizes and text options
 */
export default function LoadingSpinner({ 
  size = 'md', 
  text = '', 
  fullScreen = false,
  className = '' 
}) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const spinnerSize = sizes[size] || sizes.md;

  const spinner = (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg 
        className={`animate-spin ${spinnerSize} text-blue-500`} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && <span className="text-gray-600 text-sm">{text}</span>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Loading overlay for sections
 */
export function LoadingOverlay({ isLoading, children, text = 'Loading...' }) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for tables
 */
export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-100 h-10 rounded-t-lg mb-1" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 mb-1">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="bg-gray-100 h-8 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

