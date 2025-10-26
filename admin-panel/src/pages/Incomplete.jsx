import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIncompleteStudents, getSchools } from '../api/client';

export default function Incomplete() {
  const [school, setSchool] = useState('all');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['incomplete', school],
    queryFn: () => getIncompleteStudents({ school }),
  });
  
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });
  
  const schools = schoolsData?.schools || [];
  const students = data?.students || [];
  
  if (isLoading) {
    return <div className="text-center py-8">Loading incomplete students...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        Error: {error.message}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Incomplete Students</h2>
        <div className="text-sm text-gray-600">
          {students.length} student{students.length !== 1 ? 's' : ''} need attention
        </div>
      </div>
      
      {/* School Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by School
        </label>
        <select 
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          className="border rounded p-2"
        >
          <option value="all">All Schools</option>
          {schools.map(s => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
      
      {/* Student List */}
      {students.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
          No incomplete students found
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium">Student ID</th>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Grade</th>
                <th className="text-left p-4 font-medium">School</th>
                <th className="text-center p-4 font-medium">Vision</th>
                <th className="text-center p-4 font-medium">Hearing</th>
                <th className="text-center p-4 font-medium">Acanthosis</th>
                <th className="text-center p-4 font-medium">Scoliosis</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student) => (
                <tr key={student.student_id} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm">{student.student_id}</td>
                  <td className="p-4">{student.first_name} {student.last_name}</td>
                  <td className="p-4">{student.grade}</td>
                  <td className="p-4 text-sm text-gray-600">{student.school}</td>
                  <td className="text-center p-4">
                    <span className={getStatusBadge(student.vision_status)} />
                  </td>
                  <td className="text-center p-4">
                    <span className={getStatusBadge(student.hearing_status)} />
                  </td>
                  <td className="text-center p-4">
                    <span className={getStatusBadge(student.acanthosis_status)} />
                  </td>
                  <td className="text-center p-4">
                    <span className={getStatusBadge(student.scoliosis_status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getStatusBadge(status) {
  if (status?.includes('✅')) {
    return 'inline-block w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600';
  }
  if (status?.includes('❌')) {
    return 'inline-block w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600';
  }
  return 'inline-block w-6 h-6 bg-gray-100 rounded-full';
}

