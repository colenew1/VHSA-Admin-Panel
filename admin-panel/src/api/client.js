import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard
export const getDashboard = (params) => 
  api.get('/dashboard', { params }).then(res => res.data);

// Students
export const getIncompleteStudents = (params) => 
  api.get('/students/incomplete', { params }).then(res => res.data);

// Schools
export const getSchools = () => 
  api.get('/schools').then(res => res.data);

// Exports
export const exportStateReport = (params) => 
  api.get('/exports/state', { params, responseType: 'blob' }).then(res => res.data);

export const exportStickers = (params) => 
  api.get('/exports/stickers', { params, responseType: 'blob' }).then(res => res.data);

export default api;

