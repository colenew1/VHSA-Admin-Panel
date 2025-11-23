import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchools, createSchool, updateSchool, getScreeners, createScreener, updateScreener, deleteScreener, getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../api/client';
import api from '../api/client';

/**
 * Advanced Settings Page - Master List Manager
 * 
 * This page is the MASTER LIST for managing schools, screeners, and admin users (emails).
 * All changes here directly update the database tables.
 * 
 * - Schools: Updates the 'schools' table (used by Dashboard, Import, Export, etc.)
 * - Screeners: Updates the 'screeners' table
 * - Emails: Updates the 'admin_users' table (used for authentication)
 * 
 * When you edit/add/update here, it syncs with:
 * - Dashboard school dropdowns
 * - Import page school selection
 * - Authentication system (emails)
 * - All other pages that use these tables
 */
export default function Advanced() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('schools');
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState(null); // 'schools', 'screeners', or 'emails'
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', active: true, admin: true, email: '' });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const confirmExecutedRef = useRef(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    activeStatus: 'all', // 'all', 'active', 'inactive'
  });

  // Fetch schools (all, not just active)
  const { data: schoolsData, isLoading: loadingSchools } = useQuery({
    queryKey: ['schools', 'all'],
    queryFn: async () => {
      // Get ALL schools regardless of active status
      const response = await api.get('/schools', { params: { active: 'all' } });
      const allSchools = response.data?.schools || [];
      console.log('Fetched all schools:', allSchools.length, 'schools');
      return { schools: allSchools };
    },
  });

  // Fetch screeners (all, not just active)
  const { data: screenersData, isLoading: loadingScreeners } = useQuery({
    queryKey: ['screeners'],
    queryFn: () => getScreeners(),
  });

  // Fetch admin users (emails) - all, not just active
  const { data: adminUsersData, isLoading: loadingAdminUsers } = useQuery({
    queryKey: ['adminUsers', 'all'],
    queryFn: async () => {
      const response = await api.get('/admin-users', { params: { active: 'all' } });
      const allAdminUsers = response.data?.adminUsers || [];
      console.log('Fetched all admin users:', allAdminUsers.length, 'users');
      return { adminUsers: allAdminUsers };
    },
  });

  const allSchools = schoolsData?.schools || [];
  const allScreeners = screenersData?.screeners || [];
  const allAdminUsers = adminUsersData?.adminUsers || [];
  
  // Filter and sort schools/screeners - active ones always at top
  const schools = useMemo(() => {
    let filtered = [...allSchools];
    
    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by active status
    if (filters.activeStatus === 'active') {
      filtered = filtered.filter(s => s.active === true);
    } else if (filters.activeStatus === 'inactive') {
      filtered = filtered.filter(s => s.active === false);
    }
    
    // Sort: active first, then by name alphabetically
    filtered.sort((a, b) => {
      // First sort by active status (active=true comes first)
      if (a.active !== b.active) {
        // If a is active and b is not, a comes first (return negative)
        // If b is active and a is not, b comes first (return positive)
        return (b.active ? 1 : 0) - (a.active ? 1 : 0);
      }
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    return filtered;
  }, [allSchools, filters]);
  
  const screeners = useMemo(() => {
    let filtered = [...allScreeners];
    
    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by active status
    if (filters.activeStatus === 'active') {
      filtered = filtered.filter(s => s.active === true);
    } else if (filters.activeStatus === 'inactive') {
      filtered = filtered.filter(s => s.active === false);
    }
    
    // Sort: active first, then by name alphabetically
    filtered.sort((a, b) => {
      // First sort by active status (active=true comes first)
      if (a.active !== b.active) {
        // If a is active and b is not, a comes first (return negative)
        // If b is active and a is not, b comes first (return positive)
        return (b.active ? 1 : 0) - (a.active ? 1 : 0);
      }
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    return filtered;
  }, [allScreeners, filters]);
  
  const emails = useMemo(() => {
    let filtered = [...allAdminUsers];
    
    // Filter by search (name or email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by active status
    if (filters.activeStatus === 'active') {
      filtered = filtered.filter(u => u.active === true);
    } else if (filters.activeStatus === 'inactive') {
      filtered = filtered.filter(u => u.active === false);
    }
    
    // Sort: active first, then by name alphabetically
    filtered.sort((a, b) => {
      if (a.active !== b.active) {
        return (b.active ? 1 : 0) - (a.active ? 1 : 0);
      }
      return a.name.localeCompare(b.name);
    });
    
    return filtered;
  }, [allAdminUsers, filters]);

  // Create mutations
  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      queryClient.invalidateQueries(['schools']);
      queryClient.invalidateQueries(['schools', 'all']);
      setShowAddForm(false);
      setNewItem({ name: '', active: true, admin: true, email: '' });
    },
  });

  const createScreenerMutation = useMutation({
    mutationFn: createScreener,
    onSuccess: () => {
      queryClient.invalidateQueries(['screeners']);
      setShowAddForm(false);
      setNewItem({ name: '', active: true, phone_number: '' });
    },
  });

  const createAdminUserMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
      queryClient.invalidateQueries(['adminUsers', 'all']);
      setShowAddForm(false);
      setNewItem({ name: '', active: true, phone_number: '' });
    },
  });

  // Update mutations
  const updateSchoolMutation = useMutation({
    mutationFn: ({ id, data }) => {
      console.log('Mutation called with:', { id, data });
      return updateSchool(id, data);
    },
    onSuccess: async (response) => {
      console.log('✅ Update school success, response:', response);
      console.log('✅ Updated school from response:', response.school);
      console.log('✅ Response school active:', response.school?.active);
      
      // Update ALL query caches that use schools data
      // This ensures Dashboard and other pages see the update immediately
      const updatedSchool = response.school;
      
      // Update the 'all' query cache (Advanced page)
      queryClient.setQueryData(['schools', 'all'], (oldData) => {
        if (!oldData) return oldData;
        const updatedSchools = oldData.schools.map(school => 
          school.id === updatedSchool?.id ? updatedSchool : school
        );
        console.log('✅ Updated schools/all cache');
        return { schools: updatedSchools };
      });
      
      // Update the default 'schools' query cache (Dashboard and other pages)
      queryClient.setQueryData(['schools'], (oldData) => {
        if (!oldData) return oldData;
        // Only update if the school is in this list (active schools)
        const schoolIndex = oldData.schools.findIndex(s => s.id === updatedSchool?.id);
        if (schoolIndex >= 0) {
          const updatedSchools = [...oldData.schools];
          updatedSchools[schoolIndex] = updatedSchool;
          console.log('✅ Updated schools cache (Dashboard)');
          return { schools: updatedSchools };
        }
        // If school became inactive, remove it from active list
        if (!updatedSchool.active) {
          const updatedSchools = oldData.schools.filter(s => s.id !== updatedSchool.id);
          console.log('✅ Removed inactive school from active list');
          return { schools: updatedSchools };
        }
        // If school became active and wasn't in list, add it
        if (updatedSchool.active && schoolIndex === -1) {
          const updatedSchools = [...oldData.schools, updatedSchool].sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          console.log('✅ Added newly active school to list');
          return { schools: updatedSchools };
        }
        return oldData;
      });
      
      // Invalidate and refetch to ensure we have the latest from database
      await queryClient.invalidateQueries(['schools']);
      await queryClient.invalidateQueries(['schools', 'all']);
      
      // Refetch both queries to sync with database
      try {
        await Promise.all([
          queryClient.refetchQueries(['schools', 'all']),
          queryClient.refetchQueries(['schools'])
        ]);
        console.log('✅ All caches refetched and synced');
      } catch (error) {
        console.error('Error refetching:', error);
      }
      
      setEditingId(null);
      setEditingType(null);
      setUnsavedChanges({});
    },
    onError: (error) => {
      console.error('Error updating school:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update school';
      alert(`Error updating school: ${errorMessage}`);
    },
  });

  const updateScreenerMutation = useMutation({
    mutationFn: ({ id, data }) => updateScreener(id, data),
    onSuccess: async () => {
      // Invalidate and refetch to get updated data
      await queryClient.invalidateQueries(['screeners']);
      // Refetch the data immediately
      await queryClient.refetchQueries(['screeners']);
      setEditingId(null);
      setEditingType(null);
      setUnsavedChanges({});
    },
    onError: (error) => {
      console.error('Error updating screener:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update screener';
      alert(`Error updating screener: ${errorMessage}`);
    },
  });

  const updateAdminUserMutation = useMutation({
    mutationFn: ({ id, data }) => updateAdminUser(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['adminUsers']);
      await queryClient.invalidateQueries(['adminUsers', 'all']);
      await queryClient.refetchQueries(['adminUsers', 'all']);
      setEditingId(null);
      setEditingType(null);
      setUnsavedChanges({});
    },
    onError: (error) => {
      console.error('Error updating admin user:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update admin user';
      alert(`Error updating admin user: ${errorMessage}`);
    },
  });

  // Delete mutations
  const deleteScreenerMutation = useMutation({
    mutationFn: deleteScreener,
    onSuccess: () => {
      queryClient.invalidateQueries(['screeners']);
      setEditingId(null);
      setEditingType(null);
    },
    onError: (error) => {
      console.error('Error deleting screener:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete screener';
      alert(`Error deleting screener: ${errorMessage}`);
    },
  });

  const deleteAdminUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
      queryClient.invalidateQueries(['adminUsers', 'all']);
      setEditingId(null);
      setEditingType(null);
    },
    onError: (error) => {
      console.error('Error deleting admin user:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete admin user';
      alert(`Error deleting admin user: ${errorMessage}`);
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

  // Handle delete (screeners and admin users - schools cannot be deleted)
  const handleDelete = (id, type) => {
    // Only allow delete for screeners and admin users
    if (type !== 'screeners' && type !== 'emails') {
      return;
    }

    // Find the item
    const item = type === 'screeners' 
      ? allScreeners.find(s => s.id === id)
      : allAdminUsers.find(u => u.id === id);
    
    if (!item) return;

    setConfirmMessage(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`);
    setConfirmAction(() => {
      if (type === 'screeners') {
        deleteScreenerMutation.mutate(id);
      } else if (type === 'emails') {
        deleteAdminUserMutation.mutate(id);
      }
      setShowConfirmDialog(false);
    });
    setShowConfirmDialog(true);
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
    console.log('handleSave called with:', id, type);
    const changes = unsavedChanges[id] || {};
    console.log('Changes:', changes);
    const item = type === 'schools' 
      ? schools.find(s => s.id === id)
      : type === 'screeners'
      ? screeners.find(s => s.id === id)
      : emails.find(u => u.id === id);
    
    if (!item) {
      console.error('Item not found for save:', id, type);
      alert('Item not found. Please refresh the page.');
      return;
    }

    console.log('Item found:', item);

    const updateData = {
      name: changes.name !== undefined ? changes.name : item.name,
      active: changes.active !== undefined ? changes.active : item.active,
    };

    // Add email and admin for admin users
    if (type === 'emails') {
      updateData.email = changes.email !== undefined ? changes.email : (item.email || '');
      updateData.admin = changes.admin !== undefined ? changes.admin : item.admin;
    }

    console.log('Update data:', updateData);

    // Always show confirmation dialog - let the user decide
    const typeName = type === 'schools' ? 'school' : type === 'screeners' ? 'screener' : 'admin user';
    setConfirmMessage(`Are you sure you want to update this ${typeName}?`);
    // Capture values in closure to ensure they're available when confirmAction is called
    const capturedId = id;
    const capturedType = type;
    const capturedData = { ...updateData }; // Create a copy to avoid reference issues
    
    console.log('Setting confirm action with:', capturedId, capturedType, capturedData);
    
    setConfirmAction(() => {
      console.log('Executing confirm action for:', capturedType, capturedId, capturedData);
      setShowConfirmDialog(false);
      if (capturedType === 'schools') {
        updateSchoolMutation.mutate({ id: capturedId, data: capturedData });
      } else if (capturedType === 'screeners') {
        updateScreenerMutation.mutate({ id: capturedId, data: capturedData });
      } else if (capturedType === 'emails') {
        updateAdminUserMutation.mutate({ id: capturedId, data: capturedData });
      }
    });
    
    console.log('About to show confirm dialog');
    setShowConfirmDialog(true);
    console.log('Confirm dialog state set to true');
  };


  // Handle add new item
  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      alert('Name is required');
      return;
    }

    const typeName = activeTab === 'schools' ? 'school' : activeTab === 'screeners' ? 'screener' : 'admin user';
    setConfirmMessage(`Are you sure you want to add this new ${typeName}?`);
    setConfirmAction(() => {
      if (activeTab === 'schools') {
        createSchoolMutation.mutate(newItem);
      } else if (activeTab === 'screeners') {
        createScreenerMutation.mutate(newItem);
      } else if (activeTab === 'emails') {
        createAdminUserMutation.mutate(newItem);
      }
      setShowConfirmDialog(false);
    });
    setShowConfirmDialog(true);
  };

  // Render table for schools, screeners, or phone numbers
  const renderTable = (items, type) => {
    const isLoading = type === 'schools' ? loadingSchools 
      : type === 'screeners' ? loadingScreeners 
      : loadingAdminUsers;
    const isSaving = type === 'schools' 
      ? updateSchoolMutation.isLoading 
      : type === 'screeners'
      ? updateScreenerMutation.isLoading
      : updateAdminUserMutation.isLoading;
    const allItems = type === 'schools' ? allSchools 
      : type === 'screeners' ? allScreeners
      : allAdminUsers;

    if (isLoading) {
      return <div className="text-center py-8 text-gray-600">Loading...</div>;
    }

    return (
      <div className="space-y-4">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 capitalize">
            {type === 'schools' ? 'Schools' : type === 'screeners' ? 'Screeners' : 'Emails'} ({items.length} of {allItems.length})
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add New {type === 'schools' ? 'School' : type === 'screeners' ? 'Screener' : 'Email'}
          </button>
        </div>
        
        {/* Filters */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by Name
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder={`Search ${type === 'schools' ? 'schools' : type === 'screeners' ? 'screeners' : 'emails'}...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            {/* Active Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={filters.activeStatus}
                onChange={(e) => setFilters({ ...filters, activeStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All ({allItems.length})</option>
                <option value="active">Active Only ({allItems.filter(i => i.active).length})</option>
                <option value="inactive">Hidden Only ({allItems.filter(i => !i.active).length})</option>
              </select>
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(filters.search || filters.activeStatus !== 'all') && (
            <div className="mt-3">
              <button
                onClick={() => setFilters({ search: '', activeStatus: 'all' })}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Add New Form */}
        {showAddForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Add New {type === 'schools' ? 'School' : type === 'screeners' ? 'Screener' : 'Email'}
            </h3>
            <div className={`grid grid-cols-1 ${type === 'emails' ? 'md:grid-cols-5' : 'md:grid-cols-3'} gap-4`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder={`Enter ${type === 'schools' ? 'school' : type === 'screeners' ? 'screener' : 'name'}`}
                />
              </div>
              {type === 'emails' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newItem.email || ''}
                    onChange={(e) => setNewItem({ ...newItem, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="user@example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">Optional - can add later</p>
                </div>
              )}
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
              {type === 'emails' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin
                  </label>
                  <select
                    value={newItem.admin ? 'true' : 'false'}
                    onChange={(e) => setNewItem({ ...newItem, admin: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="true">Yes (Admin privileges)</option>
                    <option value="false">No (Regular user)</option>
                  </select>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleAddItem}
                    disabled={createSchoolMutation.isLoading || createScreenerMutation.isLoading || createAdminUserMutation.isLoading}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                  >
                    {createSchoolMutation.isLoading || createScreenerMutation.isLoading || createAdminUserMutation.isLoading ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewItem({ name: '', active: true, admin: true, email: '' });
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
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
                {type === 'emails' && (
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Email Address</th>
                )}
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Active (Enabled)</th>
                {type === 'emails' && (
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Admin</th>
                )}
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={type === 'emails' ? 5 : 3} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    No {type === 'schools' ? 'schools' : type === 'screeners' ? 'screeners' : 'emails'} found
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isEditing = editingId === item.id && editingType === type;
                  const changes = unsavedChanges[item.id] || {};
                  const displayName = changes.name !== undefined ? changes.name : item.name;
                  const displayEmail = changes.email !== undefined ? changes.email : (item.email || '');
                  const displayActive = changes.active !== undefined ? changes.active : (item.active ?? true);
                  const displayAdmin = changes.admin !== undefined ? changes.admin : (item.admin ?? false);

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
                      {type === 'emails' && (
                        <td className="border border-gray-300 px-4 py-3">
                          {isEditing ? (
                            <input
                              type="email"
                              value={displayEmail}
                              onChange={(e) => handleCellChange(item.id, 'email', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="user@example.com"
                            />
                          ) : (
                            <span className={!item.email ? 'text-gray-400 italic' : ''}>
                              {item.email || 'No email'}
                            </span>
                          )}
                        </td>
                      )}
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
                            displayActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {displayActive ? 'Yes' : 'No'}
                          </span>
                        )}
                      </td>
                      {type === 'emails' && (
                        <td className="border border-gray-300 px-4 py-3">
                          {isEditing ? (
                            <select
                              value={displayAdmin ? 'true' : 'false'}
                              onChange={(e) => handleCellChange(item.id, 'admin', e.target.value === 'true')}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="true">Yes (Admin privileges)</option>
                              <option value="false">No (Regular user)</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              displayAdmin 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {displayAdmin ? 'Yes' : 'No'}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="border border-gray-300 px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Save button clicked for:', item.id, type);
                                handleSave(item.id, type);
                              }}
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
                            {/* Delete button - show for screeners and emails, not schools */}
                            {(type === 'screeners' || type === 'emails') && (
                              <button
                                onClick={() => handleDelete(item.id, type)}
                                disabled={isSaving || deleteScreenerMutation.isLoading || deleteAdminUserMutation.isLoading}
                                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            )}
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
          <button
            onClick={() => {
              setActiveTab('emails');
              setEditingId(null);
              setEditingType(null);
              setShowAddForm(false);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'emails'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Emails
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'schools' && renderTable(schools, 'schools')}
        {activeTab === 'screeners' && renderTable(screeners, 'screeners')}
        {activeTab === 'emails' && renderTable(emails, 'emails')}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close dialog if clicking backdrop
            if (e.target === e.currentTarget) {
              setShowConfirmDialog(false);
              setConfirmAction(null);
              setConfirmMessage('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirmAction && !confirmExecutedRef.current) {
                    confirmExecutedRef.current = true;
                    try {
                      confirmAction();
                      // Reset after a short delay to allow for React StrictMode double renders
                      setTimeout(() => {
                        confirmExecutedRef.current = false;
                      }, 1000);
                    } catch (error) {
                      console.error('Error executing confirm action:', error);
                      alert('An error occurred. Please try again.');
                      confirmExecutedRef.current = false;
                    }
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

