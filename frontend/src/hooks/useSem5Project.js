import { useSem5 } from '../context/Sem5Context';
import { useAuth } from '../context/AuthContext';

export const useSem5Project = () => {
  const { user, userRole } = useAuth();
  const {
    sem5Project,
    loading,
    error,
    registerMinorProject2,
    submitFacultyPreferences,
    fetchSem5Data,
  } = useSem5();

  // Determine if student can register for Minor Project 2
  const canRegisterProject = 
    userRole === 'student' &&
    user?.degree === 'B.Tech' &&
    user?.semester === 5 &&
    !sem5Project;

  // Determine if student can submit faculty preferences
  const canSubmitPreferences = 
    userRole === 'student' &&
    sem5Project &&
    sem5Project.status !== 'completed' &&
    sem5Project.status !== 'cancelled';

  // Determine if student has completed project registration
  const hasRegisteredProject = !!sem5Project;

  // Get project status
  const getProjectStatus = () => {
    if (!sem5Project) return 'not_registered';
    return sem5Project.status || 'registered';
  };

  // Check if project is ready for faculty preferences
  const isReadyForPreferences = () => {
    return sem5Project && 
           sem5Project.status === 'registered' &&
           sem5Project.group && 
           sem5Project.group.status === 'complete';
  };

  // Check if project has faculty allocated
  const hasFacultyAllocated = () => {
    return sem5Project && 
           (sem5Project.faculty || sem5Project.group?.allocatedFaculty);
  };

  // Get next step for student
  const getNextStep = () => {
    if (!sem5Project) return 'register_project';
    if (!sem5Project.group) return 'create_group';
    if (sem5Project.group.status !== 'complete') return 'complete_group';
    if (!isReadyForPreferences()) return 'wait_for_group';
    if (!hasFacultyAllocated()) return 'submit_preferences';
    return 'project_active';
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    const steps = [
      'register_project',
      'create_group', 
      'complete_group',
      'submit_preferences',
      'project_active'
    ];
    
    const currentStep = getNextStep();
    const currentIndex = steps.indexOf(currentStep);
    
    return Math.round((currentIndex / steps.length) * 100);
  };

  // Get progress steps with status
  const getProgressSteps = () => {
    const currentStep = getNextStep();
    
    // Check if project is registered but waiting for faculty allocation
    const isWaitingForFaculty = sem5Project && 
                                sem5Project.status === 'registered' && 
                                !hasFacultyAllocated();
    
    return [
      {
        id: 'register_project',
        title: 'Register Minor Project 2',
        description: isWaitingForFaculty 
          ? 'Project registered - Waiting for faculty allocation' 
          : 'Register for Minor Project 2',
        status: sem5Project ? 'completed' : (currentStep === 'register_project' ? 'current' : 'upcoming'),
        completed: !!sem5Project,
        showWaitingMessage: isWaitingForFaculty
      },
      {
        id: 'create_group',
        title: 'Create Group',
        description: 'Form a group with other students',
        status: sem5Project?.group ? 'completed' : (currentStep === 'create_group' ? 'current' : 'upcoming'),
        completed: !!sem5Project?.group
      },
      {
        id: 'complete_group',
        title: 'Complete Group Formation',
        description: 'Add members and finalize group',
        status: sem5Project?.group?.status === 'complete' ? 'completed' : (currentStep === 'complete_group' ? 'current' : 'upcoming'),
        completed: sem5Project?.group?.status === 'complete'
      },
      {
        id: 'submit_preferences',
        title: 'Submit Faculty Preferences',
        description: 'Select preferred faculty members',
        status: isReadyForPreferences() ? (hasFacultyAllocated() ? 'completed' : (currentStep === 'submit_preferences' ? 'current' : 'upcoming')) : 'upcoming',
        completed: hasFacultyAllocated()
      },
      {
        id: 'project_active',
        title: 'Start Project Work',
        description: 'Begin working on your Minor Project 2',
        status: hasFacultyAllocated() ? (currentStep === 'project_active' ? 'current' : 'completed') : 'upcoming',
        completed: hasFacultyAllocated()
      }
    ];
  };

  return {
    sem5Project,
    loading,
    error,
    canRegisterProject,
    canSubmitPreferences,
    hasRegisteredProject,
    getProjectStatus,
    isReadyForPreferences,
    hasFacultyAllocated,
    getNextStep,
    getProgressPercentage,
    getProgressSteps,
    registerMinorProject2,
    submitFacultyPreferences,
    fetchSem5Data,
  };
};
