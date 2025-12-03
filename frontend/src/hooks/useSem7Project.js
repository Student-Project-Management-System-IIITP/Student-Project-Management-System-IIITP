import { useSem7 } from '../context/Sem7Context';
import { useAuth } from '../context/AuthContext';
import { useGroupManagement } from './useGroupManagement';

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
  
  // Also get isInGroup from useGroupManagement as a fallback
  // This ensures members see updates even if majorProject1Group hasn't refreshed yet
  const { isInGroup: isInGroupFromManagement, group: groupFromManagement } = useGroupManagement();
  
  // Use group from management if majorProject1Group is not available
  // This ensures members see their group even if context hasn't refreshed
  const effectiveMajorProject1Group = majorProject1Group || (groupFromManagement && (groupFromManagement.semester === 7 || groupFromManagement.semester === '7') ? groupFromManagement : null);
  const effectiveIsInGroup = !!effectiveMajorProject1Group || isInGroupFromManagement;

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
           !majorProject1 &&
           (effectiveMajorProject1Group?.status === 'finalized' || effectiveMajorProject1Group?.status === 'locked');
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
  // Use both project data and group data as fallback
  const hasFacultyAllocated = () => {
    if (majorProject1 && majorProject1.faculty) {
      return true;
    }
    // Fallback: Check group's allocatedFaculty
    if (effectiveMajorProject1Group?.allocatedFaculty) {
      return true;
    }
    return false;
  };
  
  // Check if project exists (either loaded or referenced in group)
  const hasProject = () => {
    if (majorProject1) {
      return true;
    }
    // Fallback: If group is locked, it means project is registered
    if (effectiveMajorProject1Group?.status === 'locked' || effectiveMajorProject1Group?.project) {
      return true;
    }
    return false;
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
      if (!effectiveMajorProject1Group) return 'create_group';
      if (effectiveMajorProject1Group.status !== 'finalized' && effectiveMajorProject1Group.status !== 'locked') return 'finalize_group';
      if (!hasProject()) return 'register_major_project1';
      if (!hasFacultyAllocated()) {
        if (majorProject1?.facultyPreferences && majorProject1.facultyPreferences.length > 0) {
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
    if (!effectiveMajorProject1Group) return 'create_group';
    if (effectiveMajorProject1Group.status !== 'finalized' && effectiveMajorProject1Group.status !== 'locked') return 'finalize_group';
    if (!hasProject()) return 'register_major_project1';
    if (!hasFacultyAllocated()) {
      // Check if preferences submitted
      if (majorProject1?.facultyPreferences && majorProject1.facultyPreferences.length > 0) {
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

  // Get Major Project 1 progress steps
  const getMajorProject1ProgressSteps = () => {
    const currentStep = getNextStep();
    const finalizedTrack = getFinalizedTrack();
    const selectedTrack = getSelectedTrack();
    
    const steps = [];
    
    // Only show Major Project 1 steps if coursework track is selected
    if (selectedTrack === 'coursework') {
      steps.push({
        id: 'create_group',
        title: 'Create Group',
        description: 'Form a group for Major Project 1',
        status: effectiveIsInGroup ? 'completed' : (currentStep === 'create_group' ? 'current' : 'upcoming'),
        completed: effectiveIsInGroup
      });
      
      steps.push({
        id: 'finalize_group',
        title: 'Finalize Group',
        description: 'Finalize your group formation',
        status: (effectiveMajorProject1Group?.status === 'finalized' || effectiveMajorProject1Group?.status === 'locked') ? 'completed' : 
                (currentStep === 'finalize_group' ? 'current' : 'upcoming'),
        completed: effectiveMajorProject1Group?.status === 'finalized' || effectiveMajorProject1Group?.status === 'locked'
      });
      
      steps.push({
        id: 'register_major_project1',
        title: 'Register Major Project 1',
        description: 'Register project details and submit faculty preferences',
        status: hasProject() ? 'completed' : (currentStep === 'register_major_project1' ? 'current' : 'upcoming'),
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

  // Get Internship 1 progress steps
  const getInternship1ProgressSteps = () => {
    const steps = [];
    const summerApp = getInternshipApplication('summer');
    const hasSummerApp = !!summerApp;
    const hasProject = !!internship1Project && internship1Project.status !== 'cancelled';
    const isApproved = hasApprovedSummerInternship;
    
    // Determine which path student has chosen
    // If project exists, they chose "project under faculty"
    // If summerApp exists, they chose "already completed"
    // If neither exists, they haven't chosen yet
    
    if (!hasProject && !hasSummerApp) {
      // No choice made yet
      steps.push({
        id: 'choose_internship1_path',
        title: 'Choose Internship 1 Path',
        description: 'Select how you want to complete Internship 1',
        status: 'current',
        completed: false
      });
    } else if (hasProject) {
      // Student chose "project under faculty"
      steps.push({
        id: 'choose_internship1_path',
        title: 'Choose Internship 1 Path',
        description: 'Selected: Project under faculty',
        status: 'completed',
        completed: true
      });
      
      steps.push({
        id: 'register_internship1_project',
        title: 'Register Internship 1 Project',
        description: 'Register project details and submit faculty preferences',
        status: hasProject ? 'completed' : 'current',
        completed: hasProject
      });
      
      steps.push({
        id: 'submit_internship1_faculty_preferences',
        title: 'Submit Faculty Preferences',
        description: 'Select preferred faculty members',
        status: hasProject ? 'completed' : 'current',
        completed: hasProject
      });
      
      steps.push({
        id: 'internship1_faculty_allocated',
        title: 'Faculty Allocated',
        description: internship1Project?.faculty ? 'Faculty guide assigned' : 'Waiting for faculty allocation',
        status: internship1Project?.faculty ? 'completed' : 'upcoming',
        completed: !!internship1Project?.faculty
      });
    } else if (hasSummerApp) {
      // Student chose "already completed"
      steps.push({
        id: 'choose_internship1_path',
        title: 'Choose Internship 1 Path',
        description: 'Selected: Already completed internship',
        status: 'completed',
        completed: true
      });
      
      steps.push({
        id: 'fill_internship1_form',
        title: 'Fill Internship 1 Form',
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
          id: 'update_internship1_form',
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
        // If needs_info, the step above handles it, but we still show this step
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

  // Get progress steps (legacy - kept for backward compatibility)
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
      // Coursework track steps - use Major Project 1 steps
      const majorProject1Steps = getMajorProject1ProgressSteps();
      steps.push(...majorProject1Steps);
      
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
    majorProject1Group: effectiveMajorProject1Group, // Use effective group that includes fallback from useGroupManagement
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
    getMajorProject1ProgressSteps,
    getInternship1ProgressSteps,
    
    // Actions
    setSem7Choice,
    createInternshipApplication,
    updateInternshipApplication,
    registerMajorProject1,
    registerInternship1,
    fetchSem7Data,
  };
};

