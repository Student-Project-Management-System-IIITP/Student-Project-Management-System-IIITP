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
    
    // Create error with full response data preserved for error handling
    const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
    error.response = {
      status: response.status,
      statusText: response.statusText,
      data: errorData // Preserve full error data including warning, etc.
    };
    error.status = response.status;
    throw error;
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

  // Check if this is a system config endpoint that might return 404
  const isSystemConfigEndpoint = endpoint.includes('/system-config/');

  try {
    const response = await fetch(url, config);
    
    // Handle 404 errors for system config endpoints silently (expected when configs aren't initialized)
    if (isSystemConfigEndpoint && response.status === 404) {
      // For system config 404s, suppress console errors and return structured error
      // Don't read the response body to avoid additional console errors
      const error = new Error('Configuration not found');
      error.isConfig404 = true; // Mark as config 404 for handling
      error.silent = true; // Mark as silent to prevent console logging
      error.status = 404;
      throw error;
    }
    
    return await handleApiResponse(response);
  } catch (error) {
    // Suppress console errors for system config 404s (expected when configs aren't initialized)
    const isSystemConfig404 = isSystemConfigEndpoint && 
                              (error.isConfig404 || error.status === 404 || error.silent || 
                               error.message?.includes('404') || error.message?.includes('not found'));
    
    if (!isSystemConfig404 && !error.silent) {
      console.error('API Request Error:', error);
    }
    
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
  getProjects: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/student/projects${queryString ? '?' + queryString : ''}`);
  },
  getGroups: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/student/groups${queryString ? '?' + queryString : ''}`);
  },
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
  
  // System Config (handles 404 gracefully for missing configs)
  getSystemConfig: async (key) => {
    try {
      return await api.get(`/student/system-config/${key}`);
    } catch (error) {
      // Return a structured response for 404s instead of throwing
      // This allows components to handle missing configs gracefully
      // 404s are expected when configs haven't been initialized yet by admin
      if (error.isConfig404 || error.silent || (error.message && (error.message.includes('404') || error.message.includes('not found')))) {
        return {
          success: false,
          data: null,
          message: 'Configuration not found'
        };
      }
      // Re-throw other errors
      throw error;
    }
  },
  getSystemConfigs: () => api.get('/student/system-config'),
  
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
  getGroupInvitations: () => api.get('/student/groups/invitations'),

  // M.Tech Sem 2 Registration
  getMTechSem2PreRegistration: () => api.get('/student/mtech/sem2/pre-registration'),
  registerMTechSem2Project: (data) => api.post('/student/mtech/sem2/register', data),
  
  // Sem 6 specific methods
  getSem5GroupForSem6: () => api.get('/student/sem6/pre-registration'),
  registerSem6Project: (data) => api.post('/student/sem6/register', data),
  
  // Project continuation (Sem 6)
  getContinuationProjects: () => api.get('/student/projects/continuation'),
  createContinuationProject: (data) => api.post('/student/projects/continuation', data),
  
  // Sem 7 specific methods
  // Track selection
  setSem7Choice: (choice) => api.post('/sem7/choice', { chosenTrack: choice }),
  getSem7Choice: () => api.get('/sem7/choice'),

  // M.Tech Sem 3 track selection
  getMTechSem3Choice: () => api.get('/sem3/choice'),
  setMTechSem3Choice: (choice) => api.post('/sem3/choice', { chosenTrack: choice }),
  
  // Major Project 1 registration
  registerMajorProject1: (projectData) => api.post('/student/projects/major1/register', projectData),
  registerMTechSem3MajorProject: (payload) => api.post('/student/mtech/sem3/major-project/register', payload),
  
  // Internship 1 status and registration
  checkInternship1Status: () => api.get('/student/projects/internship1/status'),
  registerInternship1: (projectData) => api.post('/student/projects/internship1/register', projectData),
  
  // Sem 8 specific methods
  // Track selection
  setSem8Choice: (choice) => api.post('/sem8/choice', { chosenTrack: choice }),
  getSem8Choice: () => api.get('/sem8/choice'),
  
  // Major Project 2 registration
  registerMajorProject2: (projectData) => api.post('/student/projects/major2/register', projectData),
  
  // Internship 2 status and registration
  checkInternship2Status: () => api.get('/student/projects/internship2/status'),
  registerInternship2: (projectData) => api.post('/student/projects/internship2/register', projectData),
};

// Sem 7 API - Track selection and internship applications
export const sem7API = {
  setChoice: (choice) => api.post('/sem7/choice', { chosenTrack: choice }),
  getChoice: () => api.get('/sem7/choice'),
};

// Sem 8 API - Track selection and status
export const sem8API = {
  getStatus: () => api.get('/sem8/status'),
  setChoice: (choice) => api.post('/sem8/choice', { chosenTrack: choice }),
  getChoice: () => api.get('/sem8/choice'),
};

// Internship API - Application management
export const internshipAPI = {
  // Create application (multipart/form-data for backward compatibility, but summer internships now use JSON)
  createApplication: async (type, details, files) => {
    // Summer internships now use Google Drive links (no file uploads needed)
    // Use FormData for backward compatibility, but details contain links instead of files
    const formData = new FormData();
    formData.append('type', type);
    formData.append('details', JSON.stringify(details));
    
    // No files needed anymore - summer internships use Google Drive links
    // Files parameter is kept for backward compatibility but not used
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/internships/applications`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData
    });
    
    return handleApiResponse(response);
  },
  
  // Get my applications
  getMyApplications: () => api.get('/internships/applications/my'),
  
  // Update application (JSON - no file uploads needed anymore)
  updateApplication: async (applicationId, details, files) => {
    // Send as JSON since we're not uploading files anymore
    // All data (including Google Drive links) is sent in the request body
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/internships/applications/${applicationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ details })
    });
    
    return handleApiResponse(response);
  },
  
  // Download file
  downloadFile: (applicationId, fileType) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/internships/applications/${applicationId}/files/${fileType}?token=${token}`;
  },
};

export const facultyAPI = {
  // Existing methods
  getDashboard: () => api.get('/faculty/dashboard'),
  getStudents: () => api.get('/faculty/students'),
  getProjects: () => api.get('/faculty/projects'),
  getGroups: () => api.get('/faculty/groups'),
  updateProject: (projectId, data) => api.put(`/faculty/projects/${projectId}`, data),

  // M.Tech Sem 3 major project allocation
  getSem3MajorProjectRequests: () => api.get('/faculty/mtech/sem3/major-projects/pending'),
  chooseSem3MajorProject: (projectId) => api.post(`/faculty/mtech/sem3/major-projects/${projectId}/choose`),
  passSem3MajorProject: (projectId) => api.post(`/faculty/mtech/sem3/major-projects/${projectId}/pass`),
  
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

  // Admin-side faculty management helpers (used from admin UI)
  searchFaculty: (query, sort) => {
    const params = {};
    if (query) params.search = query;
    if (sort) params.sort = sort;
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/faculties${queryString ? '?' + queryString : ''}`);
  },
  getFacultyDetails: (id) => api.get(`/admin/faculties/${id}`),
  updateFaculty: (id, data) => api.put(`/admin/faculties/${id}`, data),
  resetPassword: (id) => api.post(`/admin/faculties/${id}/reset-password`, {}),
};

export const adminAPI = {
  // Existing methods
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  getStudents: () => api.get('/admin/students'),
  getFaculty: () => api.get('/admin/faculty'),
  searchFaculties: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/faculties${queryString ? '?' + queryString : ''}`);
  },
  getProjects: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/projects${queryString ? '?' + queryString : ''}`);
  },
  getGroups: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/groups${queryString ? '?' + queryString : ''}`);
  },
  getGroupDetails: (groupId) => api.get(`/admin/groups/${groupId}`),
  updateGroupInfo: (groupId, data) => api.put(`/admin/groups/${groupId}`, data),
  addMemberToGroup: (groupId, data) => api.post(`/admin/groups/${groupId}/members`, data),
  removeMemberFromGroup: (groupId, studentId, data) => api.delete(`/admin/groups/${groupId}/members/${studentId}`, { data }),
  changeGroupLeader: (groupId, data) => api.put(`/admin/groups/${groupId}/leader`, data),
  disbandGroup: (groupId, data) => api.delete(`/admin/groups/${groupId}/disband`, { data }),
  allocateFacultyToGroup: (groupId, data) => api.post(`/admin/groups/${groupId}/allocate-faculty`, data),
  deallocateFacultyFromGroup: (groupId) => api.delete(`/admin/groups/${groupId}/deallocate-faculty`),
  getStats: () => api.get('/admin/stats'),
  
  // Admin Profile Management
  getProfile: () => api.get('/admin/profile'),
  updateProfile: (data) => api.put('/admin/profile', data),
  
  // Sem 4 Project Management
  getSem4Projects: () => api.get('/admin/projects?semester=4&type=minor1'),
  updateProjectStatus: (projectId, data) => api.put(`/admin/projects/${projectId}/status`, data),
  getUnregisteredSem4Students: () => api.get('/admin/sem4/unregistered-students'),
  
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

  getMTechSem1Registrations: (params) => {
    const url = new URL('/admin/mtech/sem1/registrations', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },

  getMTechSem2Registrations: (params) => {
    const url = new URL('/admin/mtech/sem2/registrations', API_BASE_URL);
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

  // Sem 6 Management
  getSem6Registrations: (params) => {
    const url = new URL('/admin/sem6/registrations', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },

  getSem6NonRegisteredGroups: (params) => {
    const url = new URL('/admin/sem6/non-registered-groups', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },
  getSem6Statistics: () => api.get('/admin/statistics/sem6'),

  getMTechSem1Statistics: (params) => {
    const url = new URL('/admin/statistics/mtech/sem1', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },

  getMTechSem2Statistics: (params) => {
    const url = new URL('/admin/statistics/mtech/sem2', API_BASE_URL);
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
  getSafeMinimumFacultyLimit: (semester, projectType, variant = null) => {
    let url = `/admin/system-config/safe-minimum-limit?semester=${semester}&projectType=${projectType}`;
    if (variant) {
      url += `&variant=${variant}`;
    }
    return api.get(url);
  },
  
  // Sem 5 Statistics
  getSem5Statistics: () => api.get('/admin/statistics/sem5'),
  getSem5Groups: () => api.get('/admin/groups/sem5'),
  
  // Semester Management
  updateStudentSemesters: (data) => api.post('/admin/students/update-semesters', data),
  getStudentsBySemester: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.semester !== undefined && params.semester !== null) {
      searchParams.append('semester', params.semester);
    }
    if (params.degree) {
      searchParams.append('degree', params.degree);
    }
    const queryString = searchParams.toString();
    return api.get(`/admin/students/by-semester${queryString ? `?${queryString}` : ''}`);
  },
  
  // Sem 7 Management
  listSem7TrackChoices: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/sem7/track-choices${queryString ? '?' + queryString : ''}`);
  },
  listMTechSem3TrackChoices: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/sem3/track-choices${queryString ? '?' + queryString : ''}`);
  },
  finalizeSem7Track: (studentId, data) => api.patch(`/admin/sem7/finalize/${studentId}`, data),
  listInternship1TrackChoices: () => api.get('/admin/sem7/internship1-track-choices'),
  changeInternship1Track: (studentId, data) => api.patch(`/admin/sem7/internship1-track/${studentId}`, data),
  
  // Sem 8 specific methods
  listSem8TrackChoices: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/sem8/track-choices${queryString ? '?' + queryString : ''}`);
  },
  finalizeSem8Track: (studentId, data) => api.patch(`/admin/sem8/finalize/${studentId}`, data),
  listInternshipApplications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/internships/applications${queryString ? '?' + queryString : ''}`);
  },

  getMTechSem1UnregisteredStudents: (params) => {
    const url = new URL('/admin/mtech/sem1/unregistered-students', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },

  getMTechSem2UnregisteredStudents: (params) => {
    const url = new URL('/admin/mtech/sem2/unregistered-students', API_BASE_URL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    return apiRequest(url.href.replace(API_BASE_URL, ''));
  },
  reviewInternshipApplication: (applicationId, data) => api.patch(`/internships/applications/${applicationId}/review`, data),
};

// Project APIs (shared)
export const projectAPI = {
  // Get student's current project
  getStudentCurrentProject: () => api.get('/projects/student/current'),
  
  // Get faculty's allocated projects
  getFacultyAllocatedProjects: () => api.get('/projects/faculty/allocated'),
  
  // Get project details
  getProjectDetails: (projectId) => api.get(`/projects/${projectId}`),
  
  // Chat Messages
  getProjectMessages: (projectId, limit = 50, before) => {
    let url = `/projects/${projectId}/messages?limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    return api.get(url);
  },
  sendMessage: (projectId, message) => api.post(`/projects/${projectId}/messages`, { message }),
  sendMessageWithFiles: async (projectId, message, files) => {
    const formData = new FormData();
    if (message) formData.append('message', message);
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    }
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/messages`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  editMessage: (projectId, messageId, message) => api.put(`/projects/${projectId}/messages/${messageId}`, { message }),
  deleteMessage: (projectId, messageId) => api.delete(`/projects/${projectId}/messages/${messageId}`),
  searchMessages: (projectId, query) => api.get(`/projects/${projectId}/messages/search?q=${encodeURIComponent(query)}`),
  getFileUrl: (projectId, filename) => `${API_BASE_URL}/projects/${projectId}/files/${filename}`,
  scheduleMeeting: (projectId, data) => api.post(`/projects/${projectId}/meeting`, data),
  completeMeeting: (projectId, data) => api.post(`/projects/${projectId}/meeting/complete`, data),
  
  // Message Reactions
  addReaction: (projectId, messageId, emoji) => api.post(`/projects/${projectId}/messages/${messageId}/reactions`, { emoji }),
  removeReaction: (projectId, messageId, emoji) => api.delete(`/projects/${projectId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),

  // Deliverables
  uploadDeliverable: async (projectId, deliverableType, file) => {
    const formData = new FormData();
    formData.append('deliverable', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/deliverables/${deliverableType}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  getDeliverableUrl: (projectId, filename) => `${API_BASE_URL}/projects/${projectId}/deliverables/${filename}`,
};

export default api;