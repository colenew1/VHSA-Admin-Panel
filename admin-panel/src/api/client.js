import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Log API URL for debugging (only in development or if not set)
if (!import.meta.env.VITE_API_URL || import.meta.env.DEV) {
  console.log('🔗 API URL:', API_URL);
  console.log('🔗 Full API Base URL:', `${API_URL}/api`);
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// AUTH REMOVED: Rebuilding auth as separate system
// Add request interceptor to include auth token
// api.interceptors.request.use(
//   (config) => {
//     // Get auth token from localStorage
//     const storedSession = localStorage.getItem('auth_session');
//     if (storedSession) {
//       try {
//         const session = JSON.parse(storedSession);
//         if (session.access_token) {
//           config.headers.Authorization = `Bearer ${session.access_token}`;
//         }
//       } catch (error) {
//         console.error('Error parsing auth session:', error);
//       }
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// Add response interceptor to handle 401 errors (unauthorized)
// api.interceptors.response.use(
//   (response) => {
//     return response;
//   },
//   (error) => {
//     // If we get a 401, clear auth and redirect to login
//     if (error.response?.status === 401) {
//       localStorage.removeItem('auth_session');
//       localStorage.removeItem('auth_user');
//       // Redirect to login if we're not already there
//       if (window.location.pathname !== '/login') {
//         window.location.href = '/login';
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// Add request interceptor for debugging (after auth interceptor)
api.interceptors.request.use(
  (config) => {
    // Only log in development
    if (import.meta.env.DEV) {
      console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('❌ Network Error:', {
        message: error.message,
        code: error.code,
        apiUrl: API_URL,
        fullUrl: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      console.error('💡 Check: Is VITE_API_URL set correctly in Netlify?');
      console.error('💡 Check: Is the backend server running?');
    } else if (error.response) {
      console.error('❌ API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
      });
    } else {
      console.error('❌ API Error:', error);
    }
    return Promise.reject(error);
  }
);

// Dashboard
export const getDashboard = (params) => 
  api.get('/dashboard', { params }).then(res => res.data);

// Students
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

// Schools
export const getSchools = () => 
  api.get('/schools').then(res => res.data);

export const createSchool = (data) =>
  api.post('/schools', data).then(res => res.data);

export const updateSchool = (id, data) =>
  api.put(`/schools/${id}`, data).then(res => res.data);

export const deleteSchool = (id) =>
  api.delete(`/schools/${id}`).then(res => res.data);

// Screeners
export const getScreeners = () =>
  api.get('/screeners').then(res => res.data);

export const createScreener = (data) =>
  api.post('/screeners', data).then(res => res.data);

export const updateScreener = (id, data) =>
  api.put(`/screeners/${id}`, data).then(res => res.data);

export const deleteScreener = (id) =>
  api.delete(`/screeners/${id}`).then(res => res.data);

// Admin Users (Emails)
export const getAdminUsers = (params) =>
  api.get('/admin-users', { params }).then(res => res.data);

export const createAdminUser = (data) =>
  api.post('/admin-users', data).then(res => res.data);

export const updateAdminUser = (id, data) =>
  api.put(`/admin-users/${id}`, data).then(res => res.data);

export const deleteAdminUser = (id) =>
  api.delete(`/admin-users/${id}`).then(res => res.data);

// Exports
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

// Student Export
export const searchStudentsForExport = (params) =>
  api.get('/exports/students', { params }).then(res => res.data);

export const exportStudentsCSV = (params) =>
  api.get('/exports/students/export', { params, responseType: 'blob' }).then(res => res.data);

// Screening Data
export const getScreeningData = (params) =>
  api.get('/screening/data', { params }).then(res => res.data);

export const updateScreening = (uniqueId, data) =>
  api.put(`/screening/${uniqueId}`, data).then(res => res.data);

export default api;

