import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/client';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import SchoolTable from '../components/SchoolTable';
import Filters from '../components/Filters';

export default function Dashboard() {
  const [filters, setFilters] = useState({
    school: 'all',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => getDashboard(filters),
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading dashboard: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="mt-2 text-red-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }
  
  const stats = data?.overall || {};
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="text-sm text-gray-500">
          Last updated: {new Date(data?.lastUpdated || Date.now()).toLocaleTimeString()}
        </div>
      </div>
      
      <Filters filters={filters} onChange={setFilters} />
      
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          title="Total Students" 
          value={stats.totalStudents || 0}
          color="blue"
        />
        <StatCard 
          title="Completed" 
          value={stats.completed || 0}
          color="green"
        />
        <StatCard 
          title="Incomplete" 
          value={stats.incomplete || 0}
          color="orange"
        />
        <StatCard 
          title="Absent" 
          value={stats.absent || 0}
          color="gray"
        />
      </div>
      
      <ProgressBar 
        completed={stats.completed || 0}
        incomplete={stats.incomplete || 0}
        absent={stats.absent || 0}
        total={stats.totalStudents || 0}
      />
      
      <SchoolTable schools={data?.bySchool || []} />
    </div>
  );
}

