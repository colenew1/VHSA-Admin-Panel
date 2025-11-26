import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const isDev = import.meta.env.DEV;

// Log API URL only once on startup in development
if (isDev) {
  console.log('🔗 API configured:', `${API_URL}/api`);
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request logging (development only)
api.interceptors.request.use(
  (config) => {
    if (isDev) {
      console.log('📤', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error.message);
    return Promise.reject(error);
  }
);

// Response error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('❌ Network Error - Check if backend is running');
      if (isDev) {
        console.error('  API URL:', API_URL);
      }
    } else if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data?.error || error.response.statusText);
    }
    return Promise.reject(error);
  }
);

// ============= Dashboard API =============
export const getDashboard = (params) => 
  api.get('/dashboard', { params }).then(res => res.data);

// ============= Students API =============
export const getIncompleteStudents = (params) => 
  api.get('/students/incomplete', { params }).then(res => res.data);

export const searchStudentsById = (studentId) =>
  api.get('/students/search/id', { params: { studentId } }).then(res => res.data);

export const searchStudentsByName = (lastName, school) =>
  api.get('/students/search/name', { params: { lastName, school } }).then(res => res.data);

export const getStudentByUniqueId = (uniqueId) =>
  api.get(`/students/${uniqueId}`).then(res => res.data);

export const createStudent = (data) =>
  api.post('/students', data).then(res => res.data);

export const getNextStudentId = (schoolName) =>
  api.get(`/students/next-id/${encodeURIComponent(schoolName)}`).then(res => res.data);

export const searchStudentsWithNotes = (params) =>
  api.get('/students/search/notes', { params }).then(res => res.data);

// ============= Schools API =============
export const getSchools = () => 
  api.get('/schools').then(res => res.data);

export const createSchool = (data) =>
  api.post('/schools', data).then(res => res.data);

export const updateSchool = (id, data) =>
  api.put(`/schools/${id}`, data).then(res => res.data);

export const deleteSchool = (id) =>
  api.delete(`/schools/${id}`).then(res => res.data);

// ============= Screeners API =============
export const getScreeners = () =>
  api.get('/screeners').then(res => res.data);

export const createScreener = (data) =>
  api.post('/screeners', data).then(res => res.data);

export const updateScreener = (id, data) =>
  api.put(`/screeners/${id}`, data).then(res => res.data);

export const deleteScreener = (id) =>
  api.delete(`/screeners/${id}`).then(res => res.data);

// ============= Admin Users API =============
export const getAdminUsers = (params) =>
  api.get('/admin-users', { params }).then(res => res.data);

export const createAdminUser = (data) =>
  api.post('/admin-users', data).then(res => res.data);

export const updateAdminUser = (id, data) =>
  api.put(`/admin-users/${id}`, data).then(res => res.data);

export const deleteAdminUser = (id) =>
  api.delete(`/admin-users/${id}`).then(res => res.data);

// ============= Exports API =============
export const exportStateReport = (params) =>
  api.get('/exports/state', { params, responseType: 'blob' }).then(res => res.data);

export const getStickerPreview = (params) =>
  api.get('/exports/stickers/preview', { params }).then(res => res.data);

export const exportStickers = (data) =>
  api.post('/exports/stickers', data, { responseType: 'blob' }).then(res => res.data);

export const getReportingData = (params) =>
  api.get('/exports/reporting', { params }).then(res => res.data);

export const updateReportingData = (data) =>
  api.put('/exports/reporting', data).then(res => res.data);

export const exportReportingPDF = (params) =>
  api.post('/exports/reporting/pdf', params, { responseType: 'blob' }).then(res => res.data);

export const searchStudentsForExport = (params) =>
  api.get('/exports/students', { params }).then(res => res.data);

export const exportStudentsCSV = (params) =>
  api.get('/exports/students/export', { params, responseType: 'blob' }).then(res => res.data);

// ============= Screening API =============
export const getScreeningData = (params) =>
  api.get('/screening/data', { params }).then(res => res.data);

export const updateScreening = (uniqueId, data) =>
  api.put(`/screening/${uniqueId}`, data).then(res => res.data);

export default api;
