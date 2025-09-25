// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// API Response Handler
const handleApiResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Generic API Request Function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    return await handleApiResponse(response);
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// API Methods
export const api = {
  // GET request
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  
  // POST request
  post: (endpoint, data) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // PUT request
  put: (endpoint, data) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // DELETE request
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
  
  // PATCH request
  patch: (endpoint, data) => apiRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

// Specific API Services
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  registerStudent: (userData) => api.post('/auth/signup/student', userData),
  registerAdmin: (userData) => api.post('/auth/signup/admin', userData),
  registerFaculty: (userData) => api.post('/auth/signup/faculty', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const studentAPI = {
  getDashboard: () => api.get('/student/dashboard'),
  getFeatures: () => api.get('/student/features'),
  getProjects: () => api.get('/student/projects'),
  getGroups: () => api.get('/student/groups'),
  getInternships: () => api.get('/student/internships'),
};

export const facultyAPI = {
  getDashboard: () => api.get('/faculty/dashboard'),
  getStudents: () => api.get('/faculty/students'),
  getProjects: () => api.get('/faculty/projects'),
  getGroups: () => api.get('/faculty/groups'),
  updateProject: (projectId, data) => api.put(`/faculty/projects/${projectId}`, data),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  getStudents: () => api.get('/admin/students'),
  getFaculty: () => api.get('/admin/faculty'),
  getProjects: () => api.get('/admin/projects'),
  getGroups: () => api.get('/admin/groups'),
  getStats: () => api.get('/admin/stats'),
};

export default api;
