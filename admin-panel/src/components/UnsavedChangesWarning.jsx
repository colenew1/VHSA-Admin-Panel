import { useEffect } from 'react';
import { useBeforeUnload } from 'react-router-dom';

/**
 * Warns users before leaving the page with unsaved changes
 * Uses both browser beforeunload and React Router navigation blocking
 */
export default function UnsavedChangesWarning({ hasUnsavedChanges, message = 'You have unsaved changes. Are you sure you want to leave?' }) {
  // Browser beforeunload event (handles refresh, close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message]);

  // React Router navigation blocking
  useBeforeUnload(
    (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
      }
    },
    { capture: true }
  );

  return null;
}

