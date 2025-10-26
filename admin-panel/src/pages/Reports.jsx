import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { exportStateReport, exportStickers, getSchools } from '../api/client';

export default function Reports() {
  const [exporting, setExporting] = useState(false);
  const [stateSchool, setStateSchool] = useState('');
  const [stickerSchool, setStickerSchool] = useState('');
  
  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });
  
  const schools = schoolsData?.schools || [];
  
  const handleStateExport = async () => {
    if (!stateSchool || stateSchool === 'all') {
      alert('Please select a specific school for state report');
      return;
    }
    
    setExporting(true);
    try {
      const blob = await exportStateReport({ 
        school: stateSchool, 
        year: new Date().getFullYear() 
      });
      
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `state-report-${stateSchool}-${new Date().getFullYear()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Error exporting state report: ' + error.message);
    } finally {
      setExporting(false);
    }
  };
  
  const handleStickerExport = async () => {
    if (!stickerSchool || stickerSchool === 'all') {
      alert('Please select a specific school for stickers');
      return;
    }
    
    setExporting(true);
    try {
      const blob = await exportStickers({ school: stickerSchool });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stickers-${stickerSchool}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Error exporting stickers: ' + error.message);
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports & Exports</h2>
      
      <div className="grid grid-cols-2 gap-6">
        {/* State Report Export */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">State Report Export</h3>
          <p className="text-sm text-gray-600 mb-4">
            Export completed screening data formatted for state reporting requirements.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select School
              </label>
              <select 
                value={stateSchool}
                onChange={(e) => setStateSchool(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="">Select a school...</option>
                {schools.map(school => (
                  <option key={school.id} value={school.name}>{school.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleStateExport}
              disabled={exporting || !stateSchool}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Download State Report CSV'}
            </button>
          </div>
        </div>
        
        {/* Sticker Label Export */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Sticker Labels</h3>
          <p className="text-sm text-gray-600 mb-4">
            Export student labels for Avery sticker printing with required test codes.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select School
              </label>
              <select 
                value={stickerSchool}
                onChange={(e) => setStickerSchool(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="">Select a school...</option>
                {schools.map(school => (
                  <option key={school.id} value={school.name}>{school.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleStickerExport}
              disabled={exporting || !stickerSchool}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Download Sticker Labels CSV'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Export Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>State Report:</strong> Send this CSV to the school for state compliance reporting</li>
          <li><strong>Sticker Labels:</strong> Import this CSV into Avery Design & Print software to print student labels</li>
          <li>All exports are filtered by school - select one school per export</li>
          <li>Exports only include completed screenings (not absent students)</li>
        </ul>
      </div>
    </div>
  );
}

