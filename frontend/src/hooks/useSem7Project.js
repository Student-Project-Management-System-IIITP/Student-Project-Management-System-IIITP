import { useSem7 } from '../context/Sem7Context';
import { useAuth } from '../context/AuthContext';

export const useSem7Project = () => {
  const { user, userRole, roleData } = useAuth();
  const {
    trackChoice,
    internshipApplications,
    majorProject1,
    majorProject1Group,
    internship1Project,
    internship1Status,
    loading,
    error,
    setSem7Choice,
    createInternshipApplication,
    updateInternshipApplication,
    registerMajorProject1,
    registerInternship1,
    fetchSem7Data,
  } = useSem7();

  // Determine if student can choose track (do not restrict by degree)
  const canChooseTrack = () => {
    const effectiveSemester = (roleData?.semester ?? user?.semester);
    return userRole === 'student' &&
           effectiveSemester === 7 &&
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

  // Check if student can register for Major Project 1
  const canRegisterMajorProject1 = () => {
    const selectedTrack = getSelectedTrack();
    return userRole === 'student' &&
           user?.degree === 'B.Tech' &&
           user?.semester === 7 &&
           selectedTrack === 'coursework' &&
           !majorProject1;
  };

  // Check if student can register for Internship 1
  const canRegisterInternship1 = () => {
    if (!internship1Status) return false;
    return internship1Status.eligible && !internship1Project;
  };

  // Get internship application status
  const getInternshipApplication = (type) => {
    return internshipApplications?.find(app => app.type === type) || null;
  };

  // Helpers for 6-month application new statuses
  const getSixMonthApp = () => getInternshipApplication('6month');
  const sixMonthStatus = () => getSixMonthApp()?.status || null; // submitted | needs_info | pending_verification | verified_pass | verified_fail | absent
  const hasApprovedSixMonthInternship = () => sixMonthStatus() === 'verified_pass';

  // Check if summer internship application exists and is approved
  // Support both 'approved' and 'verified_pass' statuses
  const hasApprovedSummerInternship = () => {
    const application = getInternshipApplication('summer');
    return application && (application.status === 'approved' || application.status === 'verified_pass');
  };

  // Check if Major Project 1 has faculty allocated
  const hasFacultyAllocated = () => {
    return majorProject1 && 
           (majorProject1.faculty || majorProject1Group?.allocatedFaculty);
  };

  // Get next step for student
  const getNextStep = () => {
    const finalizedTrack = getFinalizedTrack();
    const selectedTrack = getSelectedTrack();

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

    // Coursework path even before finalization
    if (!finalizedTrack && selectedTrack === 'coursework') {
      if (!majorProject1Group) return 'create_group';
      if (majorProject1Group.status !== 'finalized') return 'finalize_group';
      if (!majorProject1) return 'register_major_project1';
      if (!hasFacultyAllocated()) {
        if (majorProject1.facultyPreferences && majorProject1.facultyPreferences.length > 0) {
          return 'wait_for_faculty_allocation';
        }
        return 'submit_faculty_preferences';
      }
      if (internship1Status?.eligible && !internship1Project) {
        return 'register_internship1';
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
    
    // Finalized coursework track
    if (!majorProject1Group) return 'create_group';
    if (majorProject1Group.status !== 'finalized') return 'finalize_group';
    if (!majorProject1) return 'register_major_project1';
    if (!hasFacultyAllocated()) {
      // Check if preferences submitted
      if (majorProject1.facultyPreferences && majorProject1.facultyPreferences.length > 0) {
        return 'wait_for_faculty_allocation';
      }
      return 'submit_faculty_preferences';
    }
    
    // Check Internship 1
    if (internship1Status?.eligible && !internship1Project) {
      if (!hasFacultyAllocated()) {
        return 'register_internship1';
      }
    }
    
    return 'coursework_active';
  };

  // Get progress steps
  const getProgressSteps = () => {
    const currentStep = getNextStep();
    const finalizedTrack = getFinalizedTrack();
    const selectedTrack = getSelectedTrack();
    
    const steps = [];
    
    // Step 1: Choose Track
    steps.push({
      id: 'choose_track',
      title: 'Choose Track',
      description: finalizedTrack ? `Track: ${finalizedTrack === 'internship' ? '6-Month Internship' : 'Coursework'}` : 'Select internship or coursework',
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
    } else if (selectedTrack === 'coursework') {
      // Coursework track steps
      steps.push({
        id: 'create_group',
        title: 'Create Group',
        description: 'Form a group for Major Project 1',
        status: majorProject1Group ? 'completed' : (currentStep === 'create_group' ? 'current' : 'upcoming'),
        completed: !!majorProject1Group
      });
      
      steps.push({
        id: 'finalize_group',
        title: 'Finalize Group',
        description: 'Finalize your group formation',
        status: majorProject1Group?.status === 'finalized' ? 'completed' : 
                (currentStep === 'finalize_group' ? 'current' : 'upcoming'),
        completed: majorProject1Group?.status === 'finalized'
      });
      
      steps.push({
        id: 'register_major_project1',
        title: 'Register Major Project 1',
        description: 'Register project details and submit faculty preferences',
        status: majorProject1 ? 'completed' : (currentStep === 'register_major_project1' ? 'current' : 'upcoming'),
        completed: !!majorProject1
      });
      
      steps.push({
        id: 'submit_faculty_preferences',
        title: 'Submit Faculty Preferences',
        description: 'Select preferred faculty members',
        status: hasFacultyAllocated() ? 'completed' : 
                (currentStep === 'submit_faculty_preferences' ? 'current' : 'upcoming'),
        completed: hasFacultyAllocated()
      });
      
      // Internship 1 step (if eligible)
      if (internship1Status?.eligible) {
        steps.push({
          id: 'register_internship1',
          title: 'Register Internship 1',
          description: 'Register for solo internship project',
          status: internship1Project ? 'completed' : 
                  (currentStep === 'register_internship1' ? 'current' : 'upcoming'),
          completed: !!internship1Project
        });
      }
      
      steps.push({
        id: 'coursework_active',
        title: 'Coursework Active',
        description: 'Continue with Major Project 1 and Internship 1',
        status: hasFacultyAllocated() ? (currentStep === 'coursework_active' ? 'current' : 'completed') : 'upcoming',
        completed: hasFacultyAllocated()
      });
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
    trackChoice,
    internshipApplications,
    majorProject1,
    majorProject1Group,
    internship1Project,
    internship1Status,
    loading,
    error,
    
    // Computed values
    canChooseTrack: canChooseTrack(),
    finalizedTrack: getFinalizedTrack(),
    trackChoiceStatus: getTrackChoiceStatus(),
    canRegisterMajorProject1: canRegisterMajorProject1(),
    canRegisterInternship1: canRegisterInternship1(),
    hasApprovedSixMonthInternship: hasApprovedSixMonthInternship(),
    hasApprovedSummerInternship: hasApprovedSummerInternship(),
    hasFacultyAllocated: hasFacultyAllocated(),
    getInternshipApplication,
    getNextStep,
    getProgressSteps,
    getProgressPercentage,
    
    // Actions
    setSem7Choice,
    createInternshipApplication,
    updateInternshipApplication,
    registerMajorProject1,
    registerInternship1,
    fetchSem7Data,
  };
};

