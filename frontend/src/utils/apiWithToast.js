import { api, authAPI, studentAPI, facultyAPI, adminAPI } from './api';
import { showSuccess, showError, showPromise, toastMessages } from './toast';

// Enhanced API wrapper with automatic toast notifications
export const apiWithToast = {
  // Generic request wrapper with toast
  request: async (apiCall, successMessage, errorMessage, showLoading = false) => {
    try {
      if (showLoading) {
        return showPromise(
          apiCall,
          {
            loading: 'Processing...',
            success: successMessage,
            error: errorMessage
          }
        );
      } else {
        const result = await apiCall;
        if (successMessage) {
          showSuccess(successMessage);
        }
        return result;
      }
    } catch (error) {
      const errorMsg = errorMessage || error.message || toastMessages.genericError;
      showError(errorMsg);
      throw error;
    }
  }
};

// Enhanced Auth API with toast notifications
export const authAPIWithToast = {
  login: async (credentials) => {
    return apiWithToast.request(
      authAPI.login(credentials),
      toastMessages.loginSuccess,
      toastMessages.loginError,
      true
    );
  },

  registerStudent: async (userData) => {
    return apiWithToast.request(
      authAPI.registerStudent(userData),
      toastMessages.registrationSuccess,
      toastMessages.registrationError,
      true
    );
  },

  registerAdmin: async (userData) => {
    return apiWithToast.request(
      authAPI.registerAdmin(userData),
      toastMessages.registrationSuccess,
      toastMessages.registrationError,
      true
    );
  },

  registerFaculty: async (userData) => {
    return apiWithToast.request(
      authAPI.registerFaculty(userData),
      toastMessages.registrationSuccess,
      toastMessages.registrationError,
      true
    );
  },

  logout: async () => {
    return apiWithToast.request(
      authAPI.logout(),
      toastMessages.logoutSuccess,
      'Logout failed'
    );
  },

  updateProfile: async (data) => {
    return apiWithToast.request(
      authAPI.updateProfile(data),
      toastMessages.saveSuccess,
      'Failed to update profile'
    );
  },

  changePassword: async (data) => {
    return apiWithToast.request(
      authAPI.changePassword(data),
      'Password changed successfully',
      'Failed to change password',
      true
    );
  },

  // Non-toast methods
  getProfile: authAPI.getProfile,
};

// Enhanced Student API with toast notifications
export const studentAPIWithToast = {
  // Project Management
  registerProject: async (projectData) => {
    return apiWithToast.request(
      studentAPI.registerProject(projectData),
      toastMessages.projectCreated,
      toastMessages.projectError,
      true
    );
  },

  updateProject: async (projectId, data) => {
    return apiWithToast.request(
      studentAPI.updateProject(projectId, data),
      toastMessages.projectUpdated,
      toastMessages.projectError
    );
  },

  registerMinorProject2: async (projectData) => {
    return apiWithToast.request(
      studentAPI.registerMinorProject2(projectData),
      'Semester 5 project registered successfully',
      'Failed to register Semester 5 project',
      true
    );
  },

  // File Upload
  uploadPPT: async (projectId, formData) => {
    return apiWithToast.request(
      studentAPI.uploadPPT(projectId, formData),
      toastMessages.fileUploadSuccess,
      toastMessages.fileUploadError,
      true
    );
  },

  removePPT: async (projectId) => {
    return apiWithToast.request(
      studentAPI.removePPT(projectId),
      toastMessages.fileDeleteSuccess,
      'Failed to delete file'
    );
  },

  // Group Management
  createGroup: async (groupData) => {
    return apiWithToast.request(
      studentAPI.createGroup(groupData),
      toastMessages.groupCreated,
      toastMessages.groupError,
      true
    );
  },

  joinGroup: async (groupId, role) => {
    return apiWithToast.request(
      studentAPI.joinGroup(groupId, role),
      toastMessages.groupJoined,
      toastMessages.groupError
    );
  },

  leaveGroup: async (groupId) => {
    return apiWithToast.request(
      studentAPI.leaveGroup(groupId),
      toastMessages.groupLeft,
      toastMessages.groupError
    );
  },

  inviteToGroup: async (groupId, studentIds, roles) => {
    return apiWithToast.request(
      studentAPI.inviteToGroup(groupId, studentIds, roles),
      'Invitations sent successfully',
      'Failed to send invitations'
    );
  },

  acceptGroupInvitation: async (groupId, inviteId) => {
    return apiWithToast.request(
    studentAPI.acceptGroupInvitation(groupId, inviteId),
    null, // Remove success toast message
    'Failed to accept invitation'
   );
  },

  rejectGroupInvitation: async (groupId, inviteId) => {
  return apiWithToast.request(
    studentAPI.rejectGroupInvitation(groupId, inviteId),
    null, // Remove success toast message
    'Failed to reject invitation'
  );
  },

  transferLeadership: async (groupId, data) => {
    return apiWithToast.request(
      studentAPI.transferLeadership(groupId, data),
      'Leadership transferred successfully',
      'Failed to transfer leadership'
    );
  },

  finalizeGroup: async (groupId) => {
    return apiWithToast.request(
      studentAPI.finalizeGroup(groupId),
      'Group finalized successfully',
      'Failed to finalize group',
      true
    );
  },

  // Faculty Preferences
  submitFacultyPreferences: async (projectId, preferences) => {
    return apiWithToast.request(
      studentAPI.submitFacultyPreferences(projectId, preferences),
      'Faculty preferences submitted successfully',
      'Failed to submit preferences'
    );
  },

  // Presentation Scheduling
  schedulePresentation: async (projectId, data) => {
    return apiWithToast.request(
      studentAPI.schedulePresentation(projectId, data),
      'Presentation scheduled successfully',
      'Failed to schedule presentation'
    );
  },

  // Non-toast methods (read-only operations)
  getDashboard: studentAPI.getDashboard,
  getFeatures: studentAPI.getFeatures,
  getProjects: studentAPI.getProjects,
  getGroups: studentAPI.getGroups,
  getMyGroups: studentAPI.getMyGroups,
  getGroupDetails: studentAPI.getGroupDetails,
  getProject: studentAPI.getProject,
  getSem4Status: studentAPI.getSem4Status,
  getSem4Features: studentAPI.getSem4Features,
  getSem5Status: studentAPI.getSem5Status,
  getSem5Dashboard: studentAPI.getSem5Dashboard,
  getFacultyList: studentAPI.getFacultyList,
  getFacultyPreferences: studentAPI.getFacultyPreferences,
  getAvailableStudents: studentAPI.getAvailableStudents,
  getGroupInvitations: studentAPI.getGroupInvitations,
  getUploads: studentAPI.getUploads,
  getProjectUploads: studentAPI.getProjectUploads,
  getProjectUploadsByType: studentAPI.getProjectUploadsByType,
  testStudentLookup: studentAPI.testStudentLookup,
};

// Enhanced Faculty API with toast notifications
export const facultyAPIWithToast = {
  // Project Evaluation
  evaluateProject: async (projectId, data) => {
    return apiWithToast.request(
      facultyAPI.evaluateProject(projectId, data),
      toastMessages.evaluationSubmitted,
      toastMessages.evaluationError,
      true
    );
  },

  updateProject: async (projectId, data) => {
    return apiWithToast.request(
      facultyAPI.updateProject(projectId, data),
      toastMessages.projectUpdated,
      toastMessages.projectError
    );
  },

  // Group Allocation
  chooseGroup: async (groupId) => {
    return apiWithToast.request(
      facultyAPI.chooseGroup(groupId),
      'Group allocated successfully',
      'Failed to allocate group'
    );
  },

  passGroup: async (groupId) => {
    return apiWithToast.request(
      facultyAPI.passGroup(groupId),
      'Group passed successfully',
      'Failed to pass group'
    );
  },

  // Non-toast methods
  getDashboard: facultyAPI.getDashboard,
  getStudents: facultyAPI.getStudents,
  getProjects: facultyAPI.getProjects,
  getGroups: facultyAPI.getGroups,
  getEvaluationAssignments: facultyAPI.getEvaluationAssignments,
  getSem4Students: facultyAPI.getSem4Students,
  getSem4Projects: facultyAPI.getSem4Projects,
  getUnallocatedGroups: facultyAPI.getUnallocatedGroups,
  getAllocatedGroups: facultyAPI.getAllocatedGroups,
  getGroupDetails: facultyAPI.getGroupDetails,
  getSem5Statistics: facultyAPI.getSem5Statistics,
};

// Enhanced Admin API with toast notifications
export const adminAPIWithToast = {
  // Project Management
  updateProjectStatus: async (projectId, data) => {
    return apiWithToast.request(
      adminAPI.updateProjectStatus(projectId, data),
      'Project status updated successfully',
      'Failed to update project status'
    );
  },

  // Evaluation Management
  setEvaluationDates: async (data) => {
    return apiWithToast.request(
      adminAPI.setEvaluationDates(data),
      'Evaluation dates set successfully',
      'Failed to set evaluation dates'
    );
  },

  assignEvaluationPanel: async (data) => {
    return apiWithToast.request(
      adminAPI.assignEvaluationPanel(data),
      'Evaluation panel assigned successfully',
      'Failed to assign evaluation panel'
    );
  },

  // Group Management
  forceAllocateFaculty: async (groupId, facultyId) => {
    return apiWithToast.request(
      adminAPI.forceAllocateFaculty(groupId, facultyId),
      'Faculty allocated successfully',
      'Failed to allocate faculty'
    );
  },

  // System Configuration
  updateSystemConfig: async (config) => {
    return apiWithToast.request(
      adminAPI.updateSystemConfig(config),
      toastMessages.saveSuccess,
      'Failed to update system configuration'
    );
  },

  // Non-toast methods
  getDashboard: adminAPI.getDashboard,
  getUsers: adminAPI.getUsers,
  getStudents: adminAPI.getStudents,
  getFaculty: adminAPI.getFaculty,
  getProjects: adminAPI.getProjects,
  getGroups: adminAPI.getGroups,
  getStats: adminAPI.getStats,
  getSem4Projects: adminAPI.getSem4Projects,
  getEvaluationSchedule: adminAPI.getEvaluationSchedule,
  getSem4Statistics: adminAPI.getSem4Statistics,
  getSem4Registrations: adminAPI.getSem4Registrations,
  getSem5Groups: adminAPI.getSem5Groups,
  getAllGroups: adminAPI.getAllGroups,
  getUnallocatedGroups: adminAPI.getUnallocatedGroups,
  getSystemConfig: adminAPI.getSystemConfig,
  getSem5Statistics: adminAPI.getSem5Statistics,
};

// Export both versions for flexibility
export {
  authAPI,
  studentAPI,
  facultyAPI,
  adminAPI,
  api
};

export default {
  apiWithToast,
  authAPIWithToast,
  studentAPIWithToast,
  facultyAPIWithToast,
  adminAPIWithToast,
};
