import { useState } from 'react';
import { getPreference, setPreference } from '../utils/userPreferences';

export default function ColorLegend() {
  const [isExpanded, setIsExpanded] = useState(() => 
    getPreference('dashboard.showColorLegend', true)
  );

  const toggleExpanded = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    setPreference('dashboard.showColorLegend', newValue);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden">
      <button 
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Status Legend
        </span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Row Background Colors */}
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Row Colors:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
              <span className="text-sm text-gray-600">Not Started</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span className="text-sm text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded"></div>
              <span className="text-sm text-gray-600">Incomplete</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-sm text-gray-600">Absent</span>
            </div>
            
            {/* Separator */}
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            
            {/* Special Indicators */}
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Indicators:</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                FAIL
              </span>
              <span className="text-sm text-gray-600">Failed Test</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                RS
              </span>
              <span className="text-sm text-gray-600">Needs Rescreen</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
