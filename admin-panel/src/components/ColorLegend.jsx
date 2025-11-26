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
          Status Colors
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
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
              <span className="text-sm text-gray-600">Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span className="text-sm text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded"></div>
              <span className="text-sm text-gray-600">Incomplete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-sm text-gray-600">Absent</span>
            </div>
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
              <div className="w-4 h-4 border-2 border-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Red Border = Failed Test</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
