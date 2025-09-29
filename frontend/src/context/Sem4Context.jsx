import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { studentAPI } from '../utils/api';

// Initial state
const initialState = {
  // Student data
  student: null,
  loading: false,
  error: null,
  
  // Sem 4 project data
  project: null,
  projectLoading: false,
  projectError: null,
  
  // Evaluation schedule
  evaluationSchedule: null,
  evaluationLoading: false,
  evaluationError: null,
  
  // PPT upload
  pptUpload: {
    uploading: false,
    progress: 0,
    status: null,
    error: null,
  },
  
  // Dashboard data
  dashboardData: null,
  dashboardLoading: false,
  dashboardError: null,
};

// Action types
const ActionTypes = {
  // General
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Student data
  SET_STUDENT: 'SET_STUDENT',
  
  // Project data
  SET_PROJECT: 'SET_PROJECT',
  SET_PROJECT_LOADING: 'SET_PROJECT_LOADING',
  SET_PROJECT_ERROR: 'SET_PROJECT_ERROR',
  UPDATE_PROJECT: 'UPDATE_PROJECT',
  
  // Evaluation schedule
  SET_EVALUATION_SCHEDULE: 'SET_EVALUATION_SCHEDULE',
  SET_EVALUATION_LOADING: 'SET_EVALUATION_LOADING',
  SET_EVALUATION_ERROR: 'SET_EVALUATION_ERROR',
  
  // PPT upload
  SET_PPT_UPLOADING: 'SET_PPT_UPLOADING',
  SET_PPT_PROGRESS: 'SET_PPT_PROGRESS',
  SET_PPT_STATUS: 'SET_PPT_STATUS',
  SET_PPT_ERROR: 'SET_PPT_ERROR',
  RESET_PPT_UPLOAD: 'RESET_PPT_UPLOAD',
  
  // Dashboard
  SET_DASHBOARD_DATA: 'SET_DASHBOARD_DATA',
  SET_DASHBOARD_LOADING: 'SET_DASHBOARD_LOADING',
  SET_DASHBOARD_ERROR: 'SET_DASHBOARD_ERROR',
};

// Reducer
const sem4Reducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    
    case ActionTypes.SET_STUDENT:
      return { ...state, student: action.payload };
    
    case ActionTypes.SET_PROJECT:
      return { ...state, project: action.payload };
    
    case ActionTypes.SET_PROJECT_LOADING:
      return { ...state, projectLoading: action.payload };
    
    case ActionTypes.SET_PROJECT_ERROR:
      return { ...state, projectError: action.payload };
    
    case ActionTypes.UPDATE_PROJECT:
      return { ...state, project: { ...state.project, ...action.payload } };
    
    case ActionTypes.SET_EVALUATION_SCHEDULE:
      return { ...state, evaluationSchedule: action.payload };
    
    case ActionTypes.SET_EVALUATION_LOADING:
      return { ...state, evaluationLoading: action.payload };
    
    case ActionTypes.SET_EVALUATION_ERROR:
      return { ...state, evaluationError: action.payload };
    
    case ActionTypes.SET_PPT_UPLOADING:
      return { 
        ...state, 
        pptUpload: { ...state.pptUpload, uploading: action.payload }
      };
    
    case ActionTypes.SET_PPT_PROGRESS:
      return { 
        ...state, 
        pptUpload: { ...state.pptUpload, progress: action.payload }
      };
    
    case ActionTypes.SET_PPT_STATUS:
      return { 
        ...state, 
        pptUpload: { ...state.pptUpload, status: action.payload }
      };
    
    case ActionTypes.SET_PPT_ERROR:
      return { 
        ...state, 
        pptUpload: { ...state.pptUpload, error: action.payload }
      };
    
    case ActionTypes.RESET_PPT_UPLOAD:
      return { 
        ...state, 
        pptUpload: {
          uploading: false,
          progress: 0,
          status: null,
          error: null,
        }
      };
    
    case ActionTypes.SET_DASHBOARD_DATA:
      return { ...state, dashboardData: action.payload };
    
    case ActionTypes.SET_DASHBOARD_LOADING:
      return { ...state, dashboardLoading: action.payload };
    
    case ActionTypes.SET_DASHBOARD_ERROR:
      return { ...state, dashboardError: action.payload };
    
    default:
      return state;
  }
};

// Context
const Sem4Context = createContext();

// Provider component
export const Sem4Provider = ({ children }) => {
  const [state, dispatch] = useReducer(sem4Reducer, initialState);

  // Actions
  const actions = {
    // Load dashboard data
    loadDashboardData: async () => {
      dispatch({ type: ActionTypes.SET_DASHBOARD_LOADING, payload: true });
      try {
        const data = await studentAPI.getDashboard();
        dispatch({ type: ActionTypes.SET_DASHBOARD_DATA, payload: data });
      } catch (error) {
        dispatch({ type: ActionTypes.SET_DASHBOARD_ERROR, payload: error.message });
      } finally {
        dispatch({ type: ActionTypes.SET_DASHBOARD_LOADING, payload: false });
      }
    },

    // Load Sem 4 project
    loadProject: async () => {
      dispatch({ type: ActionTypes.SET_PROJECT_LOADING, payload: true });
      try {
        // First get all projects and find Sem 4 project
        const response = await studentAPI.getProjects();
        const projects = response.data || []; // Extract projects array from response
        const sem4Project = projects.find(p => p.semester === 4 && p.projectType === 'minor1');
        dispatch({ type: ActionTypes.SET_PROJECT, payload: sem4Project });
      } catch (error) {
        dispatch({ type: ActionTypes.SET_PROJECT_ERROR, payload: error.message });
      } finally {
        dispatch({ type: ActionTypes.SET_PROJECT_LOADING, payload: false });
      }
    },

    // Load evaluation schedule
    loadEvaluationSchedule: async () => {
      dispatch({ type: ActionTypes.SET_EVALUATION_LOADING, payload: true });
      try {
        // This would be implemented when admin sets evaluation schedule
        // For now, return null
        dispatch({ type: ActionTypes.SET_EVALUATION_SCHEDULE, payload: null });
      } catch (error) {
        dispatch({ type: ActionTypes.SET_EVALUATION_ERROR, payload: error.message });
      } finally {
        dispatch({ type: ActionTypes.SET_EVALUATION_LOADING, payload: false });
      }
    },

    // Register project
    registerProject: async (projectData) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      try {
        const result = await studentAPI.registerProject(projectData);
        dispatch({ type: ActionTypes.SET_PROJECT, payload: result.data });
        return result;
      } catch (error) {
        dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
    },

    // Upload PPT
    uploadPPT: async (projectId, file) => {
      dispatch({ type: ActionTypes.SET_PPT_UPLOADING, payload: true });
      dispatch({ type: ActionTypes.SET_PPT_PROGRESS, payload: 0 });
      
      try {
        const formData = new FormData();
        formData.append('ppt', file);
        
        const result = await studentAPI.uploadPPT(projectId, formData);
        
        dispatch({ type: ActionTypes.SET_PPT_STATUS, payload: 'success' });
        dispatch({ type: ActionTypes.UPDATE_PROJECT, payload: result.data });
        
        return result;
      } catch (error) {
        dispatch({ type: ActionTypes.SET_PPT_ERROR, payload: error.message });
        dispatch({ type: ActionTypes.SET_PPT_STATUS, payload: 'error' });
        throw error;
      } finally {
        dispatch({ type: ActionTypes.SET_PPT_UPLOADING, payload: false });
      }
    },

    // Update PPT progress
    updatePPTProgress: (progress) => {
      dispatch({ type: ActionTypes.SET_PPT_PROGRESS, payload: progress });
    },

    // Reset PPT upload state
    resetPPTUpload: () => {
      dispatch({ type: ActionTypes.RESET_PPT_UPLOAD });
    },

    // Clear errors
    clearError: () => {
      dispatch({ type: ActionTypes.CLEAR_ERROR });
    },

    clearProjectError: () => {
      dispatch({ type: ActionTypes.SET_PROJECT_ERROR, payload: null });
    },

    clearEvaluationError: () => {
      dispatch({ type: ActionTypes.SET_EVALUATION_ERROR, payload: null });
    },
  };

  // Load initial data
  useEffect(() => {
    actions.loadDashboardData();
    actions.loadProject();
    actions.loadEvaluationSchedule();
  }, []);

  const value = {
    state,
    actions,
  };

  return (
    <Sem4Context.Provider value={value}>
      {children}
    </Sem4Context.Provider>
  );
};

// Hook to use Sem4 context
export const useSem4 = () => {
  const context = useContext(Sem4Context);
  if (!context) {
    throw new Error('useSem4 must be used within a Sem4Provider');
  }
  return context;
};

export default Sem4Context;
