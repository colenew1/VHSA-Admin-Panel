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

// Exports
export const exportStateReport = (params) =>
  api.get('/exports/state', { params, responseType: 'blob' }).then(res => res.data);

export const exportStickers = (params) =>
  api.get('/exports/stickers', { params, responseType: 'blob' }).then(res => res.data);

// Screening Data
export const getScreeningData = (params) =>
  api.get('/screening/data', { params }).then(res => res.data);

export const updateScreening = (uniqueId, data) =>
  api.put(`/screening/${uniqueId}`, data).then(res => res.data);

export default api;

