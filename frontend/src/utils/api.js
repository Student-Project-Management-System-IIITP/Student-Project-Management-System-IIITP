// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// API Response Handler
const handleApiResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('token');
      // Use window.location for hard redirect to ensure context is cleared
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
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
  // Existing methods
  getDashboard: () => api.get('/student/dashboard'),
  getFeatures: () => api.get('/student/features'),
  getProjects: () => api.get('/student/projects'),
  getGroups: () => api.get('/student/groups'),
  getInternships: () => api.get('/student/internships'),
  
  // Student Profile Management
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data) => api.put('/student/profile', data),
  
  // Sem 4 Project Management
  registerProject: (projectData) => api.post('/student/projects', projectData),
  updateProject: (projectId, data) => api.put(`/student/projects/${projectId}`, data),
  getProject: (projectId) => api.get(`/student/projects/${projectId}`),
  
  // Sem 4 PPT Upload (multipart/form-data)
  uploadPPT: (projectId, formData) => apiRequest(`/student/projects/${projectId}/submit-ppt`, {
    method: 'POST',
    body: formData,
    headers: {} // Let browser set Content-Type for multipart/form-data
  }),
  
  // Sem 4 PPT removal
  removePPT: (projectId) => apiRequest(`/student/projects/${projectId}/remove-ppt`, {
    method: 'DELETE'
  }),
  
  // Sem 4 Status Tracking
  getSem4Status: (projectId) => api.get(`/student/projects/${projectId}/sem4-status`),
  getSem4Features: () => api.get('/student/features'),
  
  // Sem 4 Presentation Scheduling
  schedulePresentation: (projectId, data) => api.post(`/student/projects/${projectId}/schedule-presentation`, data),
  
  // Upload tracking methods
  getUploads: () => api.get('/student/uploads'),
  getProjectUploads: (projectId) => api.get(`/student/projects/${projectId}/uploads`),
  getProjectUploadsByType: (projectId, type) => api.get(`/student/projects/${projectId}/uploads/type?type=${type}`),

  // Sem 5 Project Registration
  registerMinorProject2: (projectData) => api.post('/student/projects/minor2/register', projectData),
  
  // System Config
  getSystemConfig: (key) => api.get(`/student/system-config/${key}`),
  
  // Sem 5 Group Management
  createGroup: (groupData) => api.post('/student/groups', groupData),
  getMyGroups: () => api.get('/student/groups'),
  getGroupDetails: (groupId) => api.get(`/student/groups/${groupId}`),
  // Test endpoint
  testStudentLookup: (studentId) => api.get(`/student/test/student/${studentId}`),
  joinGroup: (groupId, role) => api.post(`/student/groups/${groupId}/join`, { role }),
  leaveGroup: (groupId) => api.post(`/student/groups/${groupId}/leave`),
  inviteToGroup: (groupId, studentIds, roles) => {
    return api.post(`/student/groups/${groupId}/invite`, { studentIds: studentIds, roles: roles });
  },
  sendGroupInvitations: (groupId, data) => api.post(`/student/groups/${groupId}/send-invitations`, data),
  getGroupInvitations: () => api.get('/student/groups/invitations'),
  acceptGroupInvitation: (groupId, inviteId) => api.post(`/student/groups/${groupId}/invite/${inviteId}/accept`),
  rejectGroupInvitation: (groupId, inviteId) => api.post(`/student/groups/${groupId}/invite/${inviteId}/reject`),
  
  // Advanced Group Management (Step 6 Features)
  transferLeadership: (groupId, data) => api.post(`/student/groups/${groupId}/transfer-leadership`, data),
  finalizeGroup: (groupId) => api.post(`/student/groups/${groupId}/finalize`),
  getAvailableStudents: (params = {}) => {
    // Manually construct query string to ensure parameters are sent
    const queryString = new URLSearchParams(params).toString();
    const url = `/student/groups/available-students${queryString ? '?' + queryString : ''}`;
    
    return api.get(url);
  },
  
  // Sem 5 Project Details
  updateProjectDetails: (projectId, details) => api.put(`/student/projects/${projectId}/details`, details),
  
  // Sem 5 Faculty Preferences
  submitFacultyPreferences: (projectId, preferences) => api.post(`/student/projects/${projectId}/faculty-preferences`, preferences),
  getFacultyPreferences: (projectId) => api.get(`/student/projects/${projectId}/faculty-preferences`),
  getFacultyList: () => api.get('/student/faculty'),
  
  // Sem 5 Status Tracking
  getSem5Status: (projectId) => api.get(`/student/projects/${projectId}/sem5-status`),
  getSem5Dashboard: () => api.get('/student/dashboard/sem5'),
};

export const facultyAPI = {
  // Existing methods
  getDashboard: () => api.get('/faculty/dashboard'),
  getStudents: () => api.get('/faculty/students'),
  getProjects: () => api.get('/faculty/projects'),
  getGroups: () => api.get('/faculty/groups'),
  updateProject: (projectId, data) => api.put(`/faculty/projects/${projectId}`, data),
  
  // Sem 4 Evaluation
  getEvaluationAssignments: () => api.get('/faculty/evaluations/assignments'),
  getSem4Students: () => api.get('/faculty/students?semester=4'),
  evaluateProject: (projectId, data) => api.post(`/faculty/projects/${projectId}/evaluate`, data),
  getSem4Projects: () => api.get('/faculty/projects?semester=4&type=minor1'),

  // Sem 5 Group Allocation
  getUnallocatedGroups: () => api.get('/faculty/groups/unallocated'),
  getAllocatedGroups: () => api.get('/faculty/groups/allocated'),
  chooseGroup: (groupId) => api.post(`/faculty/groups/${groupId}/choose`),
  passGroup: (groupId) => api.post(`/faculty/groups/${groupId}/pass`),
  getGroupDetails: (groupId) => api.get(`/faculty/groups/${groupId}`),
  
  // Sem 5 Statistics
  getSem5Statistics: () => api.get('/faculty/statistics/sem5'),
  getProfile: () => api.get('/faculty/profile'),
  updateProfile: (data) => api.put('/faculty/profile', data),
};

export const adminAPI = {
  // Existing methods
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  getStudents: () => api.get('/admin/students'),
  getFaculty: () => api.get('/admin/faculty'),
  getProjects: () => api.get('/admin/projects'),
  getGroups: () => api.get('/admin/groups'),
  getStats: () => api.get('/admin/stats'),
  
  // Admin Profile Management
  getProfile: () => api.get('/admin/profile'),
  updateProfile: (data) => api.put('/admin/profile', data),
  
  // Sem 4 Project Management
  getSem4Projects: () => api.get('/admin/projects?semester=4&type=minor1'),
  updateProjectStatus: (projectId, data) => api.put(`/admin/projects/${projectId}/status`, data),
  
  // Sem 4 Evaluation Management
  setEvaluationDates: (data) => api.post('/admin/evaluations/schedule', data),
  assignEvaluationPanel: (data) => api.post('/admin/evaluations/panel', data),
  getEvaluationSchedule: () => api.get('/admin/evaluations/schedule'),
  getSem4Statistics: () => api.get('/admin/stats?semester=4'),
  
  // Sem 4 Registrations Table
  getSem4Registrations: (params) => {
    const url = new URL('/admin/sem4/registrations', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },

  getSem5Registrations: (params) => {
    const url = new URL('/admin/sem5/registrations', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },

  getSem5AllocatedFaculty: (params) => {
    const url = new URL('/admin/sem5/allocated-faculty', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },

  getSem5NonRegisteredStudents: (params) => {
    const url = new URL('/admin/sem5/non-registered-students', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },

  // Sem 5 Group Management
  getSem5Groups: () => api.get('/admin/groups/sem5'),
  getAllGroups: () => api.get('/admin/groups'),
  getUnallocatedGroups: () => api.get('/admin/groups/unallocated'),
  forceAllocateFaculty: (groupId, facultyId) => api.post(`/admin/groups/${groupId}/allocate`, { facultyId }),
  
  // System Configuration
  getSystemConfigurations: (category) => {
    const url = category ? `/admin/system-config?category=${category}` : '/admin/system-config';
    return api.get(url);
  },
  getSystemConfigByKey: (key) => api.get(`/admin/system-config/${key}`),
  updateSystemConfigByKey: (key, value, description, force = false) => api.put(`/admin/system-config/${key}`, { value, description, force }),
  initializeSystemConfigs: () => api.post('/admin/system-config/initialize'),
  
  // Sem 5 Statistics
  getSem5Statistics: () => api.get('/admin/statistics/sem5'),
  getSem5Groups: () => api.get('/admin/groups/sem5'),
};

// Project APIs (shared)
export const projectAPI = {
  // Get student's current project
  getStudentCurrentProject: () => api.get('/projects/student/current'),
  
  // Get faculty's allocated projects
  getFacultyAllocatedProjects: () => api.get('/projects/faculty/allocated'),
  
  // Get project details
  getProjectDetails: (projectId) => api.get(`/projects/${projectId}`),
  
  // Get project messages
  getProjectMessages: (projectId, limit = 50) => api.get(`/projects/${projectId}/messages?limit=${limit}`),
  
  // Send a message
  sendMessage: (projectId, message) => api.post(`/projects/${projectId}/messages`, { message }),
};

export default api;
