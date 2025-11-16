import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchools, createSchool, updateSchool, deleteSchool, getScreeners, createScreener, updateScreener, deleteScreener } from '../api/client';
import api from '../api/client';

export default function Advanced() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('schools');
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState(null); // 'schools' or 'screeners'
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', active: true });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Fetch schools (all, not just active)
  const { data: schoolsData, isLoading: loadingSchools } = useQuery({
    queryKey: ['schools', 'all'],
    queryFn: async () => {
      // Get both active and inactive schools
      const [activeData, inactiveData] = await Promise.all([
        api.get('/schools', { params: { active: 'true' } }).then(res => res.data),
        api.get('/schools', { params: { active: 'false' } }).then(res => res.data),
      ]);
      return { schools: [...(activeData?.schools || []), ...(inactiveData?.schools || [])] };
    },
  });

  // Fetch screeners (all, not just active)
  const { data: screenersData, isLoading: loadingScreeners } = useQuery({
    queryKey: ['screeners'],
    queryFn: () => getScreeners(),
  });

  const schools = schoolsData?.schools || [];
  const screeners = screenersData?.screeners || [];

  // Create mutations
  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      queryClient.invalidateQueries(['schools']);
      queryClient.invalidateQueries(['schools', 'all']);
      setShowAddForm(false);
      setNewItem({ name: '', active: true });
    },
  });

  const createScreenerMutation = useMutation({
    mutationFn: createScreener,
    onSuccess: () => {
      queryClient.invalidateQueries(['screeners']);
      setShowAddForm(false);
      setNewItem({ name: '', active: true });
    },
  });

  // Update mutations
  const updateSchoolMutation = useMutation({
    mutationFn: ({ id, data }) => updateSchool(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['schools']);
      queryClient.invalidateQueries(['schools', 'all']);
      setEditingId(null);
      setEditingType(null);
      setUnsavedChanges({});
    },
  });

  const updateScreenerMutation = useMutation({
    mutationFn: ({ id, data }) => updateScreener(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['screeners']);
      setEditingId(null);
      setEditingType(null);
      setUnsavedChanges({});
    },
  });

  // Delete mutations
  const deleteSchoolMutation = useMutation({
    mutationFn: deleteSchool,
    onSuccess: () => {
      queryClient.invalidateQueries(['schools']);
      queryClient.invalidateQueries(['schools', 'all']);
      setEditingId(null);
      setEditingType(null);
    },
  });

  const deleteScreenerMutation = useMutation({
    mutationFn: deleteScreener,
    onSuccess: () => {
      queryClient.invalidateQueries(['screeners']);
      setEditingId(null);
      setEditingType(null);
    },
  });

  // Handle edit click
  const handleEditClick = (id, type) => {
    setEditingId(id);
    setEditingType(type);
    setUnsavedChanges({});
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingType(null);
    setUnsavedChanges({});
  };

  // Handle cell change
  const handleCellChange = (id, field, value) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  // Handle save
  const handleSave = (id, type) => {
    const changes = unsavedChanges[id] || {};
    const item = type === 'schools' 
      ? schools.find(s => s.id === id)
      : screeners.find(s => s.id === id);
    
    if (!item) return;

    const updateData = {
      name: changes.name !== undefined ? changes.name : item.name,
      active: changes.active !== undefined ? changes.active : item.active,
    };

    setConfirmMessage(`Are you sure you want to update this ${type === 'schools' ? 'school' : 'screener'}?`);
    setConfirmAction(() => () => {
      if (type === 'schools') {
        updateSchoolMutation.mutate({ id, data: updateData });
      } else {
        updateScreenerMutation.mutate({ id, data: updateData });
      }
      setShowConfirmDialog(false);
    });
    setShowConfirmDialog(true);
  };

  // Handle delete
  const handleDelete = (id, type) => {
    const item = type === 'schools' 
      ? schools.find(s => s.id === id)
      : screeners.find(s => s.id === id);
    
    if (!item) return;

    setConfirmMessage(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`);
    setConfirmAction(() => () => {
      if (type === 'schools') {
        deleteSchoolMutation.mutate(id);
      } else {
        deleteScreenerMutation.mutate(id);
      }
      setShowConfirmDialog(false);
    });
    setShowConfirmDialog(true);
  };

  // Handle add new item
  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      alert('Name is required');
      return;
    }

    setConfirmMessage(`Are you sure you want to add this new ${activeTab === 'schools' ? 'school' : 'screener'}?`);
    setConfirmAction(() => () => {
      if (activeTab === 'schools') {
        createSchoolMutation.mutate(newItem);
      } else {
        createScreenerMutation.mutate(newItem);
      }
      setShowConfirmDialog(false);
    });
    setShowConfirmDialog(true);
  };

  // Render table for schools or screeners
  const renderTable = (items, type) => {
    const isLoading = type === 'schools' ? loadingSchools : loadingScreeners;
    const isSaving = type === 'schools' 
      ? updateSchoolMutation.isLoading 
      : updateScreenerMutation.isLoading;

    if (isLoading) {
      return <div className="text-center py-8 text-gray-600">Loading...</div>;
    }

    return (
      <div className="space-y-4">
        {/* Add New Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 capitalize">
            {type === 'schools' ? 'Schools' : 'Screeners'} ({items.length})
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add New {type === 'schools' ? 'School' : 'Screener'}
          </button>
        </div>

        {/* Add New Form */}
        {showAddForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Add New {type === 'schools' ? 'School' : 'Screener'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder={`Enter ${type === 'schools' ? 'school' : 'screener'} name`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active (Enabled)
                </label>
                <select
                  value={newItem.active ? 'true' : 'false'}
                  onChange={(e) => setNewItem({ ...newItem, active: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="true">Yes (Shows in dropdowns)</option>
                  <option value="false">No (Hidden)</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleAddItem}
                  disabled={createSchoolMutation.isLoading || createScreenerMutation.isLoading}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  {createSchoolMutation.isLoading || createScreenerMutation.isLoading ? 'Adding...' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItem({ name: '', active: true });
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Active (Enabled)</th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    No {type === 'schools' ? 'schools' : 'screeners'} found
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isEditing = editingId === item.id && editingType === type;
                  const changes = unsavedChanges[item.id] || {};
                  const displayName = changes.name !== undefined ? changes.name : item.name;
                  const displayActive = changes.active !== undefined ? changes.active : item.active;

                  return (
                    <tr 
                      key={item.id} 
                      className={isEditing ? 'bg-blue-50' : ''}
                    >
                      <td className="border border-gray-300 px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => handleCellChange(item.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          <span className={!item.active ? 'text-gray-400' : ''}>{item.name}</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {isEditing ? (
                          <select
                            value={displayActive ? 'true' : 'false'}
                            onChange={(e) => handleCellChange(item.id, 'active', e.target.value === 'true')}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="true">Yes (Shows in dropdowns)</option>
                            <option value="false">No (Hidden)</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.active ? 'Yes' : 'No'}
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(item.id, type)}
                              disabled={isSaving}
                              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, type)}
                              disabled={isSaving || deleteSchoolMutation.isLoading || deleteScreenerMutation.isLoading}
                              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(item.id, type)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Advanced Settings</h1>
      <p className="text-gray-600 mb-6">
        Manage database tables. Items marked as "Active" will appear in dropdowns throughout the application.
      </p>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          <button
            onClick={() => {
              setActiveTab('schools');
              setEditingId(null);
              setEditingType(null);
              setShowAddForm(false);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'schools'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Schools
          </button>
          <button
            onClick={() => {
              setActiveTab('screeners');
              setEditingId(null);
              setEditingType(null);
              setShowAddForm(false);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'screeners'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Screeners
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'schools' && renderTable(schools, 'schools')}
        {activeTab === 'screeners' && renderTable(screeners, 'screeners')}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Action</h3>
            <p className="text-gray-700 mb-6">
              {confirmMessage}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                  setConfirmMessage('');
                }}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction) {
                    confirmAction();
                  }
                }}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
