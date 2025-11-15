import { useState } from 'react';

export default function AdvancedFilters({ filters, onChange, onClear }) {
  const [isOpen, setIsOpen] = useState(false);

  const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const genders = ['M', 'F', 'Other'];

  const handleGradeToggle = (grade) => {
    const currentGrades = filters.grade ? filters.grade.split(',') : [];
    const newGrades = currentGrades.includes(grade)
      ? currentGrades.filter(g => g !== grade)
      : [...currentGrades, grade];
    onChange({ ...filters, grade: newGrades.join(',') || undefined });
  };

  const handleGenderToggle = (gender) => {
    const currentGenders = filters.gender ? filters.gender.split(',') : [];
    const newGenders = currentGenders.includes(gender)
      ? currentGenders.filter(g => g !== gender)
      : [...currentGenders, gender];
    onChange({ ...filters, gender: newGenders.join(',') || undefined });
  };

  const handleStatusChange = (status) => {
    onChange({ ...filters, status: status === 'all' ? undefined : status });
  };

  const handleReturningChange = (returning) => {
    onChange({ ...filters, returning: returning === 'all' ? undefined : returning });
  };

  const handleClear = () => {
    const cleared = { ...filters };
    delete cleared.grade;
    delete cleared.gender;
    delete cleared.status;
    delete cleared.returning;
    // Reset status checkboxes to all true
    cleared.statusNotStarted = true;
    cleared.statusCompleted = true;
    cleared.statusIncomplete = true;
    cleared.statusFailed = true;
    cleared.statusAbsent = true;
    onChange(cleared);
    if (onClear) onClear();
  };

  const hasActiveFilters = filters.grade || filters.gender || filters.status || filters.returning ||
    filters.statusNotStarted === false || filters.statusCompleted === false ||
    filters.statusIncomplete === false || filters.statusFailed === false ||
    filters.statusAbsent === false;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
        style={{ height: '38px' }}
      >
        Advanced
        {hasActiveFilters && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
            Active
          </span>
        )}
        <svg
          className={`ml-2 w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Grade Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
              <div className="flex flex-wrap gap-2">
                {grades.map((grade) => {
                  const isSelected = filters.grade?.split(',').includes(grade);
                  return (
                    <button
                      key={grade}
                      onClick={() => handleGradeToggle(grade)}
                      className={`px-3 py-1 text-sm rounded ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {grade}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <div className="flex flex-wrap gap-2">
                {genders.map((gender) => {
                  const isSelected = filters.gender?.split(',').includes(gender);
                  return (
                    <button
                      key={gender}
                      onClick={() => handleGenderToggle(gender)}
                      className={`px-3 py-1 text-sm rounded ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {gender}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status/Color Filter - Bubbles */}
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status/Color</label>
              <div className="flex flex-wrap gap-2">
                {/* Not Started */}
                <button
                  onClick={() => onChange({ ...filters, statusNotStarted: !filters.statusNotStarted })}
                  className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                    filters.statusNotStarted
                      ? 'bg-white border-gray-400 shadow-md ring-2 ring-gray-300'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-white border border-gray-300 rounded-full"></span>
                    <span>Not Started</span>
                  </span>
                </button>
                
                {/* Completed */}
                <button
                  onClick={() => onChange({ ...filters, statusCompleted: !filters.statusCompleted })}
                  className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                    filters.statusCompleted
                      ? 'bg-green-50 border-green-400 shadow-md ring-2 ring-green-300'
                      : 'bg-green-50 border-green-300 hover:border-green-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-50 border border-green-200 rounded-full"></span>
                    <span>Completed</span>
                  </span>
                </button>
                
                {/* Incomplete */}
                <button
                  onClick={() => onChange({ ...filters, statusIncomplete: !filters.statusIncomplete })}
                  className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                    filters.statusIncomplete
                      ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-300'
                      : 'bg-amber-50 border-amber-300 hover:border-amber-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-amber-50 border border-amber-200 rounded-full"></span>
                    <span>Incomplete</span>
                  </span>
                </button>
                
                {/* Failed */}
                <button
                  onClick={() => onChange({ ...filters, statusFailed: !filters.statusFailed })}
                  className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                    filters.statusFailed
                      ? 'bg-red-50 border-red-400 shadow-md ring-2 ring-red-300'
                      : 'bg-red-50 border-red-300 hover:border-red-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-50 border border-red-200 rounded-full"></span>
                    <span>Failed</span>
                  </span>
                </button>
                
                {/* Absent */}
                <button
                  onClick={() => onChange({ ...filters, statusAbsent: !filters.statusAbsent })}
                  className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                    filters.statusAbsent
                      ? 'bg-blue-100 border-blue-400 shadow-md ring-2 ring-blue-300'
                      : 'bg-blue-100 border-blue-300 hover:border-blue-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full"></span>
                    <span>Absent</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Returning Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Returning?</label>
              <select
                value={filters.returning || 'all'}
                onChange={(e) => handleReturningChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

