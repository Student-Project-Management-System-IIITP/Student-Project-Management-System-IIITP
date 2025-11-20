import { useSem8 } from '../context/Sem8Context';
import { useAuth } from '../context/AuthContext';

export const useSem8Project = () => {
  const { user, userRole, roleData } = useAuth();
  const {
    sem8Status,
    trackChoice,
    internshipApplications,
    majorProject2,
    majorProject2Group,
    internship2Project,
    internship2Status,
    loading,
    error,
    setSem8Choice,
    createInternshipApplication,
    updateInternshipApplication,
    registerMajorProject2,
    registerInternship2,
    fetchSem8Data,
  } = useSem8();

  // Get student type
  const getStudentType = () => {
    return sem8Status?.studentType || null; // 'type1' | 'type2' | null
  };

  // Determine if student can choose track (Type 2 only)
  const canChooseTrack = () => {
    const effectiveSemester = (roleData?.semester ?? user?.semester);
    const studentType = getStudentType();
    return userRole === 'student' &&
           effectiveSemester === 8 &&
           studentType === 'type2' &&
           !trackChoice?.finalizedTrack;
  };

  // Get finalized track
  const getFinalizedTrack = () => {
    return trackChoice?.finalizedTrack || null;
  };

  // Get currently selected track (finalized takes precedence, else chosen)
  const getSelectedTrack = () => {
    return getFinalizedTrack() || trackChoice?.chosenTrack || null;
  };

  // Get track choice status
  const getTrackChoiceStatus = () => {
    if (!trackChoice) return 'not_submitted';
    return trackChoice.verificationStatus || 'pending';
  };

  // Check if student can register for Major Project 2
  const canRegisterMajorProject2 = () => {
    const selectedTrack = getSelectedTrack();
    const studentType = getStudentType();
    
    if (studentType === 'type1') {
      // Type 1: Must have group and be on major2 track
      return userRole === 'student' &&
             user?.degree === 'B.Tech' &&
             user?.semester === 8 &&
             selectedTrack === 'major2' &&
             majorProject2Group &&
             majorProject2Group.status === 'finalized' &&
             !majorProject2;
    } else if (studentType === 'type2') {
      // Type 2: Solo project, must be on major2 track
      return userRole === 'student' &&
             user?.degree === 'B.Tech' &&
             user?.semester === 8 &&
             selectedTrack === 'major2' &&
             !majorProject2;
    }
    return false;
  };

  // Check if student can register for Internship 2
  const canRegisterInternship2 = () => {
    if (!internship2Status) return false;
    return internship2Status.eligible && !internship2Project;
  };

  // Get internship application status
  const getInternshipApplication = (type) => {
    return internshipApplications?.find(app => app.type === type) || null;
  };

  // Helpers for 6-month application (Type 2 Option A)
  const getSixMonthApp = () => getInternshipApplication('6month');
  const sixMonthStatus = () => getSixMonthApp()?.status || null;
  const hasApprovedSixMonthInternship = () => sixMonthStatus() === 'verified_pass';

  // Check if summer internship application exists and is approved (for Internship 2)
  const hasApprovedSummerInternship = () => {
    const application = getInternshipApplication('summer');
    return application && (application.status === 'approved' || application.status === 'verified_pass');
  };

  // Check if Major Project 2 has faculty allocated
  const hasFacultyAllocated = () => {
    return majorProject2 && 
           (majorProject2.faculty || majorProject2Group?.allocatedFaculty);
  };

  // Get next step for student
  const getNextStep = () => {
    const studentType = getStudentType();
    const finalizedTrack = getFinalizedTrack();
    const selectedTrack = getSelectedTrack();

    // Type 1 students: Auto-enrolled in coursework (major2)
    if (studentType === 'type1') {
      if (!majorProject2Group) return 'create_group';
      if (majorProject2Group.status !== 'finalized') return 'finalize_group';
      if (!majorProject2) return 'register_major_project2';
      if (!hasFacultyAllocated()) {
        if (majorProject2.facultyPreferences && majorProject2.facultyPreferences.length > 0) {
          return 'wait_for_faculty_allocation';
        }
        return 'submit_faculty_preferences';
      }
      if (internship2Status?.eligible && !internship2Project) {
        return 'register_internship2';
      }
      return 'coursework_active';
    }

    // Type 2 students: Need to choose track
    if (studentType === 'type2') {
      if (!trackChoice) return 'choose_track';

      // If not finalized yet, proceed based on chosen track immediately
      if (!finalizedTrack && selectedTrack === 'internship') {
        const sixMonthApp = getInternshipApplication('6month');
        if (!sixMonthApp) return 'submit_6month_application';
        if (sixMonthApp.status === 'needs_info') return 'update_6month_application';
        if (['submitted', 'pending_verification'].includes(sixMonthApp.status)) return 'wait_for_6month_verification';
        if (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') return 'internship_verification_failed';
        if (sixMonthApp.status !== 'verified_pass') return 'wait_for_6month_verification';
        return 'internship_active';
      }

      // Coursework path (major2) - solo project
      if (!finalizedTrack && selectedTrack === 'major2') {
        if (!majorProject2) return 'register_major_project2';
        if (!hasFacultyAllocated()) {
          if (majorProject2.facultyPreferences && majorProject2.facultyPreferences.length > 0) {
            return 'wait_for_faculty_allocation';
          }
          return 'submit_faculty_preferences';
        }
        if (internship2Status?.eligible && !internship2Project) {
          return 'register_internship2';
        }
        return 'coursework_active';
      }

      // Finalized internship track
      if (finalizedTrack === 'internship') {
        const sixMonthApp = getInternshipApplication('6month');
        if (!sixMonthApp) return 'submit_6month_application';
        if (sixMonthApp.status === 'needs_info') return 'update_6month_application';
        if (['submitted', 'pending_verification'].includes(sixMonthApp.status)) return 'wait_for_6month_verification';
        if (sixMonthApp.status === 'verified_fail' || sixMonthApp.status === 'absent') return 'internship_verification_failed';
        if (sixMonthApp.status !== 'verified_pass') return 'wait_for_6month_verification';
        return 'internship_active';
      }
      
      // Finalized coursework track (major2) - solo project
      if (!majorProject2) return 'register_major_project2';
      if (!hasFacultyAllocated()) {
        if (majorProject2.facultyPreferences && majorProject2.facultyPreferences.length > 0) {
          return 'wait_for_faculty_allocation';
        }
        return 'submit_faculty_preferences';
      }
      if (internship2Status?.eligible && !internship2Project) {
        return 'register_internship2';
      }
      return 'coursework_active';
    }

    return 'unknown';
  };

  // Get progress steps
  const getProgressSteps = () => {
    const currentStep = getNextStep();
    const studentType = getStudentType();
    const finalizedTrack = getFinalizedTrack();
    const selectedTrack = getSelectedTrack();
    
    const steps = [];
    
    // Type 1 students: Auto-enrolled, no track selection step
    if (studentType === 'type1') {
      steps.push({
        id: 'create_group',
        title: 'Create Group',
        description: 'Form a group for Major Project 2',
        status: majorProject2Group ? 'completed' : (currentStep === 'create_group' ? 'current' : 'upcoming'),
        completed: !!majorProject2Group
      });
      
      steps.push({
        id: 'finalize_group',
        title: 'Finalize Group',
        description: 'Finalize your group formation',
        status: majorProject2Group?.status === 'finalized' ? 'completed' : 
                (currentStep === 'finalize_group' ? 'current' : 'upcoming'),
        completed: majorProject2Group?.status === 'finalized'
      });
      
      steps.push({
        id: 'register_major_project2',
        title: 'Register Major Project 2',
        description: 'Register project details and submit faculty preferences',
        status: majorProject2 ? 'completed' : (currentStep === 'register_major_project2' ? 'current' : 'upcoming'),
        completed: !!majorProject2
      });
      
      steps.push({
        id: 'submit_faculty_preferences',
        title: 'Submit Faculty Preferences',
        description: 'Select preferred faculty members',
        status: hasFacultyAllocated() ? 'completed' : 
                (currentStep === 'submit_faculty_preferences' ? 'current' : 'upcoming'),
        completed: hasFacultyAllocated()
      });
      
      // Internship 2 step (if eligible)
      if (internship2Status?.eligible) {
        steps.push({
          id: 'register_internship2',
          title: 'Register Internship 2',
          description: 'Register for solo internship project or submit summer internship evidence',
          status: internship2Project ? 'completed' : 
                  (currentStep === 'register_internship2' ? 'current' : 'upcoming'),
          completed: !!internship2Project
        });
      }
      
      steps.push({
        id: 'coursework_active',
        title: 'Coursework Active',
        description: 'Continue with Major Project 2 and Internship 2',
        status: hasFacultyAllocated() ? (currentStep === 'coursework_active' ? 'current' : 'completed') : 'upcoming',
        completed: hasFacultyAllocated()
      });
    } else if (studentType === 'type2') {
      // Type 2 students: Track selection step
      steps.push({
        id: 'choose_track',
        title: 'Choose Track',
        description: finalizedTrack ? `Track: ${finalizedTrack === 'internship' ? '6-Month Internship' : 'Major Project 2'}` : 'Select 6-month internship or Major Project 2',
        status: trackChoice ? 'completed' : (currentStep === 'choose_track' ? 'current' : 'upcoming'),
        completed: !!trackChoice
      });
      
      if (selectedTrack === 'internship') {
        // Internship track steps
        const sixMonthApp = getSixMonthApp();
        const hasApplication = !!sixMonthApp;
        const isApproved = hasApprovedSixMonthInternship();
        
        steps.push({
          id: 'submit_6month_application',
          title: 'Submit 6-Month Internship Application',
          description: hasApplication 
            ? (isApproved 
                ? 'Application verified (pass)'
                : sixMonthApp.status === 'needs_info' 
                  ? 'Update required'
                  : sixMonthApp.status === 'pending_verification' 
                    ? 'Pending end-of-sem verification'
                    : sixMonthApp.status === 'submitted'
                      ? 'Application submitted'
                      : sixMonthApp.status === 'verified_fail'
                        ? 'Verification failed'
                        : sixMonthApp.status === 'absent'
                          ? 'Absent for verification'
                          : 'Application status updated')
            : 'Submit company details and offer letter',
          status: hasApplication ? 'completed' : 
                  (currentStep === 'submit_6month_application' || currentStep === 'update_6month_application' ? 'current' : 'upcoming'),
          completed: hasApplication
        });
        
        steps.push({
          id: 'internship_active',
          title: 'Internship Active',
          description: 'Complete your 6-month internship',
          status: isApproved ? (currentStep === 'internship_active' ? 'current' : 'completed') : 'upcoming',
          completed: isApproved
        });
      } else if (selectedTrack === 'major2') {
        // Coursework track steps (solo Major Project 2)
        steps.push({
          id: 'register_major_project2',
          title: 'Register Major Project 2',
          description: 'Register solo project details and submit faculty preferences',
          status: majorProject2 ? 'completed' : (currentStep === 'register_major_project2' ? 'current' : 'upcoming'),
          completed: !!majorProject2
        });
        
        steps.push({
          id: 'submit_faculty_preferences',
          title: 'Submit Faculty Preferences',
          description: 'Select preferred faculty members',
          status: hasFacultyAllocated() ? 'completed' : 
                  (currentStep === 'submit_faculty_preferences' ? 'current' : 'upcoming'),
          completed: hasFacultyAllocated()
        });
        
        // Internship 2 step (if eligible)
        if (internship2Status?.eligible) {
          steps.push({
            id: 'register_internship2',
            title: 'Register Internship 2',
            description: 'Register for solo internship project or submit summer internship evidence',
            status: internship2Project ? 'completed' : 
                    (currentStep === 'register_internship2' ? 'current' : 'upcoming'),
            completed: !!internship2Project
          });
        }
        
        steps.push({
          id: 'coursework_active',
          title: 'Coursework Active',
          description: 'Continue with Major Project 2 and Internship 2',
          status: hasFacultyAllocated() ? (currentStep === 'coursework_active' ? 'current' : 'completed') : 'upcoming',
          completed: hasFacultyAllocated()
        });
      }
    }
    
    return steps;
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    const steps = getProgressSteps();
    const completedSteps = steps.filter(s => s.completed).length;
    return steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
  };

  return {
    // State
    sem8Status,
    trackChoice,
    internshipApplications,
    majorProject2,
    majorProject2Group,
    internship2Project,
    internship2Status,
    loading,
    error,
    
    // Computed values
    studentType: getStudentType(),
    isType1: getStudentType() === 'type1',
    isType2: getStudentType() === 'type2',
    canChooseTrack: canChooseTrack(),
    finalizedTrack: getFinalizedTrack(),
    trackChoiceStatus: getTrackChoiceStatus(),
    canRegisterMajorProject2: canRegisterMajorProject2(),
    canRegisterInternship2: canRegisterInternship2(),
    hasApprovedSixMonthInternship: hasApprovedSixMonthInternship(),
    hasApprovedSummerInternship: hasApprovedSummerInternship(),
    hasFacultyAllocated: hasFacultyAllocated(),
    getInternshipApplication,
    getNextStep,
    getProgressSteps,
    getProgressPercentage,
    
    // Actions
    setSem8Choice,
    createInternshipApplication,
    updateInternshipApplication,
    registerMajorProject2,
    registerInternship2,
    fetchSem8Data,
  };
};

