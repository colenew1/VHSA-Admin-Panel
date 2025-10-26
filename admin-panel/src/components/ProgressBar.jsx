export default function ProgressBar({ completed, incomplete, absent, total }) {
  const completedPct = total > 0 ? (completed / total) * 100 : 0;
  const incompletePct = total > 0 ? (incomplete / total) * 100 : 0;
  const absentPct = total > 0 ? (absent / total) * 100 : 0;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Overall Progress</h3>
      
      <div className="relative h-12 bg-gray-200 rounded-lg overflow-hidden">
        {completed > 0 && (
          <div 
            className="absolute h-full bg-green-500 flex items-center justify-center text-white font-semibold"
            style={{ width: `${completedPct}%` }}
          >
            {completed > 0 && `${completed} Complete`}
          </div>
        )}
        {incomplete > 0 && (
          <div 
            className="absolute h-full bg-orange-400 flex items-center justify-center text-white font-semibold"
            style={{ left: `${completedPct}%`, width: `${incompletePct}%` }}
          >
            {incomplete > 0 && `${incomplete} Incomplete`}
          </div>
        )}
        {absent > 0 && (
          <div 
            className="absolute h-full bg-gray-400 flex items-center justify-center text-white text-sm font-semibold"
            style={{ left: `${completedPct + incompletePct}%`, width: `${absentPct}%` }}
          >
            {absent > 0 && `${absent} Absent`}
          </div>
        )}
      </div>
      
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
          <span>Complete ({completedPct.toFixed(0)}%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-400 rounded mr-2"></div>
          <span>Incomplete ({incompletePct.toFixed(0)}%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-400 rounded mr-2"></div>
          <span>Absent ({absentPct.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}

