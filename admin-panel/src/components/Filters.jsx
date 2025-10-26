import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSchools } from '../api/client';

export default function Filters({ filters, onChange }) {
  const [timePeriod, setTimePeriod] = useState('today');
  const [showCustom, setShowCustom] = useState(false);
  
  // Fetch schools dynamically
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });
  
  const schools = schoolsData?.schools || [];
  
  const handleTimePeriodChange = (period) => {
    setTimePeriod(period);
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        setShowCustom(false);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = endDate = yesterday.toISOString().split('T')[0];
        setShowCustom(false);
        break;
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        startDate = weekStart.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        setShowCustom(false);
        break;
      case 'this-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        setShowCustom(false);
        break;
      case 'custom':
        setShowCustom(true);
        return; // Don't update filters yet
      default:
        startDate = endDate = today.toISOString().split('T')[0];
    }
    
    onChange({ ...filters, startDate, endDate });
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-3">Filters</h3>
      
      <div className="grid grid-cols-3 gap-4">
        {/* School Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            School
          </label>
          <select 
            value={filters.school}
            onChange={(e) => onChange({ ...filters, school: e.target.value })}
            className="w-full border rounded p-2"
          >
            <option value="all">All Schools</option>
            {schools.map(school => (
              <option key={school.id} value={school.name}>{school.name}</option>
            ))}
          </select>
        </div>
        
        {/* Time Period Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time Period
          </label>
          <select 
            value={timePeriod}
            onChange={(e) => handleTimePeriodChange(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="custom">Custom Range...</option>
          </select>
        </div>
        
        {/* Custom Date Range (conditional) */}
        {showCustom && (
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <div className="flex gap-2">
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                className="border rounded p-2 flex-1"
              />
              <span className="self-center text-gray-500">to</span>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                className="border rounded p-2 flex-1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

