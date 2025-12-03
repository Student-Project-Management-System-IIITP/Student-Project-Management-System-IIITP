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
  // Use both project data and group data as fallback
  const hasFacultyAllocated = () => {
    if (majorProject2 && majorProject2.faculty) {
      return true;
    }
    // Fallback: Check group's allocatedFaculty
    if (majorProject2Group?.allocatedFaculty) {
      return true;
    }
    return false;
  };
  
  // Check if project exists (either loaded or referenced in group)
  const hasProject = () => {
    if (majorProject2) {
      return true;
    }
    // Fallback: If group is locked, it means project is registered
    if (majorProject2Group?.status === 'locked' || majorProject2Group?.project) {
      return true;
    }
    return false;
  };

  // Get next step for student
  const getNextStep = () => {
    const studentType = getStudentType();
    const finalizedTrack = getFinalizedTrack();
    const selectedTrack = getSelectedTrack();

    // Type 1 students: Auto-enrolled in coursework (major2)
    if (studentType === 'type1') {
      if (!majorProject2Group) return 'create_group';
      if (majorProject2Group.status !== 'finalized' && majorProject2Group.status !== 'locked') return 'finalize_group';
      if (!hasProject()) return 'register_major_project2';
      if (!hasFacultyAllocated()) {
        if (majorProject2?.facultyPreferences && majorProject2.facultyPreferences.length > 0) {
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
        if (!hasProject()) return 'register_major_project2';
        if (!hasFacultyAllocated()) {
          if (majorProject2?.facultyPreferences && majorProject2.facultyPreferences.length > 0) {
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
      if (!hasProject()) return 'register_major_project2';
      if (!hasFacultyAllocated()) {
        if (majorProject2?.facultyPreferences && majorProject2.facultyPreferences.length > 0) {
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

  // Get Major Project 2 progress steps
  const getMajorProject2ProgressSteps = () => {
    const currentStep = getNextStep();
    const studentType = getStudentType();
    const finalizedTrack = getFinalizedTrack();
    const selectedTrack = getSelectedTrack();
    
    const steps = [];
    
    // Only show Major Project 2 steps if on coursework/major2 track
    const isOnMajor2Track = (studentType === 'type1' && finalizedTrack === 'coursework') || 
                            (studentType === 'type2' && (selectedTrack === 'major2' || finalizedTrack === 'major2'));
    
    if (isOnMajor2Track) {
      // Type 1: Group-based steps
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
          status: (majorProject2Group?.status === 'finalized' || majorProject2Group?.status === 'locked') ? 'completed' : 
                  (currentStep === 'finalize_group' ? 'current' : 'upcoming'),
          completed: majorProject2Group?.status === 'finalized' || majorProject2Group?.status === 'locked'
        });
      }
      
      // Common steps for both Type 1 and Type 2
      steps.push({
        id: 'register_major_project2',
        title: 'Register Major Project 2',
        description: studentType === 'type1' ? 'Register project details and submit faculty preferences' : 'Register solo project details and submit faculty preferences',
        status: hasProject() ? 'completed' : (currentStep === 'register_major_project2' ? 'current' : 'upcoming'),
        completed: hasProject()
      });
      
      steps.push({
        id: 'faculty_allocated',
        title: 'Faculty Allocated',
        description: hasFacultyAllocated() ? 'Faculty guide assigned' : 'Waiting for faculty allocation',
        status: hasFacultyAllocated() ? 'completed' : (currentStep === 'wait_for_faculty_allocation' ? 'current' : 'upcoming'),
        completed: hasFacultyAllocated()
      });
    }
    
    return steps;
  };

  // Get Internship 2 progress steps
  const getInternship2ProgressSteps = () => {
    const steps = [];
    const summerApp = getInternshipApplication('summer');
    const hasSummerApp = !!summerApp;
    const hasProject = !!internship2Project && internship2Project.status !== 'cancelled';
    const isApproved = hasApprovedSummerInternship;
    
    // Only show if eligible
    if (!internship2Status?.eligible) {
      return steps;
    }
    
    // Determine which path student has chosen
    if (!hasProject && !hasSummerApp) {
      // No choice made yet
      steps.push({
        id: 'choose_internship2_path',
        title: 'Choose Internship 2 Path',
        description: 'Select how you want to complete Internship 2',
        status: 'current',
        completed: false
      });
    } else if (hasProject) {
      // Student chose "project under faculty"
      steps.push({
        id: 'choose_internship2_path',
        title: 'Choose Internship 2 Path',
        description: 'Selected: Project under faculty',
        status: 'completed',
        completed: true
      });
      
      steps.push({
        id: 'register_internship2_project',
        title: 'Register Internship 2 Project',
        description: 'Register project details and submit faculty preferences',
        status: hasProject ? 'completed' : 'current',
        completed: hasProject
      });
      
      steps.push({
        id: 'internship2_faculty_allocated',
        title: 'Faculty Allocated',
        description: internship2Project?.faculty ? 'Faculty guide assigned' : 'Waiting for faculty allocation',
        status: internship2Project?.faculty ? 'completed' : 'upcoming',
        completed: !!internship2Project?.faculty
      });
    } else if (hasSummerApp) {
      // Student chose "already completed" (summer internship evidence)
      steps.push({
        id: 'choose_internship2_path',
        title: 'Choose Internship 2 Path',
        description: 'Selected: Summer internship evidence',
        status: 'completed',
        completed: true
      });
      
      steps.push({
        id: 'fill_internship2_form',
        title: 'Fill Internship 2 Form',
        description: summerApp.status === 'needs_info' 
          ? 'Update required - Review admin remarks'
          : summerApp.status === 'approved' || summerApp.status === 'verified_pass'
          ? 'Form submitted and approved'
          : 'Submit internship details and evidence',
        status: hasSummerApp ? 'completed' : 'current',
        completed: hasSummerApp
      });
      
      if (summerApp.status === 'needs_info') {
        steps.push({
          id: 'update_internship2_form',
          title: 'Update Form (Admin Remarks)',
          description: 'Review and address admin feedback',
          status: 'current',
          completed: false
        });
      }
      
      // Determine status description based on admin review
      let statusDescription = 'Waiting for admin review';
      let stepStatus = 'upcoming';
      let stepCompleted = false;
      
      if (summerApp.status === 'submitted') {
        statusDescription = 'Waiting for admin review';
        stepStatus = 'current';
      } else if (summerApp.status === 'pending_verification') {
        statusDescription = 'Pending verification';
        stepStatus = 'current';
      } else if (summerApp.status === 'verified_pass') {
        statusDescription = 'Application verified (pass)';
        stepStatus = 'completed';
        stepCompleted = true;
      } else if (summerApp.status === 'verified_fail') {
        statusDescription = 'Application verified (fail)';
        stepStatus = 'completed';
        stepCompleted = true;
      } else if (summerApp.status === 'absent') {
        statusDescription = 'Absent for verification';
        stepStatus = 'completed';
        stepCompleted = true;
      } else if (summerApp.status === 'needs_info') {
        statusDescription = 'Update required - Review admin remarks';
        stepStatus = 'current';
      }
      
      steps.push({
        id: 'admin_review',
        title: 'Admin Review',
        description: statusDescription,
        status: stepStatus,
        completed: stepCompleted
      });
    }
    
    return steps;
  };

  // Get 6-Month Internship progress steps (Type 2, internship track)
  const getSixMonthInternshipProgressSteps = () => {
    const currentStep = getNextStep();
    const finalizedTrack = getFinalizedTrack();
    const selectedTrack = getSelectedTrack();
    
    const steps = [];
    
    // Only show if on internship track
    if (selectedTrack === 'internship' || finalizedTrack === 'internship') {
      steps.push({
        id: 'choose_track',
        title: 'Choose Track',
        description: finalizedTrack ? 'Track: 6-Month Internship' : 'Select 6-month internship track',
        status: trackChoice ? 'completed' : (currentStep === 'choose_track' ? 'current' : 'upcoming'),
        completed: !!trackChoice
      });
      
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
                  ? 'Pending verification'
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
        id: 'internship_verification',
        title: 'Internship Verification',
        description: isApproved 
          ? 'Internship verified (pass)'
          : sixMonthApp?.status === 'verified_fail' || sixMonthApp?.status === 'absent'
          ? 'Verification failed/absent'
          : sixMonthApp?.status === 'pending_verification'
          ? 'Pending verification'
          : 'Waiting for verification',
        status: isApproved ? 'completed' : 
                (sixMonthApp?.status === 'pending_verification' || sixMonthApp?.status === 'submitted' ? 'current' : 'upcoming'),
        completed: isApproved || sixMonthApp?.status === 'verified_fail' || sixMonthApp?.status === 'absent'
      });
      
      steps.push({
        id: 'internship_active',
        title: 'Internship Active',
        description: 'Complete your 6-month internship',
        status: isApproved ? (currentStep === 'internship_active' ? 'current' : 'completed') : 'upcoming',
        completed: isApproved
      });
    }
    
    return steps;
  };

  // Get progress steps (legacy - kept for backward compatibility)
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
    getMajorProject2ProgressSteps,
    getInternship2ProgressSteps,
    getSixMonthInternshipProgressSteps,
    
    // Actions
    setSem8Choice,
    createInternshipApplication,
    updateInternshipApplication,
    registerMajorProject2,
    registerInternship2,
    fetchSem8Data,
  };
};

