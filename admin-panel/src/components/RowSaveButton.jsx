import { useState } from 'react';

export default function RowSaveButton({ onSave, isSaving = false }) {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = async () => {
    try {
      await onSave();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      // Error handling is done by parent
      console.error('Save error:', error);
    }
  };

  if (showSuccess) {
    return (
      <div className="px-3 py-1 text-green-600 text-sm flex items-center">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Saved
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isSaving}
      className={`px-3 py-1 text-sm rounded ${
        isSaving
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
    >
      {isSaving ? 'Saving...' : 'Save'}
    </button>
  );
}

