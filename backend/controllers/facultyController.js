const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const Project = require('../models/Project');
const Group = require('../models/Group');
const FacultyPreference = require('../models/FacultyPreference');
const FacultyNotification = require('../models/FacultyNotification');
const SystemConfig = require('../models/SystemConfig');
const { sendEmail } = require('../services/emailService');

const sortPreferences = (preferences = []) => {
  return [...preferences].sort((a, b) => (a.priority || 0) - (b.priority || 0));
};

const getMTechSem3PendingProjects = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({ user: req.user.id });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const projects = await Project.find({
      projectType: 'major1',
      semester: 3,
      faculty: null,
      status: { $in: ['registered', 'pending_admin_allocation'] },
      'facultyPreferences.0': { $exists: true }
    })
      .populate('student', 'fullName misNumber collegeEmail degree branch')
      .populate('facultyPreferences.faculty', 'fullName department designation');

    const pending = projects
      .map(project => {
        if (!project.student || project.student.degree !== 'M.Tech') return null;
        const sortedPrefs = sortPreferences(project.facultyPreferences || []);
        const currentIndex = project.currentFacultyIndex || 0;
        if (currentIndex >= sortedPrefs.length) return null;
        const currentPref = sortedPrefs[currentIndex];
        if (!currentPref || currentPref.faculty.toString() !== faculty._id.toString()) return null;
        return {
          _id: project._id,
          title: project.title,
          domain: project.domain,
          summary: project.description,
          student: project.student,
          priority: currentPref.priority || currentIndex + 1,
          totalPreferences: sortedPrefs.length,
          submittedAt: project.createdAt,
          academicYear: project.academicYear
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: pending
    });
  } catch (error) {
    console.error('Error fetching Sem 3 pending projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load pending projects'
    });
  }
};

const chooseMTechSem3Project = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({ user: req.user.id });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const { projectId } = req.params;
    const project = await Project.findById(projectId)
      .populate('student', 'degree');

    if (!project || project.projectType !== 'major1' || project.semester !== 3) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.student || project.student.degree !== 'M.Tech') {
      return res.status(400).json({
        success: false,
        message: 'Only M.Tech Sem 3 projects can be allocated here'
      });
    }

    const sortedPrefs = sortPreferences(project.facultyPreferences || []);
    const currentIndex = project.currentFacultyIndex || 0;
    if (currentIndex >= sortedPrefs.length) {
      return res.status(400).json({
        success: false,
        message: 'No more faculty preferences available for this project'
      });
    }

    const currentPref = sortedPrefs[currentIndex];
    if (currentPref.faculty.toString() !== faculty._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This project is not currently assigned to you for allocation'
      });
    }

    project.faculty = faculty._id;
    project.status = 'faculty_allocated';
    project.allocatedBy = 'faculty_choice';
    project.currentFacultyIndex = currentIndex;
    await project.save();

    await FacultyPreference.findOneAndUpdate(
      { project: project._id, semester: 3 },
      {
        status: 'allocated',
        allocatedFaculty: faculty._id,
        allocatedBy: 'faculty_choice',
        allocatedAt: new Date(),
        currentFacultyIndex: currentIndex
      }
    );

    res.json({
      success: true,
      message: 'Project allocated successfully'
    });
  } catch (error) {
    console.error('Error choosing Sem 3 project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to allocate project'
    });
  }
};

const passMTechSem3Project = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({ user: req.user.id });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const { projectId } = req.params;
    const project = await Project.findById(projectId)
      .populate('student', 'degree');

    if (!project || project.projectType !== 'major1' || project.semester !== 3) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.student || project.student.degree !== 'M.Tech') {
      return res.status(400).json({
        success: false,
        message: 'Only M.Tech Sem 3 projects can be processed here'
      });
    }

    const sortedPrefs = sortPreferences(project.facultyPreferences || []);
    const currentIndex = project.currentFacultyIndex || 0;
    if (currentIndex >= sortedPrefs.length) {
      return res.status(400).json({
        success: false,
        message: 'No more faculty preferences available for this project'
      });
    }

    const currentPref = sortedPrefs[currentIndex];
    if (currentPref.faculty.toString() !== faculty._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This project is not currently assigned to you for allocation'
      });
    }

    // Use project's facultyPass method to properly handle allocation history
    try {
      await project.facultyPass(faculty._id, '');
    } catch (passError) {
      // If facultyPass fails, manually update
      console.error('Error using facultyPass method:', passError);
      // Add to allocation history
      if (!project.allocationHistory) {
        project.allocationHistory = [];
      }
      project.allocationHistory.push({
        faculty: faculty._id,
        priority: currentPref.priority || (currentIndex + 1),
        action: 'passed',
        timestamp: new Date()
      });
      project.currentFacultyIndex = currentIndex + 1;
      await project.save();
    }

    const nextIndex = project.currentFacultyIndex || (currentIndex + 1);
    
    if (nextIndex >= sortedPrefs.length) {
      project.status = 'pending_admin_allocation';
      await project.save();
      await FacultyPreference.findOneAndUpdate(
        { project: project._id, semester: 3 },
        {
          currentFacultyIndex: nextIndex,
          status: 'pending'
        }
      );
      return res.json({
        success: true,
        message: 'All preferences exhausted. Project sent to admin for allocation.'
      });
    }

    // Update FacultyPreference index
    await FacultyPreference.findOneAndUpdate(
      { project: project._id, semester: 3 },
      { currentFacultyIndex: nextIndex }
    );

    // Present to next faculty
    try {
      await project.presentToCurrentFaculty();
    } catch (presentError) {
      console.error('Error presenting to next faculty:', presentError);
      // Don't fail the request if presentation fails
    }

    res.json({
      success: true,
      message: 'Project passed to next faculty preference'
    });
  } catch (error) {
    console.error('Error passing Sem 3 project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pass project'
    });
  }
};

// Get faculty dashboard data
const getDashboardData = async (req, res) => {
  try {
    const facultyId = req.user.id;
    
    // Get faculty details
    const faculty = await Faculty.findOne({ user: facultyId })
      .populate('user', 'email role isActive lastLogin');

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Get faculty's assigned projects
    const assignedProjects = await Project.find({ 
      faculty: faculty._id,
      status: { $in: ['faculty_allocated', 'active', 'completed'] }
    })
    .populate('student', 'fullName misNumber collegeEmail semester degree branch')
    .populate('group', 'name members')
    .sort({ createdAt: -1 });

    // Get faculty's assigned groups
    const assignedGroups = await Group.find({ 
      allocatedFaculty: faculty._id,
      isActive: true
    })
    .populate('members.student', 'fullName misNumber collegeEmail')
    .populate('project', 'title description projectType status')
    .sort({ createdAt: -1 });

    // Get pending allocation requests
    const pendingAllocations = await FacultyPreference.find({
      'preferences.faculty': faculty._id,
      status: 'pending'
    })
    .populate('student', 'fullName misNumber collegeEmail semester degree branch')
    .populate('project', 'title description projectType')
    .populate('group', 'name members')
    .sort({ createdAt: 1 });

    // Get faculty statistics
    const stats = {
      totalProjects: assignedProjects.length,
      activeProjects: assignedProjects.filter(p => p.status === 'active').length,
      completedProjects: assignedProjects.filter(p => p.status === 'completed').length,
      totalGroups: assignedGroups.length,
      pendingAllocations: pendingAllocations.length,
      totalStudents: [...new Set(assignedProjects.map(p => p.student._id.toString()))].length
    };

    res.json({
      success: true,
      data: {
        faculty,
        assignedProjects,
        assignedGroups,
        pendingAllocations,
        stats
      }
    });
  } catch (error) {
    console.error('Error getting faculty dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// Get faculty's students
const getFacultyStudents = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { semester, status } = req.query;
    
    // Get faculty
    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Build query for projects assigned to this faculty
    const projectQuery = { faculty: faculty._id };
    if (semester) {
      projectQuery.semester = parseInt(semester);
    }
    if (status) {
      projectQuery.status = status;
    }

    // Get projects with students
    const projects = await Project.find(projectQuery)
      .populate('student', 'fullName misNumber collegeEmail semester degree branch')
      .populate('group', 'name members')
      .sort({ createdAt: -1 });

    // Extract unique students
    const students = projects.map(project => ({
      ...project.student.toObject(),
      project: {
        id: project._id,
        title: project.title,
        projectType: project.projectType,
        status: project.status,
        semester: project.semester
      }
    }));

    // Remove duplicates
    const uniqueStudents = students.filter((student, index, self) => 
      index === self.findIndex(s => s._id.toString() === student._id.toString())
    );

    res.json({
      success: true,
      data: uniqueStudents,
      message: `Found ${uniqueStudents.length} students`
    });
  } catch (error) {
    console.error('Error getting faculty students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty students',
      error: error.message
    });
  }
};

// Get faculty's projects
const getFacultyProjects = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { semester, status, projectType } = req.query;
    
    // Get faculty
    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Build query
    const query = { faculty: faculty._id };
    
    if (semester) {
      query.semester = parseInt(semester);
    }
    
    if (status) {
      query.status = status;
    }
    
    if (projectType) {
      query.projectType = projectType;
    }

    // Get projects with populated data
    const projects = await Project.find(query)
      .populate('student', 'fullName misNumber collegeEmail semester degree branch')
      .populate('group', 'name members')
      .sort({ createdAt: -1 });

    // Get project statistics
    const stats = {
      total: projects.length,
      registered: projects.filter(p => p.status === 'registered').length,
      faculty_allocated: projects.filter(p => p.status === 'faculty_allocated').length,
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length
    };

    res.json({
      success: true,
      data: projects,
      stats,
      message: `Found ${projects.length} projects`
    });
  } catch (error) {
    console.error('Error getting faculty projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty projects',
      error: error.message
    });
  }
};

// Get faculty's groups
const getFacultyGroups = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { semester, status } = req.query;
    
    // Get faculty
    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Build query
    const query = { 
      allocatedFaculty: faculty._id, 
      isActive: true,
      status: { $ne: 'locked' } // Exclude locked groups (historical Sem 5 groups)
    };
    
    if (semester) {
      query.semester = parseInt(semester);
    }
    
    if (status) {
      query.status = status;
    }

    // Get groups with populated data
    const groups = await Group.find(query)
      .populate('members.student', 'fullName misNumber collegeEmail')
      .populate('leader', 'fullName misNumber collegeEmail')
      .populate('project', 'title description projectType status')
      .sort({ createdAt: -1 });

    // Get group statistics
    const stats = {
      total: groups.length,
      forming: groups.filter(g => g.status === 'forming').length,
      complete: groups.filter(g => g.status === 'complete').length,
      locked: groups.filter(g => g.status === 'locked').length,
      disbanded: groups.filter(g => g.status === 'disbanded').length,
      withProject: groups.filter(g => g.project).length
    };

    res.json({
      success: true,
      data: groups,
      stats,
      message: `Found ${groups.length} groups`
    });
  } catch (error) {
    console.error('Error getting faculty groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty groups',
      error: error.message
    });
  }
};

// Get allocation requests
const getAllocationRequests = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { status } = req.query;
    
    // Get faculty
    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Build query
    const query = { 'preferences.faculty': faculty._id };
    
    if (status) {
      query.status = status;
    }

    // Get allocation requests
    const requests = await FacultyPreference.find(query)
      .populate('student', 'fullName misNumber collegeEmail semester degree branch')
      .populate('project', 'title description projectType')
      .populate('group', 'name members')
      .populate('preferences.faculty', 'fullName department designation')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: requests,
      message: `Found ${requests.length} allocation requests`
    });
  } catch (error) {
    console.error('Error getting allocation requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching allocation requests',
      error: error.message
    });
  }
};

// Accept allocation request
const acceptAllocation = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { requestId } = req.params;
    const { comments } = req.body;
    
    // Get faculty
    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Find allocation request
    const request = await FacultyPreference.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Allocation request not found'
      });
    }

    // Check if faculty is in the preferences
    const facultyPreference = request.preferences.find(p => 
      p.faculty.toString() === faculty._id.toString()
    );
    
    if (!facultyPreference) {
      return res.status(400).json({
        success: false,
        message: 'Faculty is not in the preference list'
      });
    }

    // Record faculty response
    await request.recordFacultyResponse(faculty._id, 'accepted', comments);

    // Update project/group with faculty allocation
    if (request.project) {
      const project = await Project.findById(request.project);
      if (project) {
        project.faculty = faculty._id;
        project.status = 'faculty_allocated';
        project.allocatedBy = 'faculty_choice';
        await project.save();
      }
    }

    if (request.group) {
      const group = await Group.findById(request.group);
      if (group) {
        group.allocatedFaculty = faculty._id;
        await group.save();
      }
    }

    res.json({
      success: true,
      message: 'Allocation request accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting allocation',
      error: error.message
    });
  }
};

// Reject allocation request
const rejectAllocation = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { requestId } = req.params;
    const { reason, comments } = req.body;
    
    // Get faculty
    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Find allocation request
    const request = await FacultyPreference.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Allocation request not found'
      });
    }

    // Check if this faculty is the current one being presented to
    const currentFaculty = request.getCurrentFaculty();
    if (!currentFaculty || currentFaculty.faculty.toString() !== faculty._id.toString()) {
      // Also check Project's currentFacultyIndex for solo projects
      if (request.project && !request.group) {
        const project = await Project.findById(request.project);
        if (project && project.supportsFacultyAllocation()) {
          const projectCurrentFaculty = project.getCurrentFaculty();
          if (!projectCurrentFaculty || projectCurrentFaculty.faculty.toString() !== faculty._id.toString()) {
            return res.status(400).json({
              success: false,
              message: 'This project is not currently presented to you'
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: 'This project is not currently presented to you'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'This allocation request is not currently presented to you'
        });
      }
    }

    // Record faculty response
    await request.recordFacultyResponse(faculty._id, 'rejected', comments);

    // For solo projects (like Type 2 Major Project 2), use Project's facultyPass method
    let projectUpdated = false;
    if (request.project && !request.group) {
      const project = await Project.findById(request.project);
      if (project && project.supportsFacultyAllocation()) {
        try {
          // Use the Project's facultyPass method which updates the Project's currentFacultyIndex
          await project.facultyPass(faculty._id, comments || reason || '');
          projectUpdated = true;
          
          // Present to next faculty if available
          if (!project.allFacultyPresented()) {
            try {
              await project.presentToCurrentFaculty();
            } catch (presentError) {
              console.error('Error presenting to next faculty:', presentError);
            }
          }
        } catch (projectPassError) {
          console.error('Error passing project:', projectPassError);
          // If project.facultyPass fails, manually update the project's currentFacultyIndex
          const currentIndex = project.currentFacultyIndex || 0;
          if (currentIndex < (project.facultyPreferences?.length || 0)) {
            project.currentFacultyIndex = currentIndex + 1;
            await project.save();
            projectUpdated = true;
            
            // Present to next faculty if available
            if (!project.allFacultyPresented()) {
              try {
                await project.presentToCurrentFaculty();
              } catch (presentError) {
                console.error('Error presenting to next faculty:', presentError);
              }
            }
          }
        }
      }
    }

    // Move to next faculty in FacultyPreference
    // For solo projects, sync FacultyPreference's index with Project's index
    try {
      if (request.project && !request.group && projectUpdated) {
        // For solo projects, sync FacultyPreference's currentFacultyIndex with Project's
        const project = await Project.findById(request.project);
        if (project) {
          request.currentFacultyIndex = project.currentFacultyIndex || 0;
          await request.save();
        } else {
          // Fallback: use moveToNextFaculty
          await request.moveToNextFaculty();
        }
      } else {
        // For group projects, use FacultyPreference's index as source of truth
        await request.moveToNextFaculty();
      }
    } catch (moveError) {
      // All faculty have been presented to - ready for admin allocation
      console.log('All faculty have been presented to');
    }

    // Get the updated project to check current faculty
    let nextFaculty = request.getCurrentFaculty();
    if (request.project) {
      const updatedProject = await Project.findById(request.project);
      if (updatedProject && updatedProject.supportsFacultyAllocation()) {
        const projectCurrentFaculty = updatedProject.getCurrentFaculty();
        if (projectCurrentFaculty) {
          nextFaculty = projectCurrentFaculty;
        }
      }
    }

    res.json({
      success: true,
      message: 'Allocation request rejected successfully',
      data: {
        projectId: request.project,
        nextFaculty: nextFaculty,
        isReadyForAdmin: request.isReadyForAdminAllocation()
      }
    });
  } catch (error) {
    console.error('Error rejecting allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting allocation',
      error: error.message
    });
  }
};

// Update project status
const updateProject = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { projectId } = req.params;
    const { status, grade, feedback } = req.body;
    
    // Get faculty
    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: projectId, 
      faculty: faculty._id 
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or not assigned to this faculty'
      });
    }

    // Update project
    if (status) project.status = status;
    if (grade) project.grade = grade;
    if (feedback) project.feedback = feedback;
    
    if (status === 'completed' || grade) {
      project.evaluatedBy = faculty._id;
      project.evaluatedAt = new Date();
    }

    await project.save();

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating project',
      error: error.message
    });
  }
};

// Evaluate project
const evaluateProject = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { projectId } = req.params;
    const { grade, feedback } = req.body;
    
    // Get faculty
    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: projectId, 
      faculty: faculty._id 
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or not assigned to this faculty'
      });
    }

    // Update project evaluation
    project.grade = grade;
    project.feedback = feedback;
    project.status = 'completed';
    project.evaluatedBy = faculty._id;
    project.evaluatedAt = new Date();

    await project.save();

    res.json({
      success: true,
      data: project,
      message: 'Project evaluated successfully'
    });
  } catch (error) {
    console.error('Error evaluating project:', error);
    res.status(500).json({
      success: false,
      message: 'Error evaluating project',
      error: error.message
    });
  }
};

// Helper to get current academic year
const getCurrentAcademicYear = async () => {
  const year = await SystemConfig.getConfigValue('academic.currentYear');
  if (year && /^\d{4}-\d{2}$/.test(year)) {
    return year;
  }
  // Fallback: calculate from current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth(); // 0-11
  // Academic year starts in July (month 6)
  if (month >= 6) {
    return `${currentYear}-${(currentYear+1).toString().slice(-2)}`;
  } else {
    return `${(currentYear-1)}-${currentYear.toString().slice(-2)}`;
  }
};

// Get unallocated groups for faculty (all active semesters)
const getUnallocatedGroups = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { semester } = req.query;
    // Get current academic year dynamically instead of hardcoding
    const defaultAcademicYear = await getCurrentAcademicYear();
    const academicYear = req.query.academicYear || defaultAcademicYear;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // If semester specified, use it; otherwise include active semesters for B.Tech and M.Tech (1,4-8)
    const semestersToFetch = semester ? [parseInt(semester)] : [1, 4, 5, 6, 7, 8];
    
    // Get groups currently presented to this faculty across all semesters
    console.log(`[getUnallocatedGroups] Fetching for faculty ${faculty._id}, semesters: ${semestersToFetch.join(', ')}, academicYear: ${academicYear}`);
    
    // First, find all unique academic years for pending preferences for this faculty
    const debugQuery = {
      'preferences.faculty': faculty._id,
      status: 'pending',
      semester: { $in: semestersToFetch }
    };
    const debugPrefs = await FacultyPreference.find(debugQuery).select('academicYear').lean();
    const uniqueAcademicYears = [...new Set(debugPrefs.map(p => p.academicYear).filter(Boolean))];
    
    // Use unique academic years found, or fall back to the requested/default academicYear
    const academicYearsToCheck = uniqueAcademicYears.length > 0 ? uniqueAcademicYears : [academicYear];
    
    console.log(`[getUnallocatedGroups] Found academic years in FacultyPreference documents: ${uniqueAcademicYears.join(', ') || 'none'}`);
    console.log(`[getUnallocatedGroups] Will query with academicYears: ${academicYearsToCheck.join(', ')}`);
    
    const allPreferences = [];
    // Query for all academicYears found in FacultyPreference documents (or the requested one)
    for (const acadYear of academicYearsToCheck) {
      for (const sem of semestersToFetch) {
        const preferences = await FacultyPreference.getGroupsForFaculty(
          faculty._id, 
          sem, 
          acadYear
        );
        console.log(`[getUnallocatedGroups] Semester ${sem}, AcademicYear ${acadYear}: Found ${preferences.length} preferences after filtering`);
        allPreferences.push(...preferences);
      }
    }
    console.log(`[getUnallocatedGroups] Total preferences found: ${allPreferences.length}`);

    // Filter out preferences where the project is completed (moved to next semester)
    const activePreferences = allPreferences.filter(pref => {
      // Only include if project is not completed
      return pref.project && pref.project.status !== 'completed';
    });

    // Populate student details for each group
    for (const pref of activePreferences) {
      if (pref.group) {
        await pref.group.populate('members.student', 'fullName misNumber collegeEmail branch');
      }
    }

    // Format the response
    const groups = activePreferences.map(pref => {
      // Handle solo projects: internship1 (Sem 7 or Sem 8 Type 1) or major2 without group (Sem 8 Type 2)
      // Group projects: major2 with group (Sem 8 Type 1) or other group-based projects
      const isSoloProject = pref.project?.projectType === 'internship1' || 
                           (pref.project?.projectType === 'major2' && !pref.group) ||
                           !pref.group;
      const student = pref.student;
      
      // Determine project type label with solo/group distinction for Major Project 2
      const projectType = pref.project?.projectType || (pref.semester === 7 ? 'major1' : pref.semester === 8 ? 'major2' : pref.semester === 5 ? 'minor2' : pref.semester === 4 ? 'minor1' : pref.semester === 6 ? 'minor3' : 'unknown');
      const isMajor2Solo = projectType === 'major2' && isSoloProject;
      const isMajor2Group = projectType === 'major2' && !isSoloProject;
      
      return {
      id: pref._id,
        groupName: isSoloProject 
          ? (student?.fullName ? `${student.fullName}'s Project` : 'Solo Project')
          : (pref.group?.name || 'Unnamed Group'),
      projectTitle: pref.project?.title || 'No Project',
      projectType: projectType,
      isSoloProject: isSoloProject,
      isMajor2Solo: isMajor2Solo,
      isMajor2Group: isMajor2Group,
        members: isSoloProject 
          ? (student ? [{
              name: student.fullName || 'Unknown',
              misNumber: student.misNumber || 'N/A',
              role: 'leader'
            }] : [])
          : (pref.group?.members?.filter(m => m.isActive !== false).map(member => ({
        name: member.student?.fullName || 'Unknown',
        misNumber: member.student?.misNumber || 'N/A',
        role: member.role || 'member'
            })) || []),
      preferences: pref.preferences?.map(p => p.faculty?.fullName || 'Unknown Faculty') || [],
        currentPreference: (pref.project?.currentFacultyIndex || 0) + 1,
      semester: pref.semester,
      academicYear: pref.academicYear,
      projectId: pref.project?._id,
      groupId: pref.group?._id
      };
    });

    res.json({
      success: true,
      data: groups,
      message: `Found ${groups.length} groups awaiting your decision`
    });
  } catch (error) {
    console.error('Error getting unallocated groups:', error);
    res.status(500).json({ success: false, message: 'Error getting unallocated groups', error: error.message });
  }
};

// Get allocated groups for faculty (all active semesters)
const getAllocatedGroups = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { semester } = req.query;
    // Get current academic year dynamically instead of hardcoding
    const defaultAcademicYear = await getCurrentAcademicYear();
    const academicYear = req.query.academicYear || defaultAcademicYear;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // If semester specified, use it; otherwise include active semesters for B.Tech and M.Tech (1,4-8)
    const semestersToFetch = semester ? [parseInt(semester)] : [1, 4, 5, 6, 7, 8];
    
    // Find all unique academic years for allocated preferences for this faculty
    const allocatedQuery = {
      allocatedFaculty: faculty._id,
      status: 'allocated',
      semester: { $in: semestersToFetch }
    };
    const allocatedPrefs = await FacultyPreference.find(allocatedQuery).select('academicYear').lean();
    const uniqueAcademicYears = [...new Set(allocatedPrefs.map(p => p.academicYear).filter(Boolean))];
    const academicYearsToCheck = uniqueAcademicYears.length > 0 ? uniqueAcademicYears : [academicYear];
    
    // Method 1: Get groups from FacultyPreference records (for Sem 4-5)
    const allPreferences = [];
    for (const acadYear of academicYearsToCheck) {
      for (const sem of semestersToFetch) {
        const preferences = await FacultyPreference.getAllocatedGroupsForFaculty(
          faculty._id, 
          sem, 
          acadYear
        );
        allPreferences.push(...preferences);
      }
    }

    // Filter out preferences where the project is completed (moved to next semester)
    const activePreferences = allPreferences.filter(pref => {
      // Only include if project is not completed
      return pref.project && pref.project.status !== 'completed';
    });

    // Populate nested student details in groups from preferences
    for (const pref of activePreferences) {
      if (pref.group && pref.group._id) {
        await pref.group.populate('members.student', 'fullName misNumber collegeEmail branch');
      }
    }

    // Method 2: Get groups directly allocated to faculty (for Sem 6+ where no FacultyPreference exists)
    // Query for all academic years found
    const groupQuery = {
      allocatedFaculty: faculty._id,
      isActive: true,
      semester: { $in: semestersToFetch },
      academicYear: { $in: academicYearsToCheck },
      status: { $ne: 'locked' } // Exclude locked groups (historical Sem 5 groups)
    };
    
    const directlyAllocatedGroups = await Group.find(groupQuery)
      .populate('members.student', 'fullName misNumber collegeEmail branch')
      .populate('project', 'title description projectType status _id')
      .lean();

    // Filter out groups with completed projects
    const activeDirectGroups = directlyAllocatedGroups.filter(group => {
      return group.project && group.project.status !== 'completed';
    });

    // Combine both methods and format the response
    const groupsFromPreferences = activePreferences.map(pref => {
      // Handle solo projects: internship1 (Sem 7 or Sem 8 Type 1), internship2 (Sem 8), or major2 without group (Sem 8 Type 2)
      // Group projects: major2 with group (Sem 8 Type 1) or other group-based projects
      const isSoloProject = pref.project?.projectType === 'internship1' || 
                           pref.project?.projectType === 'internship2' ||
                           (pref.project?.projectType === 'major2' && !pref.group) ||
                           !pref.group;
      const student = pref.student;
      
      // Determine project type label with solo/group distinction for Major Project 2
      const projectType = pref.project?.projectType || (pref.semester === 7 ? 'major1' : pref.semester === 8 ? 'major2' : pref.semester === 5 ? 'minor2' : pref.semester === 4 ? 'minor1' : pref.semester === 6 ? 'minor3' : 'unknown');
      const isMajor2Solo = projectType === 'major2' && isSoloProject;
      const isMajor2Group = projectType === 'major2' && !isSoloProject;
      
      return {
      id: pref._id,
        groupName: isSoloProject 
          ? (student?.fullName ? `${student.fullName}'s Project` : 'Solo Project')
          : (pref.group?.name || 'Unnamed Group'),
      projectTitle: pref.project?.title || 'No Project',
      projectType: projectType,
      isSoloProject: isSoloProject,
      isMajor2Solo: isMajor2Solo,
      isMajor2Group: isMajor2Group,
        members: isSoloProject 
          ? (student ? [{
              name: student.fullName || 'Unknown',
              misNumber: student.misNumber || 'N/A',
              role: 'leader'
            }] : [])
          : (pref.group?.members?.filter(m => m.isActive !== false).map(member => ({
        name: member.student?.fullName || 'Unknown',
        misNumber: member.student?.misNumber || 'N/A',
        role: member.role || 'member'
            })) || []),
      allocatedDate: pref.allocatedAt,
      semester: pref.semester,
      academicYear: pref.academicYear,
      projectId: pref.project?._id,
      groupId: pref.group?._id
      };
    });

    const groupsFromDirect = activeDirectGroups.map(group => ({
      id: group._id,
      groupName: group.name || 'Unnamed Group',
      projectTitle: group.project?.title || 'No Project',
      projectType: group.project?.projectType || (group.semester === 7 ? 'major1' : group.semester === 8 ? 'major2' : group.semester === 5 ? 'minor2' : group.semester === 4 ? 'minor1' : group.semester === 6 ? 'minor3' : 'unknown'),
      members: group.members?.filter(m => m.isActive !== false).map(member => ({
        name: member.student?.fullName || 'Unknown',
        misNumber: member.student?.misNumber || 'N/A',
        role: member.role || 'member'
      })) || [],
      allocatedDate: group.finalizedAt || group.createdAt,
      semester: group.semester,
      academicYear: group.academicYear,
      projectId: group.project?._id,
      groupId: group._id
    }));

    // Merge and deduplicate by groupId
    const allGroups = [...groupsFromPreferences];
    const existingGroupIds = new Set(groupsFromPreferences.map(g => g.groupId?.toString()));
    
    for (const group of groupsFromDirect) {
      if (!existingGroupIds.has(group.groupId?.toString())) {
        allGroups.push(group);
      }
    }

    res.json({
      success: true,
      data: allGroups,
      message: `Found ${allGroups.length} allocated groups`
    });
  } catch (error) {
    console.error('Error getting allocated groups:', error);
    res.status(500).json({ success: false, message: 'Error getting allocated groups', error: error.message });
  }
};

// Sem 5 specific: Choose group (faculty accepts)
const chooseGroup = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { groupId } = req.params;
    const { comments = '' } = req.body;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Find the faculty preference record by ID (groupId is actually the FacultyPreference ID)
    const preference = await FacultyPreference.findById(groupId);

    if (!preference) {
      return res.status(404).json({ success: false, message: 'Group allocation request not found' });
    }

    // Check if the preference is still pending
    if (preference.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This group allocation is no longer pending' });
    }

    // Check if this faculty is the current one being presented to
    // For solo projects (internship1 - Sem 7 or Sem 8 Type 1), check the Project's currentFacultyIndex
    // For group projects, check the FacultyPreference's currentFacultyIndex
    let currentFaculty = preference.getCurrentFaculty();
    let isValidCurrentFaculty = currentFaculty && currentFaculty.faculty.toString() === faculty._id.toString();
    
    // Also verify against Project's currentFacultyIndex for solo projects
    if (preference.project && !preference.group) {
      const project = await Project.findById(preference.project);
      if (project && project.supportsFacultyAllocation()) {
        const projectCurrentFaculty = project.getCurrentFaculty();
        if (projectCurrentFaculty) {
          // Use Project's current faculty as source of truth for solo projects
          isValidCurrentFaculty = projectCurrentFaculty.faculty.toString() === faculty._id.toString();
          currentFaculty = projectCurrentFaculty;
        }
      }
    }
    
    if (!isValidCurrentFaculty) {
      return res.status(400).json({ success: false, message: 'This group/project is not currently presented to you' });
    }

    // Allocate the group to this faculty
    await preference.allocateFaculty(faculty._id, 'faculty_choice');
    
    // Update the group and project with allocated faculty
    let group = null;
    if (preference.group) {
      // Don't populate when saving to avoid validation issues
      group = await Group.findById(preference.group);
      if (group) {
        group.allocatedFaculty = faculty._id;
        group.status = 'locked';
        await group.save();
        
        // Get populated version for member updates below
        group = await Group.findById(preference.group).populate('members.student');
      }
    }

    let project = null;
    if (preference.project) {
      project = await Project.findById(preference.project);
      if (project) {
        // For solo projects (internship1 - Sem 7 or Sem 8 Type 1, solo major2 - Sem 8 Type 2), use the Project's facultyChoose method
        // This ensures allocation history is properly recorded
        if (project.supportsFacultyAllocation() && !preference.group) {
          try {
            await project.facultyChoose(faculty._id, '');
          } catch (chooseError) {
            // If facultyChoose fails, manually set the faculty
        project.faculty = faculty._id;
        project.status = 'faculty_allocated';
        project.allocatedBy = 'faculty_choice';
        await project.save();
          }
        } else {
          // For group projects, manually set the faculty
          project.faculty = faculty._id;
          project.status = 'faculty_allocated';
          project.allocatedBy = 'faculty_choice';
          await project.save();
        }
        
        // Update all group members' currentProjects status (for group projects)
        if (group && group.members) {
          const activeMembers = group.members.filter(m => m.isActive);
          for (const member of activeMembers) {
            const memberStudent = await Student.findById(member.student);
            if (memberStudent) {
              const currentProject = memberStudent.currentProjects.find(cp => 
                cp.project.toString() === project._id.toString()
              );
              if (currentProject) {
                currentProject.status = 'active'; // Update status when faculty is allocated
              }
              await memberStudent.save();
            }
          }
        } else if (project.projectType === 'internship1' && preference.student) {
          // Handle solo projects (internship1 - Sem 7 or Sem 8 Type 1) - update student's currentProjects directly
          const student = await Student.findById(preference.student);
          if (student) {
            const currentProject = student.currentProjects.find(cp => 
              cp.project.toString() === project._id.toString()
            );
            if (currentProject) {
              currentProject.status = 'active'; // Update status when faculty is allocated
            }
            await student.save();
          }
        }
      }
    }

    // Send acceptance email to students after successful allocation
    try {
      // For group projects, notify all active group members
      if (group && group.members && group.members.length > 0 && project) {
        const activeMembers = group.members.filter(m => m.isActive && m.student);
        const recipientEmails = [];

        for (const member of activeMembers) {
          // member.student may be populated or just an ObjectId
          let studentDoc = member.student;
          if (!studentDoc || !studentDoc.collegeEmail) {
            studentDoc = await Student.findById(member.student);
          }
          if (studentDoc && studentDoc.collegeEmail) {
            recipientEmails.push(studentDoc.collegeEmail);
          }
        }

        if (recipientEmails.length > 0) {
          const subject = 'SPMS IIITP - Faculty Allocation Confirmed for Your Group';
          const text = `Dear Student,\n\nYour group has been accepted by ${faculty.fullName} for the project "${project.title}".\n\nPlease check the SPMS portal for further details and upcoming meetings.\n\nRegards,\nSPMS IIIT Pune`;
          const html = `
            <p>Dear Student,</p>
            <p>Your group has been <strong>accepted</strong> by <strong>${faculty.fullName}</strong> for the project:</p>
            <p><strong>${project.title}</strong></p>
            <p>Please log in to the SPMS portal to see the updated status and any upcoming meetings or instructions.</p>
            <p>Regards,<br/>SPMS IIIT Pune</p>
          `;

          await sendEmail({
            to: recipientEmails,
            subject,
            text,
            html,
          });
        }
      }
      // For solo internship projects, notify the single student
      else if (project && project.projectType === 'internship1' && preference.student) {
        const student = await Student.findById(preference.student);
        if (student && student.collegeEmail) {
          const subject = 'SPMS IIITP - Faculty Allocation Confirmed for Your Internship';
          const text = `Dear ${student.fullName},\n\nYour internship project "${project.title}" has been accepted by ${faculty.fullName}.\n\nPlease check the SPMS portal for further details and upcoming meetings.\n\nRegards,\nSPMS IIIT Pune`;
          const html = `
            <p>Dear ${student.fullName},</p>
            <p>Your internship project has been <strong>accepted</strong> by <strong>${faculty.fullName}</strong> for:</p>
            <p><strong>${project.title}</strong></p>
            <p>Please log in to the SPMS portal to see the updated status and any upcoming meetings or instructions.</p>
            <p>Regards,<br/>SPMS IIIT Pune</p>
          `;

          await sendEmail({
            to: student.collegeEmail,
            subject,
            text,
            html,
          });
        }
      }
    } catch (emailError) {
      console.error('Error sending faculty allocation acceptance email:', emailError);
      // Do not fail the main operation if email fails
    }

    res.json({
      success: true,
      message: 'Group allocated successfully',
      data: {
        groupId: preference.group,
        projectId: preference.project,
        allocatedFaculty: faculty._id,
        allocatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error choosing group:', error);
    res.status(500).json({ success: false, message: 'Error choosing group', error: error.message });
  }
};

// Sem 5 specific: Pass group (faculty passes to next preference)
const passGroup = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { groupId } = req.params;
    const { comments = '' } = req.body;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Find the faculty preference record by ID (groupId is actually the FacultyPreference ID)
    const preference = await FacultyPreference.findById(groupId);

    if (!preference) {
      return res.status(404).json({ success: false, message: 'Group allocation request not found' });
    }

    // Check if the preference is still pending
    if (preference.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This group allocation is no longer pending' });
    }

    // Check if this faculty is the current one being presented to
    // For solo projects (M.Tech Sem 1 minor1, internship1 - Sem 7 or Sem 8 Type 1), check the Project's currentFacultyIndex
    // For group projects, check the FacultyPreference's currentFacultyIndex
    let currentFaculty = preference.getCurrentFaculty();
    let isValidCurrentFaculty = currentFaculty && currentFaculty.faculty.toString() === faculty._id.toString();
    
    // Also verify against Project's currentFacultyIndex for solo projects
    // For solo projects, Project's currentFacultyIndex is the source of truth
    if (preference.project && !preference.group) {
      const project = await Project.findById(preference.project);
      if (project && project.supportsFacultyAllocation()) {
        const projectCurrentFaculty = project.getCurrentFaculty();
        if (projectCurrentFaculty) {
          // Use Project's current faculty as source of truth for solo projects
          isValidCurrentFaculty = projectCurrentFaculty.faculty.toString() === faculty._id.toString();
          currentFaculty = projectCurrentFaculty;
        } else {
          // If project doesn't have current faculty but supports allocation, 
          // it might be in an invalid state - still check preference as fallback
          // but log a warning
          console.warn(`Project ${project._id} supports faculty allocation but getCurrentFaculty() returned null. Using FacultyPreference as fallback.`);
        }
      }
    }
    
    if (!isValidCurrentFaculty) {
      return res.status(400).json({ success: false, message: 'This group/project is not currently presented to you' });
    }

    // Record the faculty response
    await preference.recordFacultyResponse(faculty._id, 'rejected', comments);

    // Update the Project's currentFacultyIndex first (for solo projects like internship1 - Sem 7 or Sem 8 Type 1)
    // For solo projects, Project's currentFacultyIndex is the source of truth
    // For group projects, FacultyPreference's currentFacultyIndex is the source of truth
    let projectUpdated = false;
    if (preference.project) {
      const project = await Project.findById(preference.project);
      if (project && project.supportsFacultyAllocation()) {
        try {
          // Use the Project's facultyPass method which updates the Project's currentFacultyIndex
          await project.facultyPass(faculty._id, comments);
          projectUpdated = true;
        } catch (projectPassError) {
          // If project.facultyPass fails, manually update the project's currentFacultyIndex
          // This can happen if the project's currentFacultyIndex is out of sync
          const currentIndex = project.currentFacultyIndex || 0;
          if (currentIndex < (project.facultyPreferences?.length || 0)) {
            project.currentFacultyIndex = currentIndex + 1;
            await project.save();
            projectUpdated = true;
          }
        }
      }
    }

    // Move to next faculty in FacultyPreference
    // For solo projects, sync FacultyPreference's index with Project's index
    try {
      if (preference.project && !preference.group && projectUpdated) {
        // For solo projects, sync FacultyPreference's currentFacultyIndex with Project's
        const project = await Project.findById(preference.project);
        if (project) {
          preference.currentFacultyIndex = project.currentFacultyIndex || 0;
          await preference.save();
        } else {
          // Fallback: use moveToNextFaculty
      await preference.moveToNextFaculty();
        }
      } else {
        // For group projects, use FacultyPreference's index as source of truth
        await preference.moveToNextFaculty();
      }
      
      // Get the updated project to check current faculty
      let nextFaculty = preference.getCurrentFaculty();
      if (preference.project) {
        const updatedProject = await Project.findById(preference.project);
        if (updatedProject && updatedProject.supportsFacultyAllocation()) {
          const projectCurrentFaculty = updatedProject.getCurrentFaculty();
          if (projectCurrentFaculty) {
            nextFaculty = projectCurrentFaculty;
          }
          
          // For solo projects, present to next faculty after passing
          // This applies to:
          // - M.Tech Sem 1 minor1 (solo, no group)
          // - B.Tech Sem 7/8 Internship 1 (solo, no group)
          // - B.Tech Sem 8 Major Project 2 Type 2 (solo, no group)
          // - B.Tech Sem 8 Internship 2 (solo, no group)
          // Group projects (B.Tech Sem 5, Sem 7 Major Project 1, Sem 8 Major Project 2 Type 1) 
          // don't need this as they use FacultyPreference mechanism exclusively
          if (!preference.group && projectUpdated) {
            try {
              // Check if there's a next faculty to present to
              if (!updatedProject.allFacultyPresented()) {
                await updatedProject.presentToCurrentFaculty();
              }
            } catch (presentError) {
              // Don't fail the request if presentation fails - log it
              console.error('Error presenting to next faculty after pass:', presentError);
            }
          }
        }
      }
      
      res.json({
        success: true,
        message: 'Group passed to next faculty preference',
        data: {
          groupId: preference.group,
          projectId: preference.project,
          nextFaculty: nextFaculty,
          isReadyForAdmin: preference.isReadyForAdminAllocation()
        }
      });
    } catch (moveError) {
      // All faculty have been presented to - ready for admin allocation
      res.json({
        success: true,
        message: 'All faculty have passed - group is ready for admin allocation',
        data: {
          groupId: preference.group,
          projectId: preference.project,
          isReadyForAdmin: true
        }
      });
    }
  } catch (error) {
    console.error('Error passing group:', error);
    res.status(500).json({ success: false, message: 'Error passing group', error: error.message });
  }
};

// Sem 5 specific: Get faculty statistics
const getSem5Statistics = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { semester = 5 } = req.query;
    // Get current academic year dynamically instead of hardcoding
    const defaultAcademicYear = await getCurrentAcademicYear();
    const academicYear = req.query.academicYear || defaultAcademicYear;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Find all unique academic years for this faculty's preferences
    const prefQuery = {
      'preferences.faculty': faculty._id,
      semester: parseInt(semester)
    };
    const prefDocs = await FacultyPreference.find(prefQuery).select('academicYear').lean();
    const uniqueAcademicYears = [...new Set(prefDocs.map(p => p.academicYear).filter(Boolean))];
    const academicYearsToCheck = uniqueAcademicYears.length > 0 ? uniqueAcademicYears : [academicYear];

    // Get statistics for all academic years
    const [unallocatedCount, allocatedCount, totalGroups] = await Promise.all([
      FacultyPreference.countDocuments({
        'preferences.faculty': faculty._id,
        status: 'pending',
        semester: parseInt(semester),
        academicYear: { $in: academicYearsToCheck },
        $expr: {
          $eq: [
            { $arrayElemAt: ['$preferences.faculty', '$currentFacultyIndex'] },
            faculty._id
          ]
        }
      }),
      FacultyPreference.countDocuments({
        allocatedFaculty: faculty._id,
        status: 'allocated',
        semester: parseInt(semester),
        academicYear: { $in: academicYearsToCheck }
      }),
      FacultyPreference.countDocuments({
        'preferences.faculty': faculty._id,
        semester: parseInt(semester),
        academicYear: { $in: academicYearsToCheck }
      })
    ]);

    res.json({
      success: true,
      data: {
        unallocatedGroups: unallocatedCount,
        allocatedGroups: allocatedCount,
        totalGroups: totalGroups,
        pendingDecisions: unallocatedCount
      },
      message: 'Statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting faculty statistics:', error);
    res.status(500).json({ success: false, message: 'Error getting statistics', error: error.message });
  }
};

// Get faculty profile
const getFacultyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const faculty = await Faculty.findOne({ user: userId })
      .populate('user', 'email role isActive lastLogin createdAt')
      .lean();
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty profile not found' });
    }
    res.json({
      success: true,
      data: {
        faculty: {
          id: faculty._id,
          fullName: faculty.fullName,
          phone: faculty.phone,
          facultyId: faculty.facultyId,
          department: faculty.department,
          mode: faculty.mode,
          designation: faculty.designation,
          isRetired: faculty.isRetired,
          createdAt: faculty.createdAt,
          updatedAt: faculty.updatedAt
        },
        user: faculty.user
      }
    });
  } catch (err) {
    console.error('Error fetching faculty profile:', err);
    res.status(500).json({ success: false, message: 'Error fetching faculty profile' });
  }
};

// Get faculty notifications (only non-dismissed)
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const faculty = await Faculty.findOne({ user: userId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Get only non-dismissed notifications, sorted by newest first
    const notifications = await FacultyNotification.find({
      faculty: faculty._id,
      dismissed: false
    })
      .populate('project', 'title projectType semester')
      .populate('student', 'fullName misNumber')
      .sort({ createdAt: -1 })
      .limit(50); // Limit to latest 50 notifications

    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error getting faculty notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// Dismiss a notification
const dismissNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const faculty = await Faculty.findOne({ user: userId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Find and update the notification
    const notification = await FacultyNotification.findOne({
      _id: notificationId,
      faculty: faculty._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Mark as dismissed
    notification.dismissed = true;
    notification.dismissedAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification dismissed',
      data: notification
    });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error dismissing notification',
      error: error.message
    });
  }
};

// Update faculty profile
const updateFacultyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, prefix, phone, department, mode, designation } = req.body;
    const faculty = await Faculty.findOne({ user: userId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty profile not found' });
    }
    if (fullName !== undefined) faculty.fullName = fullName;
    if (prefix !== undefined) faculty.prefix = prefix || '';
    if (phone !== undefined) faculty.phone = phone;
    if (department !== undefined) faculty.department = department;
    if (mode !== undefined) faculty.mode = mode;
    if (designation !== undefined) faculty.designation = designation;
    await faculty.save();
    const refreshed = await Faculty.findOne({ user: userId }).populate('user', 'email role isActive lastLogin createdAt').lean();
    res.json({
      success: true,
      data: {
        faculty: {
          id: refreshed._id,
          fullName: refreshed.fullName,
          prefix: refreshed.prefix || '',
          phone: refreshed.phone,
          facultyId: refreshed.facultyId,
          department: refreshed.department,
          mode: refreshed.mode,
          designation: refreshed.designation,
          isRetired: refreshed.isRetired,
          createdAt: refreshed.createdAt,
          updatedAt: refreshed.updatedAt
        },
        user: refreshed.user
      }
    });
  } catch (err) {
    console.error('Error updating faculty profile:', err);
    res.status(500).json({ success: false, message: 'Error updating faculty profile' });
  }
};

module.exports = {
  getDashboardData,
  getFacultyStudents,
  getFacultyProjects,
  getFacultyGroups,
  getAllocationRequests,
  acceptAllocation,
  rejectAllocation,
  getMTechSem3PendingProjects,
  chooseMTechSem3Project,
  passMTechSem3Project,
  updateProject,
  evaluateProject,
  // Sem 5 specific functions
  getUnallocatedGroups,
  getAllocatedGroups,
  chooseGroup,
  passGroup,
  getSem5Statistics,
  getFacultyProfile,
  updateFacultyProfile,
  // Notification functions
  getNotifications,
  dismissNotification
};