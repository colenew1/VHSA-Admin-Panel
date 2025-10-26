export default function SchoolTable({ schools }) {
  if (!schools || schools.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500 text-center">No school data available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">By School</h3>
      </div>
      
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-4 font-medium text-gray-700">School</th>
            <th className="text-center p-4 font-medium text-gray-700">Total</th>
            <th className="text-center p-4 font-medium text-gray-700">Complete</th>
            <th className="text-center p-4 font-medium text-gray-700">Incomplete</th>
            <th className="text-center p-4 font-medium text-gray-700">Absent</th>
            <th className="text-center p-4 font-medium text-gray-700">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {schools.map((school) => (
            <tr key={school.school} className="hover:bg-gray-50">
              <td className="p-4 font-medium">{school.school}</td>
              <td className="text-center p-4">{school.total}</td>
              <td className="text-center p-4 text-green-600 font-semibold">
                {school.completed}
              </td>
              <td className="text-center p-4 text-orange-600 font-semibold">
                {school.incomplete}
              </td>
              <td className="text-center p-4 text-gray-600">{school.absent}</td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${school.completionRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {school.completionRate}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

