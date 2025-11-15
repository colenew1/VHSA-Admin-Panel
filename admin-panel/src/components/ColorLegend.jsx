export default function ColorLegend() {
  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="flex items-center gap-6 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Status Colors:</span>
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
        <div className="flex items-center gap-2 ml-4">
          <div className="w-4 h-4 border-2 border-red-500 rounded"></div>
          <span className="text-sm text-gray-600">Red Border = Failed Test</span>
        </div>
      </div>
    </div>
  );
}

