const Student = require('../models/Student');
const Project = require('../models/Project');
const Group = require('../models/Group');
const Faculty = require('../models/Faculty');
const FacultyPreference = require('../models/FacultyPreference');
const SystemConfig = require('../models/SystemConfig');
const mongoose = require('mongoose');
const User = require('../models/User');
const { migrateGroupToSem6, createNewGroupForSem6, generateAcademicYear } = require('../utils/semesterMigration');
const { isWindowOpen } = require('../middleware/windowCheck');
const { sendEmail } = require('../services/emailService');

// Get student dashboard data
const getDashboardData = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student details with populated data
    const student = await Student.findOne({ user: studentId })
      .populate('user', 'email role isActive lastLogin')
      .populate('currentProjects.project')
      .populate('groupMemberships.group')
      .populate('internshipHistory');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get semester-specific features
    const semesterFeatures = getSemesterFeaturesData(student.semester, student.degree);
    
    // Generate project capabilities for available project types
    const projectCapabilities = {};
    semesterFeatures.availableProjects.forEach(projectType => {
      projectCapabilities[projectType] = supportsGroupsAndFaculty(projectType, student.semester, student.degree);
    });
    
    // Get active group memberships first
    const activeGroups = await Group.find({
      'members.student': student._id,
      'members.isActive': true,
      semester: student.semester,
      isActive: true
    }).populate('members.student allocatedFaculty project');

    // Get current semester projects
    // Include projects where:
    // 1. Student is the direct owner (for solo projects)
    // 2. Student is in a group that has the project (for group projects)
    const groupIds = activeGroups.map(g => g._id);
    const currentProjects = await Project.find({ 
      semester: student.semester,
      status: { $in: ['registered', 'faculty_allocated', 'active'] },
      $or: [
        { student: student._id }, // Direct ownership
        { group: { $in: groupIds } } // Group membership
      ]
    }).populate('faculty group');

    // Get faculty preferences for current semester (only if project type supports faculty preferences)
    const facultyPreferences = await FacultyPreference.find({
      student: student._id,
      semester: student.semester
    }).populate('project group preferences.faculty');

    // Use the enhanced student model's dashboard data method
    const dashboardData = student.getDashboardData();

    res.json({
      success: true,
      data: {
        ...dashboardData,
        semesterFeatures,
        projectCapabilities,
        currentProjects,
        activeGroups,
        facultyPreferences,
        stats: {
          totalProjects: currentProjects.length,
          totalGroups: activeGroups.length,
          totalInternships: student.internshipHistory.length,
          pendingAllocations: facultyPreferences.filter(fp => fp.status === 'pending').length
        }
      }
    });
  } catch (error) {
    console.error('Error getting student dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// Get semester features based on semester number
const getSemesterFeatures = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const student = await Student.findOne({ user: studentId });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const features = getSemesterFeaturesData(student.semester);

    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error getting semester features:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching semester features',
      error: error.message
    });
  }
};

// Helper function to get semester features
/**
 * Check if a project type supports groups and faculty preferences
 * @param {string} projectType - The project type to check
 * @param {number} semester - The semester number
 * @param {string} degree - The degree type (B.Tech/M.Tech)
 * @returns {object} Object with boolean flags for group/faculty preference support
 */
const supportsGroupsAndFaculty = (projectType, semester, degree = 'B.Tech') => {
  // Define project types that require no groups or faculty preferences
  const soloProjects = ['minor1'];
  
  // Define project types that support groups and faculty preferences
  const groupProjects = ['minor2', 'minor3', 'major1', 'major2'];
  
  // Specific to semester constraints (for later semester projects that can be repeated)
  const multipleAllowedProjects = ['major1', 'major2', 'minor3'];
  
  // Special case: M.Tech Sem 1 Minor1 is solo but requires faculty preferences
  const isMtechSem1SoloWithPrefs = degree === 'M.Tech' && semester === 1 && projectType === 'minor1';

  return {
    supportsGroups: !soloProjects.includes(projectType) && (groupProjects.includes(projectType) || semester > 5),
    supportsFacultyPreferences: isMtechSem1SoloWithPrefs || (!soloProjects.includes(projectType) && (groupProjects.includes(projectType) || semester > 5)),
    allowsMultipleProjects: multipleAllowedProjects.includes(projectType),
    isSoloProject: soloProjects.includes(projectType)
  };
};

const getSemesterFeaturesData = (semester, degree = 'B.Tech') => {
  if (degree === 'M.Tech') {
    const mtechFeatures = {
      1: {
        canFormGroups: false,
        canJoinProjects: true,
        canApplyInternships: false,
        availableProjects: ['minor1'],
        description: 'M.Tech First semester - Minor Project 1 (Solo)'
      },
      2: {
        canFormGroups: false,
        canJoinProjects: true,
        canApplyInternships: false,
        availableProjects: ['minor2'],
        description: 'M.Tech Second semester - Minor Project 2 (Solo)'
      },
      3: {
        canFormGroups: false,
        canJoinProjects: true,
        canApplyInternships: true,
        availableProjects: ['major1'],
        description: 'M.Tech Third semester - Major Project 1 or Internship'
      },
      4: {
        canFormGroups: false,
        canJoinProjects: true,
        canApplyInternships: true,
        availableProjects: ['major2'],
        description: 'M.Tech Fourth semester - Major Project 2 or Internship'
      }
    };
    return mtechFeatures[semester] || mtechFeatures[1];
  }

  // B.Tech features
  const btechFeatures = {
    1: {
      canFormGroups: false,
      canJoinProjects: false,
      canApplyInternships: false,
      availableProjects: [],
      description: 'First semester - Basic academic activities'
    },
    2: {
      canFormGroups: false,
      canJoinProjects: false,
      canApplyInternships: false,
      availableProjects: [],
      description: 'Second semester - Basic academic activities'
    },
    3: {
      canFormGroups: false,
      canJoinProjects: false,
      canApplyInternships: false,
      availableProjects: [],
      description: 'Third semester - Basic academic activities'
    },
    4: {
      canFormGroups: false,
      canJoinProjects: true,
      canApplyInternships: false,
      availableProjects: ['minor1'],
      description: 'Fourth semester - Minor Project 1 (Solo)'
    },
    5: {
      canFormGroups: true,
      canJoinProjects: true,
      canApplyInternships: false,
      availableProjects: ['minor2'],
      description: 'Fifth semester - Minor Project 2 (Group)'
    },
    6: {
      canFormGroups: true,
      canJoinProjects: true,
      canApplyInternships: false,
      availableProjects: ['minor3'],
      description: 'Sixth semester - Minor Project 3 (Continue or New)'
    },
    7: {
      canFormGroups: true,
      canJoinProjects: true,
      canApplyInternships: true,
      availableProjects: ['major1', 'internship1'],
      description: 'Seventh semester - Major Project 1 or Internship'
    },
    8: {
      canFormGroups: true,
      canJoinProjects: true,
      canApplyInternships: true,
      availableProjects: ['major2'],
      description: 'Eighth semester - Major Project 2 or Internship'
    }
  };

  return btechFeatures[semester] || btechFeatures[1];
};

// Get student projects
const getStudentProjects = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { semester, status, projectType, allSemesters } = req.query;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Determine target semester(s) for group lookup
    let targetSemester;
    let groupQuery = {
      'members.student': student._id
    };
    
    // If allSemesters=true, get groups from all semesters
    if (allSemesters === 'true') {
      // No semester filter - get all groups
      groupQuery['members.isActive'] = true;
    } else {
      // Filter by specific semester or current semester
      targetSemester = semester ? parseInt(semester) : student.semester;
      groupQuery.semester = targetSemester;
      groupQuery['members.isActive'] = true;
      groupQuery.isActive = true;
    }
    
    const studentGroups = await Group.find(groupQuery).select('_id');
    const groupIds = studentGroups.map(g => g._id);

    // Build query to include both direct projects and group projects
    const query = {
      $or: [
        { student: student._id }, // Direct ownership
        { group: { $in: groupIds } } // Group membership
      ]
    };
    
    // Apply semester filter only if not requesting all semesters
    if (allSemesters !== 'true') {
      if (semester) {
        query.semester = parseInt(semester);
      } else {
        query.semester = student.semester; // Default to current semester
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    if (projectType) {
      query.projectType = projectType;
    }

    // Get projects with populated data
    const projects = await Project.find(query)
      .populate('faculty', 'fullName department designation')
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
    console.error('Error getting student projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
};

// Get student groups
const getStudentGroups = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { semester, status, allSemesters } = req.query;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build query
    const query = {
      'members.student': student._id,
      'members.isActive': true,
      isActive: true
    };
    
    // Apply semester filter only if not requesting all semesters
    if (allSemesters !== 'true') {
      if (semester) {
        query.semester = parseInt(semester);
      } else {
        query.semester = student.semester; // Default to current semester
      }
    }
    
    if (status) {
      query.status = status;
    }

    // Get groups with populated data
    const groups = await Group.find(query)
      .populate('members.student', 'fullName misNumber collegeEmail contactNumber branch')
      .populate('leader', 'fullName misNumber collegeEmail contactNumber branch')
      .populate('allocatedFaculty', 'fullName department designation')
      .populate('project', 'title description projectType status')
      .sort({ createdAt: -1 });

    // Get group statistics
    const stats = {
      total: groups.length,
      forming: groups.filter(g => g.status === 'forming').length,
      complete: groups.filter(g => g.status === 'complete').length,
      locked: groups.filter(g => g.status === 'locked').length,
      disbanded: groups.filter(g => g.status === 'disbanded').length,
      withFaculty: groups.filter(g => g.allocatedFaculty).length,
      withProject: groups.filter(g => g.project).length
    };

    res.json({
      success: true,
      data: groups,
      stats,
      message: `Found ${groups.length} groups`
    });
  } catch (error) {
    console.error('Error getting student groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student groups',
      error: error.message
    });
  }
};

// Get student internships
const getStudentInternships = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { type, status, semester } = req.query;
    
    const student = await Student.findOne({ user: studentId });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Filter internships based on query parameters
    let internships = student.internshipHistory || [];
    
    if (type) {
      internships = internships.filter(i => i.type === type);
    }
    
    if (status) {
      internships = internships.filter(i => i.status === status);
    }
    
    if (semester) {
      internships = internships.filter(i => i.semester === parseInt(semester));
    }

    // Get internship statistics
    const stats = {
      total: internships.length,
      ongoing: internships.filter(i => i.status === 'ongoing').length,
      completed: internships.filter(i => i.status === 'completed').length,
      cancelled: internships.filter(i => i.status === 'cancelled').length,
      summer: internships.filter(i => i.type === 'summer').length,
      winter: internships.filter(i => i.type === 'winter').length,
      sixMonth: internships.filter(i => i.type === '6month').length
    };

    res.json({
      success: true,
      data: internships,
      stats,
      message: `Found ${internships.length} internships`
    });
  } catch (error) {
    console.error('Error getting student internships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student internships',
      error: error.message
    });
  }
};

// Register for a new project
const registerProject = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { title, description, projectType, isContinuation, previousProjectId, facultyPreferences } = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student can join projects
    if (!student.canJoinProjects()) {
      return res.status(400).json({
        success: false,
        message: 'Student cannot register for projects in current semester'
      });
    }

    // Check if project type is available for current semester
    const semesterFeatures = getSemesterFeaturesData(student.semester, student.degree);
    if (!semesterFeatures.availableProjects.includes(projectType)) {
      return res.status(400).json({
        success: false,
        message: `Project type '${projectType}' is not available for semester ${student.semester}`
      });
    }

    // Check project type constraints for groups and faculty preferences
    const projectFeatures = supportsGroupsAndFaculty(projectType, student.semester, student.degree);
    
    // Check for existing project registrations based on project constraints
    const query = {
      student: student._id,
      semester: student.semester
    };
    
    // For projects that don't allow multiple registrations (like minor1), check exact match
    if (!projectFeatures.allowsMultipleProjects) {
      query.projectType = projectType;
    }
    
    const existingProjects = await Project.find(query);
    
    if (!projectFeatures.allowsMultipleProjects && existingProjects.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Student has already registered for a ${projectType} project in semester ${student.semester}`
      });
    }

    // For Minor Project 1, use title as description if no description provided
    const projectDescription = (projectType === 'minor1' && !description) ? title : description;

    // Create new project
    const project = new Project({
      title,
      description: projectDescription,
      projectType,
      student: student._id,
      semester: student.semester,
      academicYear: generateAcademicYear(),
      isContinuation: isContinuation || false,
      previousProject: previousProjectId || null,
      isInternship: projectType.includes('internship'),
      status: 'registered'
    });

    await project.save();

    // Add project to student's current projects
    await student.addCurrentProject(project._id, 'solo', student.semester);

    // If M.Tech Sem 1 Minor1 with preferences provided, create FacultyPreference (project-level)
    if (student.degree === 'M.Tech' && student.semester === 1 && projectType === 'minor1') {
      // Optional limit from SystemConfig; fallback to 5
      const maxPrefs = await SystemConfig.getConfigValue?.('mtech.sem1.facultyPreferenceLimit', 5).catch(() => 5) || 5;
      if (!facultyPreferences || !Array.isArray(facultyPreferences) || facultyPreferences.length === 0) {
        // Allow registration but indicate prefs required? We'll enforce presence as per option 2
        return res.status(400).json({ success: false, message: 'Faculty preferences are required for M.Tech Semester 1 registration' });
      }
      if (facultyPreferences.length > maxPrefs) {
        return res.status(400).json({ success: false, message: `You can select at most ${maxPrefs} faculty preferences` });
      }

      // Map into project and preference doc
      const normalized = facultyPreferences.map((pref, index) => ({
        faculty: pref.faculty?._id || pref.faculty,
        priority: pref.priority || (index + 1)
      }));

      // Save to project for quick reads
      project.facultyPreferences = normalized;
      await project.save();

      // Create FacultyPreference record (no group)
      const fpData = {
        student: student._id,
        project: project._id,
        group: null,
        preferences: normalized,
        semester: student.semester,
        academicYear: project.academicYear,
        status: 'pending',
        currentFacultyIndex: 0
      };
      const fpDoc = new FacultyPreference(fpData);
      await fpDoc.save();

      // Present project to first faculty (start the allocation process)
      try {
        await project.presentToCurrentFaculty();
      } catch (presentError) {
        // Don't fail registration if presentation fails - this is not critical
        console.error('Error presenting M.Tech Sem 1 project to faculty:', presentError);
      }
    }

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project registered successfully'
    });
  } catch (error) {
    console.error('Error registering project:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering project',
      error: error.message
    });
  }
};

// Submit or update faculty preferences for a project (M.Tech Sem 1 solo flow)
const submitProjectFacultyPreferences = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { projectId } = req.params;
    const { preferences } = req.body;

    if (!preferences || !Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({ success: false, message: 'Faculty preferences are required' });
    }

    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Ownership check
    if (project.student.toString() !== student._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not allowed to modify this project' });
    }

    // Only for M.Tech Sem 1 minor1
    if (!(student.degree === 'M.Tech' && project.semester === 1 && project.projectType === 'minor1')) {
      return res.status(400).json({ success: false, message: 'Preferences not applicable for this project' });
    }

    const maxPrefs = await SystemConfig.getConfigValue?.('mtech.sem1.facultyPreferenceLimit', 5).catch(() => 5) || 5;
    if (preferences.length > maxPrefs) {
      return res.status(400).json({ success: false, message: `You can select at most ${maxPrefs} faculty preferences` });
    }

    const normalized = preferences.map((pref, index) => ({
      faculty: pref.faculty?._id || pref.faculty,
      priority: pref.priority || (index + 1)
    }));

    project.facultyPreferences = normalized;
    await project.save();

    // Upsert FacultyPreference doc
    let fpDoc = await FacultyPreference.findOne({ project: project._id, student: student._id, semester: project.semester, academicYear: project.academicYear });
    if (!fpDoc) {
      fpDoc = new FacultyPreference({
        student: student._id,
        project: project._id,
        group: null,
        preferences: normalized,
        semester: project.semester,
        academicYear: project.academicYear,
        status: 'pending',
        currentFacultyIndex: 0
      });
    } else {
      fpDoc.preferences = normalized;
      fpDoc.status = 'pending';
      fpDoc.currentFacultyIndex = 0;
      fpDoc.allocatedFaculty = null;
    }
    await fpDoc.save();

    res.json({ success: true, message: 'Faculty preferences saved', data: { projectId: project._id } });
  } catch (error) {
    console.error('Error submitting project faculty preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to submit preferences', error: error.message });
  }
};

// Get faculty list for student preferences
const getFacultyList = async (req, res) => {
  try {
    const faculty = await Faculty.find({}, 'fullName department designation mode')
      .sort({ fullName: 1 });
    
    res.json({
      success: true,
      data: faculty
    });
  } catch (error) {
    console.error('Error fetching faculty list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch faculty list'
    });
  }
};

// Register for Minor Project 2 (Sem 5) - Enhanced version with group and faculty preferences
const registerMinorProject2 = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const studentId = req.user.id;
      const { title, domain, facultyPreferences } = req.body;
      
      // Get student with session
      const student = await Student.findOne({ user: studentId }).session(session);
      if (!student) {
        throw new Error('Student not found');
      }
      
      // Handle undefined academic year - try to find matching group first
      let studentAcademicYear = student.academicYear;
      
      if (!studentAcademicYear) {
        // Try to find any group for this student to get the academic year
        const anyGroup = await Group.findOne({
          'members.student': student._id,
          semester: 5
        }).session(session);
        
        if (anyGroup && anyGroup.academicYear) {
          studentAcademicYear = anyGroup.academicYear;
        } else {
          // Generate academic year based on current year
          const currentYear = new Date().getFullYear();
          const nextYear = currentYear + 1;
          studentAcademicYear = `${currentYear}-${nextYear.toString().slice(-2)}`;
        }
        
        // Update student with determined academic year
        student.academicYear = studentAcademicYear;
        await student.save({ session });
      }

      // Check if student is in semester 5
      if (student.semester !== 5) {
        throw new Error('Minor Project 2 is only available for Semester 5 students');
      }

      // Check if student is in a group
      const group = await Group.findOne({
        'members.student': student._id,
        semester: 5,
        academicYear: studentAcademicYear
      }).populate('members.student', 'fullName misNumber contactNumber branch').session(session);

      if (!group) {
        // Let's check if there are any groups for this student in any status
        const anyGroup = await Group.findOne({
          'members.student': student._id,
          semester: 5
        }).session(session);
        
        if (anyGroup) {
          throw new Error(`You are in a group but academic year mismatch. Group: ${anyGroup.academicYear}, Student: ${studentAcademicYear}`);
        }
        
        throw new Error('You must be in a group to register for Minor Project 2. Please create or join a group first.');
      }

      // Check if group is finalized
      
      if (group.status !== 'finalized') {
        throw new Error(`Your group must be finalized before registering for Minor Project 2. Current status: ${group.status}. Please finalize your group first.`);
      }

      // Check if current student is the group leader
      const isGroupLeader = group.leader.toString() === student._id.toString();

      if (!isGroupLeader) {
        throw new Error('Only the group leader can register for Minor Project 2');
      }

      // Validate member count (explicit check even though finalization should have checked)
      const activeMembers = group.members.filter(member => member.isActive);
      if (activeMembers.length < group.minMembers) {
        throw new Error(`Group must have at least ${group.minMembers} members to register. Current: ${activeMembers.length} members.`);
      }

      if (activeMembers.length > group.maxMembers) {
        throw new Error(`Group cannot have more than ${group.maxMembers} members. Current: ${activeMembers.length} members.`);
      }

      // Check if project is already registered for this group
      const existingProject = await Project.findOne({
        group: group._id,
        projectType: 'minor2',
        semester: 5,
        academicYear: student.academicYear
      }).session(session);

      if (existingProject) {
        throw new Error('Minor Project 2 is already registered for this group');
      }

      // Get faculty preference limit from system config
      const facultyPreferenceLimit = await SystemConfig.getConfigValue('sem5.facultyPreferenceLimit', 7);
      
      // Validate faculty preferences
      if (!facultyPreferences || facultyPreferences.length !== facultyPreferenceLimit) {
        throw new Error(`You must select exactly ${facultyPreferenceLimit} faculty preferences (current system requirement)`);
      }
      
      // Note: Existing projects with different preference counts are preserved
      // This validation only applies to NEW registrations

      // Validate that all faculty preferences are unique
      const facultyIds = facultyPreferences.map(p => p.faculty._id || p.faculty);
      const uniqueFacultyIds = [...new Set(facultyIds)];
      if (facultyIds.length !== uniqueFacultyIds.length) {
        throw new Error('All faculty preferences must be unique');
      }

      // Validate that all faculty exist
      const facultyValidationPromises = facultyIds.map(async (facultyId) => {
        const faculty = await Faculty.findById(facultyId).session(session);
        if (!faculty) {
          throw new Error(`Faculty with ID ${facultyId} not found`);
        }
        return faculty;
      });

      const validatedFaculty = await Promise.all(facultyValidationPromises);

      // Create project with group and faculty preferences
      const projectData = {
        title: title.trim(),
        description: title.trim(), // Use title as description for Minor Project 2
        projectType: 'minor2',
        student: student._id,
        group: group._id,
        groupLeader: group.leader, // Store the group leader
        semester: 5,
        academicYear: studentAcademicYear,
        status: 'registered',
        facultyPreferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1
        })),
        // Initialize faculty allocation fields
        currentFacultyIndex: 0,
        allocationHistory: []
      };

      const project = new Project(projectData);
      await project.save({ session });

      // Update group with project reference using findByIdAndUpdate to avoid pre-save middleware
      await Group.findByIdAndUpdate(
        group._id,
        { project: project._id },
        { session }
      );

      // Add project to ALL group members' currentProjects array
      const groupMembers = group.members.filter(m => m.isActive);
      
      for (const member of groupMembers) {
        const memberStudent = await Student.findById(member.student).session(session);
        if (memberStudent) {
          // Determine role based on whether they're the leader
          const role = member.role === 'leader' ? 'leader' : 'member';
          await memberStudent.addCurrentProject(project._id, role, 5);
        }
      }

      // Create FacultyPreference document for tracking allocation process
      const facultyPreferenceData = {
        student: student._id,
        project: project._id,
        group: group._id,
        semester: 5,
        academicYear: studentAcademicYear,
        status: 'pending',
        preferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1,
          submittedAt: new Date()
        }))
      };

      const facultyPreferenceDoc = new FacultyPreference(facultyPreferenceData);
      await facultyPreferenceDoc.save({ session });

      // Present project to first faculty (start the allocation process)
      try {
        await project.presentToCurrentFaculty();
      } catch (presentError) {
        // Don't fail registration if presentation fails - this is not critical
      }

      // Populate the response with group and faculty details
      await project.populate([
        { path: 'group', populate: { path: 'members.student', select: 'fullName misNumber contactNumber branch' } },
        { path: 'facultyPreferences.faculty', select: 'fullName department designation mode' }
      ]);
      
      res.status(201).json({
        success: true,
        data: {
          project: project,
          facultyPreference: facultyPreferenceDoc,
          allocationStatus: project.getAllocationStatus()
        },
        message: 'Minor Project 2 registered successfully'
      });
    });
  } catch (error) {
    console.error('Error registering Minor Project 2:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering Minor Project 2',
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

// Helper: Check if student needs Internship 1 (solo project)
const checkInternship1Eligibility = async (student) => {
  // Allow Sem 7 students or Sem 8 Type 1 students
  if (student.semester === 7) {
    // Sem 7: Check if student has chosen coursework track (no need to wait for finalization)
    const selection = student.getSemesterSelection(7);
    const chosenTrack = selection?.chosenTrack;
    
    if (!chosenTrack) {
      return { eligible: false, reason: 'Please select your track choice first.' };
    }
    if (chosenTrack !== 'coursework') {
      return { eligible: false, reason: 'Only students who have chosen the coursework track can register for Internship 1' };
    }
  } else if (student.semester === 8) {
    // Sem 8: Only Type 1 students can register for Internship 1
    const studentType = student.getSem8StudentType();
    if (studentType !== 'type1') {
      return { eligible: false, reason: 'Only Type 1 students (who completed 6-month internship in Sem 7) can register for Internship 1 in Sem 8' };
    }
  } else {
    return { eligible: false, reason: 'Internship 1 registration is only available for Semester 7 or Semester 8 Type 1 students' };
  }

  // Check summer internship application status (for both Sem 7 and Sem 8)
  // If approved: not eligible (Internship 1 not required)
  // If rejected (verified_fail/absent): eligible (must complete Internship 1 project)
  const InternshipApplication = require('../models/InternshipApplication');
  const summerAppSem7 = await InternshipApplication.findOne({
    student: student._id,
    semester: 7,
    type: 'summer'
  });
  
  const summerAppSem8 = await InternshipApplication.findOne({
    student: student._id,
    semester: 8,
    type: 'summer'
  });

  const approvedSummerApp = summerAppSem7 || summerAppSem8;
  if (approvedSummerApp && ['approved', 'verified_pass'].includes(approvedSummerApp.status)) {
    return { 
      eligible: false, 
      reason: 'You have an approved summer internship. Internship 1 is not required.',
      hasApprovedSummer: true
    };
  }

  // Check if Internship 1 project already exists (in Sem 7 or Sem 8)
  const existingProject = await Project.findOne({
    student: student._id,
    semester: { $in: [7, 8] },
    projectType: 'internship1',
    status: { $ne: 'cancelled' } // Exclude cancelled projects
  });

  if (existingProject) {
    return { 
      eligible: false, 
      reason: 'Internship 1 project already registered',
      existingProject: existingProject._id
    };
  }

  return { eligible: true };
};

// Sem 7: Register for Major Project 1 (similar to Minor Project 2 but for Sem 7)
const registerMajorProject1 = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const studentId = req.user.id;
      const { title, domain, facultyPreferences } = req.body;
      
      // Get student with session
      const student = await Student.findOne({ user: studentId }).session(session);
      if (!student) {
        throw new Error('Student not found');
      }

      // CRITICAL: Ensure this is B.Tech Semester 7 (M.Tech has separate Major Project 1 route)
      if (student.degree !== 'B.Tech') {
        throw new Error('This Major Project 1 registration is only available for B.Tech Semester 7 students. M.Tech students should use the M.Tech-specific route.');
      }

      // Check if student is in semester 7
      if (student.semester !== 7) {
        throw new Error('Major Project 1 is only available for Semester 7 students');
      }

      // Check eligibility for coursework
      const eligibility = checkSem7CourseworkEligibility(student);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      // Check window for Major Project 1 registration
      const windowStatus = await isWindowOpen('sem7.major1.preferenceWindow');
      if (!windowStatus.isOpen) {
        throw new Error(windowStatus.reason || 'Major Project 1 registration window is currently closed');
      }
      
      // Handle undefined academic year - try to find matching group first
      let studentAcademicYear = student.academicYear;
      
      if (!studentAcademicYear) {
        // Try to find any group for this student to get the academic year
        const anyGroup = await Group.findOne({
          'members.student': student._id,
          semester: 7
        }).session(session);
        
        if (anyGroup && anyGroup.academicYear) {
          studentAcademicYear = anyGroup.academicYear;
        } else {
          // Generate academic year based on current year
          const currentYear = new Date().getFullYear();
          const nextYear = currentYear + 1;
          studentAcademicYear = `${currentYear}-${nextYear.toString().slice(-2)}`;
        }
        
        // Update student with determined academic year
        student.academicYear = studentAcademicYear;
        await student.save({ session });
      }

      // Check if student is in a group (Sem 7 only - cannot use groups from previous semesters)
      const group = await Group.findOne({
        'members.student': student._id,
        semester: 7,
        academicYear: studentAcademicYear
      }).populate('members.student', 'fullName misNumber contactNumber branch').session(session);

      if (!group) {
        // Let's check if there are any groups for this student in any status
        const anyGroup = await Group.findOne({
          'members.student': student._id,
          semester: 7
        }).session(session);
        
        if (anyGroup) {
          throw new Error(`You are in a group but academic year mismatch. Group: ${anyGroup.academicYear}, Student: ${studentAcademicYear}`);
        }
        
        throw new Error('You must be in a group to register for Major Project 1. Please create or join a new group first.');
      }
      
      // Additional validation: Ensure group is strictly Sem 7
      if (group.semester !== 7) {
        throw new Error(`Invalid group semester. Major Project 1 requires a Semester 7 group. Found: Semester ${group.semester}`);
      }

      // Check if group is finalized
      if (group.status !== 'finalized') {
        throw new Error(`Your group must be finalized before registering for Major Project 1. Current status: ${group.status}. Please finalize your group first.`);
      }

      // Check if current student is the group leader
      const isGroupLeader = group.leader.toString() === student._id.toString();

      if (!isGroupLeader) {
        throw new Error('Only the group leader can register for Major Project 1');
      }

      // Check if project is already registered for this group
      const existingProject = await Project.findOne({
        group: group._id,
        projectType: 'major1',
        semester: 7,
        academicYear: student.academicYear
      }).session(session);

      if (existingProject) {
        throw new Error('Major Project 1 is already registered for this group');
      }

      // Get faculty preference limit from system config (use sem5 limit as default, can be overridden later)
      const facultyPreferenceLimit = await SystemConfig.getConfigValue('sem7.major1.facultyPreferenceLimit') || 
                                     await SystemConfig.getConfigValue('sem5.facultyPreferenceLimit', 7);
      
      // Validate faculty preferences
      if (!facultyPreferences || facultyPreferences.length !== facultyPreferenceLimit) {
        throw new Error(`You must select exactly ${facultyPreferenceLimit} faculty preferences (current system requirement)`);
      }

      // Validate that all faculty preferences are unique
      const facultyIds = facultyPreferences.map(p => p.faculty._id || p.faculty);
      const uniqueFacultyIds = [...new Set(facultyIds)];
      if (facultyIds.length !== uniqueFacultyIds.length) {
        throw new Error('All faculty preferences must be unique');
      }

      // Validate that all faculty exist
      const facultyValidationPromises = facultyIds.map(async (facultyId) => {
        const faculty = await Faculty.findById(facultyId).session(session);
        if (!faculty) {
          throw new Error(`Faculty with ID ${facultyId} not found`);
        }
        return faculty;
      });

      const validatedFaculty = await Promise.all(facultyValidationPromises);

      // Create project with group and faculty preferences
      const projectData = {
        title: title.trim(),
        description: title.trim(), // Use title as description for Major Project 1
        projectType: 'major1',
        student: student._id,
        group: group._id,
        groupLeader: group.leader, // Store the group leader
        semester: 7,
        academicYear: studentAcademicYear,
        status: 'registered',
        facultyPreferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1
        })),
        // Initialize faculty allocation fields
        currentFacultyIndex: 0,
        allocationHistory: []
      };

      const project = new Project(projectData);
      await project.save({ session });

      // Update group with project reference using findByIdAndUpdate to avoid pre-save middleware
      await Group.findByIdAndUpdate(
        group._id,
        { project: project._id },
        { session }
      );

      // Add project to ALL group members' currentProjects array
      const groupMembers = group.members.filter(m => m.isActive);
      
      for (const member of groupMembers) {
        const memberStudent = await Student.findById(member.student).session(session);
        if (memberStudent) {
          // Determine role based on whether they're the leader
          const role = member.role === 'leader' ? 'leader' : 'member';
          await memberStudent.addCurrentProject(project._id, role, 7);
        }
      }

      // Create FacultyPreference document for tracking allocation process
      const facultyPreferenceData = {
        student: student._id,
        project: project._id,
        group: group._id,
        semester: 7,
        academicYear: studentAcademicYear,
        status: 'pending',
        preferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1,
          submittedAt: new Date()
        }))
      };

      const facultyPreferenceDoc = new FacultyPreference(facultyPreferenceData);
      await facultyPreferenceDoc.save({ session });

      // Present project to first faculty (start the allocation process)
      try {
        await project.presentToCurrentFaculty();
      } catch (presentError) {
        // Don't fail registration if presentation fails - this is not critical
      }

      // Populate the response with group and faculty details
      await project.populate([
        { path: 'group', populate: { path: 'members.student', select: 'fullName misNumber contactNumber branch' } },
        { path: 'facultyPreferences.faculty', select: 'fullName department designation mode' }
      ]);
      
      res.status(201).json({
        success: true,
        data: {
          project: project,
          facultyPreference: facultyPreferenceDoc,
          allocationStatus: project.getAllocationStatus()
        },
        message: 'Major Project 1 registered successfully'
      });
    });
  } catch (error) {
    console.error('Error registering Major Project 1:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering Major Project 1',
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

const registerMTechSem3MajorProject = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const userId = req.user.id;
      const { title, domain, summary, facultyPreferences } = req.body;

      if (!title || !domain) {
        throw new Error('Project title and domain are required');
      }

      const student = await Student.findOne({ user: userId }).session(session);
      if (!student) {
        throw new Error('Student not found');
      }

      if (student.degree !== 'M.Tech' || student.semester !== 3) {
        throw new Error('Major Project 1 registration is only available for M.Tech Semester 3 students');
      }

      const sem3Selection = student.getSemesterSelection(3);
      const selectedTrack = sem3Selection?.finalizedTrack || sem3Selection?.chosenTrack;
      if (selectedTrack !== 'coursework') {
        throw new Error('Please choose the Major Project track before registering');
      }

      const existingProject = await Project.findOne({
        student: student._id,
        semester: 3,
        projectType: 'major1'
      }).session(session);

      if (existingProject) {
        throw new Error('Major Project 1 is already registered');
      }

      const allowedDomains = await SystemConfig.getConfigValue('sem3.majorProject.domains', []);
      if (Array.isArray(allowedDomains) && allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
        throw new Error('Invalid project domain selected');
      }

      if (!Array.isArray(facultyPreferences) || facultyPreferences.length === 0) {
        throw new Error('Please select at least one faculty preference');
      }

      const uniqueFaculty = [...new Set(facultyPreferences)];
      if (uniqueFaculty.length !== facultyPreferences.length) {
        throw new Error('Duplicate faculty preferences detected');
      }

      let academicYear = student.academicYear;
      if (!academicYear) {
        academicYear = generateAcademicYear();
        student.academicYear = academicYear;
        await student.save({ session });
      }

      const preferences = uniqueFaculty.map((facultyId, index) => ({
        faculty: facultyId,
        priority: index + 1
      }));

      const project = await Project.create([{
        title,
        description: summary || `Major Project 1 proposal submitted by ${student.fullName}`,
        domain,
        projectType: 'major1',
        student: student._id,
        semester: 3,
        academicYear,
        facultyPreferences: preferences,
        currentFacultyIndex: 0,
        status: 'registered'
      }], { session });

      await FacultyPreference.create([{
        student: student._id,
        project: project[0]._id,
        group: null,
        preferences,
        semester: 3,
        academicYear,
        status: 'pending',
        currentFacultyIndex: 0
      }], { session });

      // Present project to first faculty (start the allocation process)
      try {
        await project[0].presentToCurrentFaculty();
      } catch (presentError) {
        // Don't fail registration if presentation fails - this is not critical
        console.error('Error presenting M.Tech Sem 3 project to faculty:', presentError);
      }

      res.status(201).json({
        success: true,
        data: project[0],
        message: 'Major Project 1 registered successfully'
      });
    });
  } catch (error) {
    console.error('registerMTechSem3MajorProject error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to register Major Project 1'
    });
  } finally {
    await session.endSession();
  }
};

// Sem 7 & Sem 8: Check Internship 1 eligibility (helper for frontend)
const checkInternship1Status = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const eligibility = await checkInternship1Eligibility(student);
    
    // Also check if they already have an active (non-cancelled) Internship 1 project (in Sem 7 or Sem 8)
    const existingProject = await Project.findOne({
      student: student._id,
      semester: { $in: [7, 8] },
      projectType: 'internship1',
      status: { $ne: 'cancelled' } // Exclude cancelled projects
    }).populate('faculty', 'fullName department');

    // Check approved summer internship (for both Sem 7 and Sem 8)
    const InternshipApplication = require('../models/InternshipApplication');
    const approvedSummerAppSem7 = await InternshipApplication.findOne({
      student: student._id,
      semester: 7,
      type: 'summer',
      status: { $in: ['approved', 'verified_pass'] } // Support both statuses
    });
    
    const approvedSummerAppSem8 = await InternshipApplication.findOne({
      student: student._id,
      semester: 8,
      type: 'summer',
      status: { $in: ['approved', 'verified_pass'] } // Support both statuses
    });

    const approvedSummerApp = approvedSummerAppSem7 || approvedSummerAppSem8;

    return res.json({
      success: true,
      data: {
        eligible: eligibility.eligible,
        reason: eligibility.reason,
        hasApprovedSummer: !!approvedSummerApp,
        hasExistingProject: !!existingProject,
        existingProject: existingProject ? {
          id: existingProject._id,
          title: existingProject.title,
          status: existingProject.status,
          faculty: existingProject.faculty,
          semester: existingProject.semester
        } : null
      }
    });
  } catch (error) {
    console.error('Error checking Internship 1 status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking Internship 1 status',
      error: error.message
    });
  }
};

// Sem 7: Register for Internship 1 (solo project with faculty preferences)
const registerInternship1 = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const studentId = req.user.id;
      const { title, domain, facultyPreferences } = req.body;
      
      // Get student with session
      const student = await Student.findOne({ user: studentId }).session(session);
      if (!student) {
        throw new Error('Student not found');
      }

      // Check eligibility for Internship 1
      const eligibility = await checkInternship1Eligibility(student);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      // Determine target semester and window config
      const targetSemester = student.semester;
      const windowConfigKey = targetSemester === 8 
        ? 'sem8.internship1.registrationWindow' 
        : 'sem7.internship1.registrationWindow';
      
      // Check window for Internship 1 registration
      const windowStatus = await isWindowOpen(windowConfigKey);
      if (!windowStatus.isOpen) {
        // Fallback to Sem 7 window if Sem 8 window doesn't exist
        if (targetSemester === 8) {
          const fallbackWindow = await isWindowOpen('sem7.internship1.registrationWindow');
          if (!fallbackWindow.isOpen) {
            throw new Error(windowStatus.reason || fallbackWindow.reason || 'Internship 1 registration window is currently closed');
          }
        } else {
          throw new Error(windowStatus.reason || 'Internship 1 registration window is currently closed');
        }
      }

      // Handle undefined academic year
      let studentAcademicYear = student.academicYear;
      
      if (!studentAcademicYear) {
        // Generate academic year based on current year
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        studentAcademicYear = `${currentYear}-${nextYear.toString().slice(-2)}`;
        
        // Update student with determined academic year
        student.academicYear = studentAcademicYear;
        await student.save({ session });
      }

      // Check if Internship 1 project already exists (exclude cancelled projects)
      // Check in both Sem 7 and Sem 8 to prevent duplicates
      const existingProject = await Project.findOne({
        student: student._id,
        projectType: 'internship1',
        semester: { $in: [7, 8] },
        academicYear: studentAcademicYear,
        status: { $ne: 'cancelled' } // Exclude cancelled projects - allow re-registration after track change
      }).session(session);

      if (existingProject) {
        throw new Error('Internship 1 project is already registered');
      }

      // Get faculty preference limit from system config (semester-specific)
      // Try semester-specific config first, then fallback to Sem 7 config, then Sem 5 config, then default
      let facultyPreferenceLimit;
      if (targetSemester === 8) {
        // For Sem 8: Try Sem 8 specific config, then Sem 7 config, then default to 5
        // Note: We don't fallback to sem5.facultyPreferenceLimit (which is 7) for Internship 1
        const sem8Limit = await SystemConfig.getConfigValue('sem8.internship1.facultyPreferenceLimit');
        const sem7Limit = await SystemConfig.getConfigValue('sem7.internship1.facultyPreferenceLimit');
        facultyPreferenceLimit = (sem8Limit !== null && sem8Limit !== undefined) ? sem8Limit :
                                 (sem7Limit !== null && sem7Limit !== undefined) ? sem7Limit :
                                 5; // Default 5 for Internship 1
      } else {
        // For Sem 7: Try Sem 7 specific config, then default to 5
        // Note: We don't fallback to sem5.facultyPreferenceLimit (which is 7) for Internship 1
        const sem7Limit = await SystemConfig.getConfigValue('sem7.internship1.facultyPreferenceLimit');
        facultyPreferenceLimit = (sem7Limit !== null && sem7Limit !== undefined) ? sem7Limit :
                                 5; // Default 5 for Internship 1
      }
      
      // Validate faculty preferences
      if (!facultyPreferences || facultyPreferences.length !== facultyPreferenceLimit) {
        throw new Error(`You must select exactly ${facultyPreferenceLimit} faculty preferences (current system requirement)`);
      }

      // Validate that all faculty preferences are unique
      const facultyIds = facultyPreferences.map(p => p.faculty._id || p.faculty);
      const uniqueFacultyIds = [...new Set(facultyIds)];
      if (facultyIds.length !== uniqueFacultyIds.length) {
        throw new Error('All faculty preferences must be unique');
      }

      // Validate that all faculty exist
      const facultyValidationPromises = facultyIds.map(async (facultyId) => {
        const faculty = await Faculty.findById(facultyId).session(session);
        if (!faculty) {
          throw new Error(`Faculty with ID ${facultyId} not found`);
        }
        return faculty;
      });

      const validatedFaculty = await Promise.all(facultyValidationPromises);

      // Create project (solo, no group) with faculty preferences
      const projectData = {
        title: title.trim(),
        description: title.trim(), // Use title as description
        domain: domain ? domain.trim() : undefined, // Store domain if provided
        projectType: 'internship1',
        student: student._id,
        // No group for solo projects
        semester: targetSemester, // Use target semester (7 or 8)
        academicYear: studentAcademicYear,
        status: 'registered',
        isInternship: true, // Mark as internship project
        facultyPreferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1
        })),
        // Initialize faculty allocation fields
        currentFacultyIndex: 0,
        allocationHistory: []
      };

      const project = new Project(projectData);
      await project.save({ session });

      // Add project to student's currentProjects array
      await student.addCurrentProject(project._id, 'solo', targetSemester);

      // Create FacultyPreference document for tracking allocation process
      const facultyPreferenceData = {
        student: student._id,
        project: project._id,
        // No group for solo projects
        semester: targetSemester, // Use target semester (7 or 8)
        academicYear: studentAcademicYear,
        status: 'pending',
        currentFacultyIndex: 0, // Initialize to 0 to match Project's currentFacultyIndex
        preferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1,
          submittedAt: new Date()
        }))
      };

      const facultyPreferenceDoc = new FacultyPreference(facultyPreferenceData);
      await facultyPreferenceDoc.save({ session });

      // Present project to first faculty (start the allocation process)
      // This adds to allocation history but doesn't change currentFacultyIndex (stays at 0)
      try {
        await project.presentToCurrentFaculty();
      } catch (presentError) {
        // Don't fail registration if presentation fails - this is not critical
        console.error('Error presenting project to faculty:', presentError);
      }

      // Populate the response with faculty details
      await project.populate([
        { path: 'facultyPreferences.faculty', select: 'fullName department designation mode' }
      ]);
      
      res.status(201).json({
        success: true,
        data: {
          project: project,
          facultyPreference: facultyPreferenceDoc,
          allocationStatus: project.getAllocationStatus()
        },
        message: 'Internship 1 registered successfully'
      });
    });
  } catch (error) {
    console.error('Error registering Internship 1:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering Internship 1',
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

// Sem 8: Check if student needs Internship 2 (solo project)
const checkInternship2Status = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const status = await checkInternship2Eligibility(student);
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error checking Internship 2 status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking Internship 2 status',
      error: error.message
    });
  }
};

// Helper: Check if student needs Internship 2 (solo project)
const checkInternship2Eligibility = async (student) => {
  if (student.semester !== 8) {
    return { eligible: false, reason: 'Not in semester 8' };
  }

  // Check if student has chosen coursework track (major2) - both Type 1 and Type 2 can have Internship 2
  const selection = student.getSemesterSelection(8);
  const chosenTrack = selection?.chosenTrack;
  const finalizedTrack = selection?.finalizedTrack;
  const selectedTrack = finalizedTrack || chosenTrack;
  
  if (!selectedTrack) {
    return { eligible: false, reason: 'Please select your track choice first.' };
  }
  
  // Internship 2 is only for students on coursework track
  // Type 1: auto-enrolled in 'coursework' track
  // Type 2: can choose 'major2' track (which maps to coursework)
  // Both tracks are valid for Internship 2
  if (selectedTrack !== 'coursework' && selectedTrack !== 'major2') {
    return { eligible: false, reason: 'Only students on coursework track (Type 1) or major2 track (Type 2) can register for Internship 2' };
  }

  // Check summer internship application status for semester 8
  // If approved: not eligible (Internship 2 not required)
  // If rejected (verified_fail/absent): eligible (must complete Internship 2 project)
  const InternshipApplication = require('../models/InternshipApplication');
  const summerApp = await InternshipApplication.findOne({
    student: student._id,
    semester: 8,
    type: 'summer'
  });

  if (summerApp) {
    if (['approved', 'verified_pass'].includes(summerApp.status)) {
      return { 
        eligible: false, 
        reason: 'You have an approved summer internship. Internship 2 is not required.',
        hasApprovedSummer: true
      };
    }
    // If rejected (verified_fail or absent), student is eligible for Internship 2 project
  }

  // Check if Internship 2 project already exists
  const existingProject = await Project.findOne({
    student: student._id,
    semester: 8,
    projectType: 'internship2'
  });

  if (existingProject) {
    return { 
      eligible: false, 
      reason: 'Internship 2 project already registered',
      existingProject: existingProject._id
    };
  }

  return { eligible: true };
};

// Sem 8: Register for Major Project 2 (group-based for Type 1, solo for Type 2)
const registerMajorProject2 = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const studentId = req.user.id;
      const { title, domain, facultyPreferences } = req.body;
      
      // Get student with session
      const student = await Student.findOne({ user: studentId }).session(session);
      if (!student) {
        throw new Error('Student not found');
      }

      // Check eligibility for coursework (major2)
      const eligibility = checkCourseworkEligibility(student, 8);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      // Check window for Major Project 2 registration
      const windowStatus = await isWindowOpen('sem8.major2.preferenceWindow');
      if (!windowStatus.isOpen) {
        throw new Error(windowStatus.reason || 'Major Project 2 registration window is currently closed');
      }
      
      // Handle undefined academic year
      let studentAcademicYear = student.academicYear;
      
      if (!studentAcademicYear) {
        // Try to find any group for this student to get the academic year (for Type 1)
        const anyGroup = await Group.findOne({
          'members.student': student._id,
          semester: 8
        }).session(session);
        
        if (anyGroup && anyGroup.academicYear) {
          studentAcademicYear = anyGroup.academicYear;
        } else {
          // Generate academic year based on current year
          const currentYear = new Date().getFullYear();
          const nextYear = currentYear + 1;
          studentAcademicYear = `${currentYear}-${nextYear.toString().slice(-2)}`;
        }
        
        // Update student with determined academic year
        student.academicYear = studentAcademicYear;
        await student.save({ session });
      }

      // Check if student is in semester 8
      if (student.semester !== 8) {
        throw new Error('Major Project 2 is only available for Semester 8 students');
      }

      // Determine student type and check group requirement
      const studentType = student.getSem8StudentType();
      let group = null;
      let isGroupLeader = false;

      if (studentType === 'type1') {
        // Type 1: Must be in a group (group-based project)
        group = await Group.findOne({
          'members.student': student._id,
          semester: 8,
          academicYear: studentAcademicYear
        }).populate('members.student', 'fullName misNumber contactNumber branch').session(session);

        if (!group) {
          throw new Error('You must be in a group to register for Major Project 2. Please create or join a group first.');
        }
        
        if (group.semester !== 8) {
          throw new Error(`Invalid group semester. Major Project 2 requires a Semester 8 group. Found: Semester ${group.semester}`);
        }

        // Check if group is finalized
        if (group.status !== 'finalized') {
          throw new Error(`Your group must be finalized before registering for Major Project 2. Current status: ${group.status}. Please finalize your group first.`);
        }

        // Check if current student is the group leader
        isGroupLeader = group.leader.toString() === student._id.toString();

        if (!isGroupLeader) {
          throw new Error('Only the group leader can register for Major Project 2');
        }

        // Check if project is already registered for this group
        const existingGroupProject = await Project.findOne({
          group: group._id,
          projectType: 'major2',
          semester: 8,
          academicYear: studentAcademicYear,
          status: { $ne: 'cancelled' }
        }).session(session);

        if (existingGroupProject) {
          throw new Error('Major Project 2 is already registered for this group');
        }
      } else if (studentType === 'type2') {
        // Type 2: Solo project (no group)
        // Check if student already has a Major Project 2
        const existingSoloProject = await Project.findOne({
          student: student._id,
          projectType: 'major2',
          semester: 8,
          academicYear: studentAcademicYear,
          status: { $ne: 'cancelled' }
        }).session(session);

        if (existingSoloProject) {
          throw new Error('Major Project 2 is already registered');
        }
      } else {
        throw new Error('Unable to determine student type for Major Project 2 registration');
      }

      // Get faculty preference limit from system config based on student type
      let facultyPreferenceLimit;
      let allowedFacultyTypes;
      if (studentType === 'type1') {
        // Type 1: Group-based project
        facultyPreferenceLimit = await SystemConfig.getConfigValue('sem8.major2.group.facultyPreferenceLimit') || 5;
        allowedFacultyTypes = await SystemConfig.getConfigValue('sem8.major2.group.allowedFacultyTypes') || ['Regular', 'Adjunct', 'On Lien'];
      } else if (studentType === 'type2') {
        // Type 2: Solo project
        facultyPreferenceLimit = await SystemConfig.getConfigValue('sem8.major2.solo.facultyPreferenceLimit') || 5;
        allowedFacultyTypes = await SystemConfig.getConfigValue('sem8.major2.solo.allowedFacultyTypes') || ['Regular', 'Adjunct', 'On Lien'];
      } else {
        // Fallback (should not reach here)
        facultyPreferenceLimit = 5;
        allowedFacultyTypes = ['Regular', 'Adjunct', 'On Lien'];
      }
      
      // Validate faculty preferences
      if (!facultyPreferences || facultyPreferences.length !== facultyPreferenceLimit) {
        throw new Error(`You must select exactly ${facultyPreferenceLimit} faculty preferences (current system requirement)`);
      }

      // Validate that all faculty preferences are unique
      const facultyIds = facultyPreferences.map(p => p.faculty._id || p.faculty);
      const uniqueFacultyIds = [...new Set(facultyIds)];
      if (facultyIds.length !== uniqueFacultyIds.length) {
        throw new Error('All faculty preferences must be unique');
      }

      // Validate that all faculty exist and are of allowed types
      const facultyValidationPromises = facultyIds.map(async (facultyId) => {
        const faculty = await Faculty.findById(facultyId).session(session);
        if (!faculty) {
          throw new Error(`Faculty with ID ${facultyId} not found`);
        }
        // Validate faculty type is allowed
        if (!allowedFacultyTypes.includes(faculty.mode)) {
          throw new Error(`Faculty ${faculty.fullName} (${faculty.mode}) is not allowed. Only ${allowedFacultyTypes.join(', ')} faculty types are permitted for Major Project 2 ${studentType === 'type1' ? '(group)' : '(solo)'}.`);
        }
        return faculty;
      });

      const validatedFaculty = await Promise.all(facultyValidationPromises);

      // Create project with group (Type 1) or solo (Type 2) and faculty preferences
      const projectData = {
        title: title.trim(),
        description: title.trim(), // Use title as description for Major Project 2
        projectType: 'major2',
        student: student._id,
        semester: 8,
        academicYear: studentAcademicYear,
        status: 'registered',
        facultyPreferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1
        })),
        // Initialize faculty allocation fields
        currentFacultyIndex: 0,
        allocationHistory: []
      };

      // Add group for Type 1 students
      if (group) {
        projectData.group = group._id;
        projectData.groupLeader = group.leader;
      }

      const project = new Project(projectData);
      await project.save({ session });

      // Update group with project reference (Type 1 only)
      if (group) {
        await Group.findByIdAndUpdate(
          group._id,
          { project: project._id },
          { session }
        );

        // Add project to ALL group members' currentProjects array
        const groupMembers = group.members.filter(m => m.isActive);
        
        for (const member of groupMembers) {
          const memberStudent = await Student.findById(member.student).session(session);
          if (memberStudent) {
            // Determine role based on whether they're the leader
            const role = member.role === 'leader' ? 'leader' : 'member';
            await memberStudent.addCurrentProject(project._id, role, 8);
          }
        }
      } else {
        // Solo project (Type 2): Add to student's currentProjects
        await student.addCurrentProject(project._id, 'solo', 8);
      }

      // Create FacultyPreference document for tracking allocation process
      const facultyPreferenceData = {
        student: student._id,
        project: project._id,
        group: group ? group._id : undefined,
        semester: 8,
        academicYear: studentAcademicYear,
        status: 'pending',
        currentFacultyIndex: 0,
        preferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1,
          submittedAt: new Date()
        }))
      };

      const facultyPreferenceDoc = new FacultyPreference(facultyPreferenceData);
      await facultyPreferenceDoc.save({ session });

      // Present project to first faculty (start the allocation process)
      try {
        await project.presentToCurrentFaculty();
      } catch (presentError) {
        console.error('Error presenting project to faculty:', presentError);
      }

      // Populate the response with faculty details
      await project.populate([
        { path: 'facultyPreferences.faculty', select: 'fullName department designation mode' },
        { path: 'group', select: 'name members' }
      ]);
      
      res.status(201).json({
        success: true,
        data: {
          project: project,
          facultyPreference: facultyPreferenceDoc,
          allocationStatus: project.getAllocationStatus()
        },
        message: 'Major Project 2 registered successfully'
      });
    });
  } catch (error) {
    console.error('Error registering Major Project 2:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering Major Project 2',
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

// Sem 8: Register for Internship 2 (solo project with faculty preferences)
const registerInternship2 = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const studentId = req.user.id;
      const { title, domain, facultyPreferences } = req.body;
      
      // Get student with session
      const student = await Student.findOne({ user: studentId }).session(session);
      if (!student) {
        throw new Error('Student not found');
      }

      // Check eligibility for Internship 2
      const eligibility = await checkInternship2Eligibility(student);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      // Check window for Internship 2 registration
      const windowStatus = await isWindowOpen('sem8.internship2.registrationWindow');
      if (!windowStatus.isOpen) {
        throw new Error(windowStatus.reason || 'Internship 2 registration window is currently closed');
      }

      // Handle undefined academic year
      let studentAcademicYear = student.academicYear;
      
      if (!studentAcademicYear) {
        // Generate academic year based on current year
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        studentAcademicYear = `${currentYear}-${nextYear.toString().slice(-2)}`;
        
        // Update student with determined academic year
        student.academicYear = studentAcademicYear;
        await student.save({ session });
      }

      // Check if student is in semester 8
      if (student.semester !== 8) {
        throw new Error('Internship 2 is only available for Semester 8 students');
      }

      // Check if Internship 2 project already exists (exclude cancelled projects)
      const existingProject = await Project.findOne({
        student: student._id,
        projectType: 'internship2',
        semester: 8,
        academicYear: studentAcademicYear,
        status: { $ne: 'cancelled' }
      }).session(session);

      if (existingProject) {
        throw new Error('Internship 2 project is already registered');
      }

      // Get faculty preference limit from system config
      const facultyPreferenceLimit = await SystemConfig.getConfigValue('sem8.internship2.facultyPreferenceLimit') || 5;
      
      // Validate faculty preferences
      if (!facultyPreferences || facultyPreferences.length !== facultyPreferenceLimit) {
        throw new Error(`You must select exactly ${facultyPreferenceLimit} faculty preferences (current system requirement)`);
      }

      // Validate that all faculty preferences are unique
      const facultyIds = facultyPreferences.map(p => p.faculty._id || p.faculty);
      const uniqueFacultyIds = [...new Set(facultyIds)];
      if (facultyIds.length !== uniqueFacultyIds.length) {
        throw new Error('All faculty preferences must be unique');
      }

      // Get allowed faculty types from system config
      const allowedFacultyTypes = await SystemConfig.getConfigValue('sem8.internship2.allowedFacultyTypes') || ['Regular', 'Adjunct', 'On Lien'];
      
      // Validate that all faculty exist and are of allowed types
      const facultyValidationPromises = facultyIds.map(async (facultyId) => {
        const faculty = await Faculty.findById(facultyId).session(session);
        if (!faculty) {
          throw new Error(`Faculty with ID ${facultyId} not found`);
        }
        // Validate faculty type is allowed
        if (!allowedFacultyTypes.includes(faculty.mode)) {
          throw new Error(`Faculty ${faculty.fullName} (${faculty.mode}) is not allowed. Only ${allowedFacultyTypes.join(', ')} faculty types are permitted for Internship 2.`);
        }
        return faculty;
      });

      const validatedFaculty = await Promise.all(facultyValidationPromises);

      // Create project (solo, no group) with faculty preferences
      const projectData = {
        title: title.trim(),
        description: title.trim(), // Use title as description
        domain: domain ? domain.trim() : undefined, // Store domain if provided
        projectType: 'internship2',
        student: student._id,
        // No group for solo projects
        semester: 8,
        academicYear: studentAcademicYear,
        status: 'registered',
        isInternship: true, // Mark as internship project
        facultyPreferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1
        })),
        // Initialize faculty allocation fields
        currentFacultyIndex: 0,
        allocationHistory: []
      };

      // Ensure projectType is explicitly set to 'internship2' (safety check)
      projectData.projectType = 'internship2';
      
      const project = new Project(projectData);
      
      // Double-check projectType before saving
      if (project.projectType !== 'internship2') {
        project.projectType = 'internship2';
      }
      
      await project.save({ session });

      // Add project to student's currentProjects array
      // Note: addCurrentProject calls save() which needs to use the same session
      const existingCurrentProject = student.currentProjects.find(cp => 
        cp.project.toString() === project._id.toString()
      );
      
      if (!existingCurrentProject) {
        student.currentProjects.push({
          project: project._id,
          role: 'solo',
          semester: 8,
          status: 'active',
          joinedAt: new Date()
        });
        await student.save({ session });
      }

      // Create FacultyPreference document for tracking allocation process
      const facultyPreferenceData = {
        student: student._id,
        project: project._id,
        // No group for solo projects
        semester: 8,
        academicYear: studentAcademicYear,
        status: 'pending',
        currentFacultyIndex: 0, // Initialize to 0 to match Project's currentFacultyIndex
        preferences: facultyPreferences.map((pref, index) => ({
          faculty: pref.faculty._id || pref.faculty,
          priority: index + 1,
          submittedAt: new Date()
        }))
      };

      const facultyPreferenceDoc = new FacultyPreference(facultyPreferenceData);
      await facultyPreferenceDoc.save({ session });

      // Present project to first faculty (start the allocation process)
      try {
        await project.presentToCurrentFaculty();
      } catch (presentError) {
        console.error('Error presenting project to faculty:', presentError);
      }

      // Populate the response with faculty details
      await project.populate([
        { path: 'facultyPreferences.faculty', select: 'fullName department designation mode' }
      ]);
      
      res.status(201).json({
        success: true,
        data: {
          project: project,
          facultyPreference: facultyPreferenceDoc,
          allocationStatus: project.getAllocationStatus()
        },
        message: 'Internship 2 registered successfully'
      });
    });
  } catch (error) {
    console.error('Error registering Internship 2:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering Internship 2',
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

// Update project details
const updateProject = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: projectId } = req.params;
    const updateData = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: projectId, 
      student: student._id 
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Update project
    Object.assign(project, updateData);
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

// Submit project deliverables
const submitDeliverables = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { projectId } = req.params;
    const { deliverables } = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: projectId, 
      student: student._id 
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Update deliverables
    if (deliverables && Array.isArray(deliverables)) {
      project.deliverables = deliverables.map(deliverable => ({
        ...deliverable,
        submitted: true,
        submittedAt: new Date()
      }));
    }

    await project.save();

    res.json({
      success: true,
      data: project,
      message: 'Deliverables submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting deliverables:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting deliverables',
      error: error.message
    });
  }
};

// Get specific project by ID
const getProjectById = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: id, 
      student: student._id 
    })
    .populate('faculty', 'fullName department designation')
    .populate('group', 'name members');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project,
      message: 'Project retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project',
      error: error.message
    });
  }
};

// Add internship record
const addInternship = async (req, res) => {
  try {
    const studentId = req.user.id;
    const internshipData = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student can apply for internships
    if (!student.canApplyInternships()) {
      return res.status(400).json({
        success: false,
        message: 'Student cannot apply for internships in current semester'
      });
    }

    // Add internship to student
    await student.addInternship(internshipData);

    res.status(201).json({
      success: true,
      message: 'Internship record added successfully'
    });
  } catch (error) {
    console.error('Error adding internship:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding internship',
      error: error.message
    });
  }
};

// Sem 4 specific: Submit PPT
const submitPPT = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: projectId } = req.params;
    const { submissionNotes } = req.body;
    
    // Get file info from multer upload
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No PPT file uploaded'
      });
    }
    
    const filePath = file.path;
    const fileSize = file.size;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: projectId, 
      student: student._id,
      projectType: 'minor1',
      semester: 4
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Sem 4 Minor Project 1 not found'
      });
    }

    // Prevent modifications to previous semester projects
    // Exception: Sem 6 students can continue their Sem 5 project
    const isSem6ContinuingSem5 = student.semester === 6 && 
                                  project.semester === 5 && 
                                  project.isContinuation === true;
    
    if (student.semester > project.semester && !isSem6ContinuingSem5) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify previous semester projects. This project belongs to a previous semester.'
      });
    }

    // Submit PPT with comprehensive metadata
    await project.submitPPT({
      filePath,
      fileSize,
      filename: file.filename,
      originalName: file.originalname,
      submissionNotes,
      uploadedBy: studentId, // Store the user ID who uploaded
      uploadMetadata: {
        batchInfo: student.academicYear || project.academicYear || null,
        degreeProgram: student.degree || 'B.Tech',
        semester: project.semester,
        projectType: project.projectType,
        storagePath: file.path // Full storage path
      },
      submitted: true,
      submittedAt: new Date()
    });

    res.json({
      success: true,
      data: project.getSem4Status(),
      message: 'PPT submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting PPT:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting PPT',
      error: error.message
    });
  }
};

// Sem 4 specific: Remove PPT
const removePPT = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: projectId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: projectId, 
      student: student._id,
      projectType: 'minor1',
      semester: 4
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Sem 4 Minor Project 1 not found'
      });
    }

    // Prevent modifications to previous semester projects
    // Exception: Sem 6 students can continue their Sem 5 project
    const isSem6ContinuingSem5 = student.semester === 6 && 
                                  project.semester === 5 && 
                                  project.isContinuation === true;
    
    if (student.semester > project.semester && !isSem6ContinuingSem5) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify previous semester projects. This project belongs to a previous semester.'
      });
    }

    // Find and remove PPT deliverable
    const pptDeliverable = project.deliverables.find(d => d.name.toLowerCase().includes('ppt'));
    if (!pptDeliverable) {
      return res.status(404).json({
        success: false,
        message: 'No PPT found to remove'
      });
    }

    // Delete the file from filesystem if it exists
    const fs = require('fs');
    if (pptDeliverable.filePath && fs.existsSync(pptDeliverable.filePath)) {
      fs.unlinkSync(pptDeliverable.filePath);
    }

    // Remove the deliverable from the array
    project.deliverables = project.deliverables.filter(d => !d.name.toLowerCase().includes('ppt'));
    await project.save();

    res.json({
      success: true,
      data: project.getSem4Status(),
      message: 'PPT removed successfully'
    });
  } catch (error) {
    console.error('Error removing PPT:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing PPT',
      error: error.message
    });
  }
};

// Sem 4 specific: Schedule presentation
const schedulePresentation = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: projectId } = req.params;
    const { presentationDate, presentationVenue, presentationDuration, panelMembers } = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: projectId, 
      student: student._id,
      projectType: 'minor1',
      semester: 4
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Sem 4 Minor Project 1 not found'
      });
    }

    // Schedule presentation
    await project.schedulePresentation({
      presentationDate: new Date(presentationDate),
      presentationVenue,
      presentationDuration,
      panelMembers
    });

    res.json({
      success: true,
      data: project.getSem4Status(),
      message: 'Presentation scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling presentation:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling presentation',
      error: error.message
    });
  }
};

// Sem 4 specific: Get project status
const getSem4ProjectStatus = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: projectId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({ 
      _id: projectId, 
      student: student._id,
      projectType: 'minor1',
      semester: 4
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Sem 4 Minor Project 1 not found'
      });
    }

    res.json({
      success: true,
      data: project.getSem4Status(),
      message: 'Sem 4 project status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting Sem 4 project status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting project status',
      error: error.message
    });
  }
};

// Helper: Check if student is eligible for coursework in Sem 7 or Sem 8
// CRITICAL: This function is only for B.Tech students. M.Tech students have separate workflows.
const checkCourseworkEligibility = (student, semester) => {
  // CRITICAL: Ensure this is B.Tech (M.Tech has separate workflows)
  if (student.degree !== 'B.Tech') {
    return { eligible: false, reason: `Coursework eligibility check is only for B.Tech students. M.Tech students have separate workflows.` };
  }
  
  if (student.semester !== semester) {
    return { eligible: false, reason: `Not in semester ${semester}` };
  }
  
  // Tracks are auto-finalized by default, so check finalizedTrack or chosenTrack
  const finalizedTrack = student.getFinalizedTrack(semester);
  const chosenTrack = (student.getSemesterSelection(semester) || {}).chosenTrack;
  const selectedTrack = finalizedTrack || chosenTrack;
  
  if (!selectedTrack) {
    return { eligible: false, reason: 'Please select your track choice first.' };
  }
  
  // For Sem 7: check for 'coursework' track
  if (semester === 7) {
    if (selectedTrack !== 'coursework') {
      return { eligible: false, reason: `Student is on ${selectedTrack} track, not coursework` };
    }
    return { eligible: true };
  }
  
  // For Sem 8: check for 'coursework' (Type 1) or 'major2' (Type 2) track
  // Type 1 students are auto-enrolled in 'coursework' track
  // Type 2 students choose 'major2' track
  if (semester === 8) {
    if (selectedTrack !== 'coursework' && selectedTrack !== 'major2') {
      return { eligible: false, reason: `Student is on ${selectedTrack} track. Major Project 2 requires coursework track (Type 1) or major2 track (Type 2)` };
    }
    return { eligible: true };
  }
  
  return { eligible: false, reason: `Coursework eligibility check not implemented for semester ${semester}` };
};

// Helper: Check if student is eligible for coursework in Sem 7 (backward compatibility)
const checkSem7CourseworkEligibility = (student) => {
  return checkCourseworkEligibility(student, 7);
};

// Sem 5 enhanced: Create group with leader selection and bulk invites
const createGroup = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { name, description, memberIds = [], maxMembers = 5 } = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // CRITICAL: Ensure degree is B.Tech for group formation (M.Tech students don't form groups in B.Tech workflows)
    // M.Tech students have separate workflows and should not form groups through this route
    if (student.degree !== 'B.Tech') {
      return res.status(400).json({
        success: false,
        message: 'Group formation is only available for B.Tech students. M.Tech students have separate project workflows.'
      });
    }

    // Check if student can form groups - Sem 5, Sem 7 (coursework), and Sem 8 Type 1 (coursework) students should be allowed
    if (student.semester === 5) {
      // Semester 5 students explicitly allowed for Minor Project 2
    } else if (student.semester === 7) {
      // Sem 7: Only coursework students can form groups for Major Project 1
      // Tracks are auto-finalized by default
      const finalizedTrack = student.getFinalizedTrack(7);
      const chosenTrack = (student.getSemesterSelection(7) || {}).chosenTrack;
      const selectedTrack = finalizedTrack || chosenTrack;
      
      if (!selectedTrack) {
        return res.status(400).json({
          success: false,
          message: 'Please select your track choice first.'
        });
      }
      if (selectedTrack !== 'coursework') {
        return res.status(400).json({
          success: false,
          message: 'Only students finalized for coursework can form groups for Major Project 1. Please ensure your track is finalized by admin.'
        });
      }
      
      // Check window for Sem 7 group formation
      const windowStatus = await isWindowOpen('sem7.major1.groupFormationWindow');
      if (!windowStatus.isOpen) {
        return res.status(403).json({
          success: false,
          message: windowStatus.reason || 'Group formation window is currently closed',
          windowStart: windowStatus.start,
          windowEnd: windowStatus.end
        });
      }
    } else if (student.semester === 8) {
      // Sem 8: Only Type 1 students (auto-enrolled in coursework) can form groups for Major Project 2
      const studentType = student.getSem8StudentType();
      if (studentType !== 'type1') {
        return res.status(400).json({
          success: false,
          message: 'Only Type 1 students (completed 6-month internship in Sem 7) can form groups for Major Project 2. Type 2 students must do solo Major Project 2.'
        });
      }
      
      // Verify they are on coursework track
      // Type 1 students have 'coursework' stored, Type 2 students choosing Major Project 2 have 'major2' (converted from 'coursework')
      const finalizedTrack = student.getFinalizedTrack(8);
      const chosenTrack = (student.getSemesterSelection(8) || {}).chosenTrack;
      const selectedTrack = finalizedTrack || chosenTrack;
      
      // Type 1 students have 'coursework' track, which is valid for Major Project 2
      if (!selectedTrack || (selectedTrack !== 'coursework' && selectedTrack !== 'major2')) {
        return res.status(400).json({
          success: false,
          message: 'Only students on coursework track can form groups for Major Project 2.'
        });
      }
      
      // Check window for Sem 8 group formation
      const windowStatus = await isWindowOpen('sem8.major2.groupFormationWindow');
      if (!windowStatus.isOpen) {
        return res.status(403).json({
          success: false,
          message: windowStatus.reason || 'Group formation window is currently closed',
          windowStart: windowStatus.start,
          windowEnd: windowStatus.end
        });
      }
    } else if (!student.canFormGroups()) {
      return res.status(400).json({
        success: false,
        message: 'Student cannot form groups in current semester'
      });
    }

    // Check if creator is already in a group for this semester
    const existingGroup = await Group.findOne({
      'members.student': student._id,
      semester: student.semester
    });

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'Student is already in a group for this semester'
      });
    }

    // Check if student has existing memberships - clean them up if they're orphaned
    const studentExistingMemberships = student.groupMemberships.filter(gm => 
      gm.semester === student.semester && gm.isActive === true
    );

    if (studentExistingMemberships.length > 0) {
      // Check if these memberships are valid (group still exists and active)
      const memberGroupIds = studentExistingMemberships.map(gm => gm.group);
      const validGroups = await Group.find({
        _id: { $in: memberGroupIds },
        status: { $in: ['open', 'locked'] }
      });
      
      if (validGroups.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Student is already in a group for this semester'
        });
      }
      
      // Clean up orphaned/stale memberships in semester
      student.groupMemberships = student.groupMemberships.filter(gm => 
        !(gm.semester === student.semester && gm.isActive === true)
      );
      student.groupId = null;
      await student.save();
      
      // Also refresh after saving to ensure we have the updated data
      await student.refresh;
    }

    // Creator is always the leader in the new approach
    // No external leader selection - creator becomes leader automatically

    // Fetch min/max group members from admin config based on semester
    let configMinMembers = 4; // Default fallback
    let configMaxMembers = 5; // Default fallback
    
    // Determine config key prefix based on semester
    // Use sem5, sem7.major1, sem8.major2 pattern (sem7 and sem8 configs may not exist yet, will fallback to defaults)
    let minConfigKey, maxConfigKey;
    if (student.semester === 7) {
      // Sem 7: Major Project 1 uses sem7.major1.minGroupMembers
      minConfigKey = 'sem7.major1.minGroupMembers';
      maxConfigKey = 'sem7.major1.maxGroupMembers';
    } else if (student.semester === 8) {
      // Sem 8: Major Project 2 uses sem8.major2.group.minGroupMembers (for Type 1 group-based projects)
      minConfigKey = 'sem8.major2.group.minGroupMembers';
      maxConfigKey = 'sem8.major2.group.maxGroupMembers';
    } else {
      // Sem 5: Minor Project 2 uses sem5.minGroupMembers
      minConfigKey = 'sem5.minGroupMembers';
      maxConfigKey = 'sem5.maxGroupMembers';
    }
    
    try {
      const [minConfig, maxConfig] = await Promise.all([
        SystemConfig.getConfigValue(minConfigKey, 4),
        SystemConfig.getConfigValue(maxConfigKey, 5)
      ]);
      
      configMinMembers = parseInt(minConfig) || 4;
      configMaxMembers = parseInt(maxConfig) || 5;
    } catch (configError) {
      console.error('Error fetching group size config, using defaults:', configError);
      // Use defaults if config fetch fails
    }
    
    // Use provided maxMembers from request, or config value, or default
    const finalMaxMembers = maxMembers || configMaxMembers;
    const finalMinMembers = configMinMembers;

    // Create new group using transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
    // Generate default name if not provided: "Group - [Leader Name] - Sem [Semester]"
    const groupName = name && name.trim() ? name.trim() : `Group - ${student.fullName} - Sem ${student.semester}`;
    const groupDescription = description && description.trim() ? description.trim() : '';
    
    // Create group with creator as leader
    const group = new Group({
      name: groupName,
      description: groupDescription,
      maxMembers: finalMaxMembers,
      minMembers: finalMinMembers,
      semester: student.semester,
      academicYear: generateAcademicYear(),
      createdBy: student._id,
      leader: student._id, // Creator is always the leader
      status: 'invitations_sent', // Start with invitations_sent status
      members: [{
        student: student._id,
        role: 'leader',
        isActive: true,
        joinedAt: new Date(),
        inviteStatus: 'accepted' // Creator automatically accepts
      }],
      invites: [{
        student: student._id,
        role: 'leader',
        invitedBy: student._id,
        invitedAt: new Date(),
        status: 'accepted' // Creator automatically accepts
      }]
    });

      await group.save({ session });

      // Add group membership to creator (who is the leader)
      await student.addGroupMembershipAtomic(group._id, 'leader', student.semester, session);

      // Note: Do NOT create invites here - they will be created by sendGroupInvitations endpoint
      // This prevents the invites from being auto-rejected by cancelAllStudentInvitations below

      await session.commitTransaction();
      await session.endSession();

      // Cancel all invitations for this student (both sent and received) after group creation
      // IMPORTANT: Only cancels invitations from the same semester
      try {
        const cancelSession = await mongoose.startSession();
        cancelSession.startTransaction();
        
        const socketService = req.app.get('socketService');
        await cancelAllStudentInvitations(student._id, cancelSession, socketService, 'Student created their own group', student.semester);
        
        await cancelSession.commitTransaction();
        await cancelSession.endSession();
      } catch (cancelError) {
        console.error('Cancel student invitations error after group creation:', cancelError.message);
        // Don't fail the group creation for this cleanup operation
      }

      // Refresh group data with invites
      const updatedGroup = await Group.findById(group._id)
        .populate({
          path: 'members.student',
          select: 'fullName misNumber collegeEmail branch'
        })
        .populate({
          path: 'invites.student',
          select: 'fullName misNumber collegeEmail branch'
        })
        .populate({
          path: 'leader',
          select: 'fullName misNumber collegeEmail branch'
        });

      res.status(201).json({
        success: true,
        data: updatedGroup,
        message: 'Group created successfully'
      });
    } catch (transactionError) {
      await session.abortTransaction();
      await session.endSession();
      throw transactionError;
    }
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating group',
      error: error.message
    });
  }
};

// Update group name (creator or leader only)
const updateGroupName = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isCreator = group.createdBy && group.createdBy.toString() === student._id.toString();
    const isLeader = group.leader && group.leader.toString() === student._id.toString();

    if (!isCreator && !isLeader) {
      return res.status(403).json({
        success: false,
        message: 'Only group creator or leader can update group name'
      });
    }

    group.name = name.trim();
    group.updatedAt = new Date();
    await group.save();

    res.json({
      success: true,
      data: group,
      message: 'Group name updated successfully'
    });
  } catch (error) {
    console.error('Error updating group name:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating group name',
      error: error.message
    });
  }
};

// Sem 5 enhanced: Send invitations to selected members
const sendGroupInvitations = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds = [] } = req.body;
    const studentId = req.user.id;

    // ... (rest of the code remains the same)
    // Get the group and verify ownership
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Verify the requester is the group creator or leader
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is the creator or leader
    const isCreator = group.createdBy.toString() === student._id.toString();
    const isLeader = group.leader.toString() === student._id.toString();

    if (!isCreator && !isLeader) {
      return res.status(403).json({
        success: false,
        message: 'Only group creator or leader can send invitations'
      });
    }

    // Check if group is in correct status for sending invitations
    // Allow both 'invitations_sent' and 'forming' statuses (forming happens when members leave)
    if (group.status !== 'invitations_sent' && group.status !== 'forming') {
      return res.status(400).json({
        success: false,
        message: 'Group is not in a valid status for sending invitations. Group must be in "invitations_sent" or "forming" status.'
      });
    }

    const invitationResults = [];
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Send invitations to each member
      for (const memberId of memberIds) {
        try {
          // Refresh group to get latest state
          const freshGroup = await Group.findById(groupId).session(session);
          
          const invitedStudent = await Student.findById(memberId).session(session);
          if (!invitedStudent) {
            invitationResults.push({
              studentId: memberId,
              status: 'failed',
              message: 'Student not found'
            });
            continue;
          }

          // For Sem 7 groups: Check if invited student is finalized for coursework
          if (freshGroup.semester === 7) {
            const eligibility = checkSem7CourseworkEligibility(invitedStudent);
            if (!eligibility.eligible) {
              invitationResults.push({
                studentId: memberId,
                status: 'failed',
                message: eligibility.reason
              });
              continue;
            }
          }

          // For Sem 8 groups: Check if invited student is Type 1 (only Type 1 students can join groups)
          if (freshGroup.semester === 8) {
            const invitedStudentType = invitedStudent.getSem8StudentType();
            if (invitedStudentType !== 'type1') {
              invitationResults.push({
                studentId: memberId,
                status: 'failed',
                message: 'Only Type 1 students (completed 6-month internship in Sem 7) can join groups for Major Project 2. Type 2 students must do solo Major Project 2.'
              });
              continue;
            }
          }

          // Check if student is already a member of the group
          const isAlreadyMember = freshGroup.members.some(member => 
            member.student.toString() === memberId && member.isActive
          );
          if (isAlreadyMember) {
            invitationResults.push({
              studentId: memberId,
              status: 'already_member',
              message: 'Student is already a member of this group'
            });
            continue;
          }

          // Check if student already has a PENDING invitation
          const existingPendingInvite = freshGroup.invites.find(inv => 
            inv.student.toString() === memberId && inv.status === 'pending'
          );
          if (existingPendingInvite) {
            invitationResults.push({
              studentId: memberId,
              status: 'already_invited',
              message: 'Student already has a pending invitation'
            });
            continue;
          }

          // Check group capacity before adding invite
          const activeMembers = freshGroup.members.filter(member => member.isActive);
          const availableSlots = freshGroup.maxMembers - activeMembers.length;
          
          if (availableSlots <= 0) {
            invitationResults.push({
              studentId: memberId,
              status: 'failed',
              message: 'Group is now full'
            });
            continue;
          }

          // Check if there's an old rejected invitation - remove it before creating new one
          const oldRejectedInviteIndex = freshGroup.invites.findIndex(inv => 
            inv.student.toString() === memberId && inv.status === 'rejected'
          );
          if (oldRejectedInviteIndex !== -1) {
            // Remove old rejected invitation from group
            freshGroup.invites.splice(oldRejectedInviteIndex, 1);
          }

          // Also remove old rejected invitation from student's invites array
          const oldStudentInviteIndex = invitedStudent.invites.findIndex(inv => 
            inv.group.toString() === freshGroup._id.toString() && inv.status === 'rejected'
          );
          if (oldStudentInviteIndex !== -1) {
            invitedStudent.invites.splice(oldStudentInviteIndex, 1);
          }

          // Add new pending invitation to group
          freshGroup.invites.push({
            student: memberId,
            role: 'member',
            invitedBy: student._id,
            invitedAt: new Date(),
            status: 'pending'
          });
          
          await freshGroup.save({ session });
          
          // Add new pending invitation to student's invites array
          invitedStudent.invites.push({
            group: freshGroup._id,
            role: 'member',
            invitedBy: student._id,
            invitedAt: new Date(),
            status: 'pending'
          });
          await invitedStudent.save({ session });
          
          invitationResults.push({
            studentId: memberId,
            status: 'invited',
            message: 'Invitation sent successfully'
          });

          try {
            if (invitedStudent.collegeEmail) {
              const subject = 'SPMS IIITP - Group Invitation';
              const text = `Dear ${invitedStudent.fullName || 'Student'},\n\nYou have been invited to join the group "${freshGroup.name}" by ${student.fullName}.\n\nPlease log in to the SPMS portal to accept or reject this invitation.\n\nRegards,\nSPMS IIIT Pune`;
              const html = `
                <p>Dear ${invitedStudent.fullName || 'Student'},</p>
                <p>You have been invited to join the group <strong>${freshGroup.name}</strong> by <strong>${student.fullName}</strong>.</p>
                <p>Please log in to the SPMS portal to accept or reject this invitation.</p>
                <p>Regards,<br/>SPMS IIIT Pune</p>
              `;

              await sendEmail({
                to: invitedStudent.collegeEmail,
                subject,
                text,
                html,
              });
            }
          } catch (emailError) {
            console.error('Error sending group invitation email:', emailError);
          }

          // Send real-time notification to invited student
          const socketService = req.app.get('socketService');
          if (socketService) {
            socketService.sendGroupInvitation(invitedStudent.user.toString(), {
              groupId: freshGroup._id,
              groupName: freshGroup.name,
              inviterName: student.fullName,
              role: 'member'
            });
          }

        } catch (inviteError) {
          console.error(`Error inviting member ${memberId}:`, inviteError);
          invitationResults.push({
            studentId: memberId,
            status: 'failed',
            message: inviteError.message
          });
        }
      }

      await session.commitTransaction();
      await session.endSession();

      // Refresh group data
      const updatedGroup = await Group.findById(groupId)
        .populate({
          path: 'members.student',
          select: 'fullName misNumber collegeEmail branch'
        })
        .populate({
          path: 'invites.student',
          select: 'fullName misNumber collegeEmail branch'
        })
        .populate({
          path: 'leader',
          select: 'fullName misNumber collegeEmail branch'
        });

      res.status(200).json({
        success: true,
        data: {
          group: updatedGroup,
          invitationResults
        },
        message: 'Invitations sent successfully'
      });

    } catch (transactionError) {
      await session.abortTransaction();
      await session.endSession();
      throw transactionError;
    }

  } catch (error) {
    console.error('Error sending group invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invitations',
      error: error.message
    });
  }
};

// Sem 5 enhanced: Get group with invites and members
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;
    
    // Validate ObjectId format first
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group ID format'
      });
    }
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    let group = await Group.findById(id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Manually populate the leader field
    await group.populate({
      path: 'leader',
      select: 'fullName misNumber collegeEmail contactNumber branch'
    });
    
    await group.populate({
      path: 'members.student',
      select: 'fullName misNumber collegeEmail contactNumber branch'
    });
    await group.populate('createdBy');
    await group.populate('project', 'title description projectType status');
    await group.populate('allocatedFaculty', 'fullName department designation');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Simple population - just use the populated data from the query

    const groupData = {
      id: group._id,
      _id: group._id,
      name: group.name,
      description: group.description,
      status: group.status,
      semester: group.semester,
      academicYear: group.academicYear,
      maxMembers: group.maxMembers,
      minMembers: group.minMembers,
      memberCount: group.members.filter(m => m.isActive).length,
      leader: group.leader,
      members: group.members ? group.members.filter(m => m.isActive) : [],
      invites: group.invites,
      createdBy: group.createdBy,
      project: group.project,
      allocatedFaculty: group.allocatedFaculty,
      finalizedAt: group.finalizedAt,
      finalizedBy: group.finalizedBy
    };

    // Mark if current user has any invites
    const myInvites = group.invites.filter(invite => 
      invite.student._id.toString() === student._id.toString()
    );

    
    res.json({
      success: true,
      data: {
        group: groupData,
        myInvites: myInvites,
        canAcceptInvites: group.status !== 'finalized' && group.status !== 'locked'
      },
      message: 'Group retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting group:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting group',
      error: error.message
    });
  }
};

// Sem 5 enhanced: Search students for invitations
const getAvailableStudents = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { 
      query = '', 
      search = '',
      branch = '',
      semester = '',
      sortBy = 'name',
      page = 1, 
      limit = 20,
      groupId = ''
    } = req.query;
    
    
    // Get current student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Validate student has degree field
    if (!student.degree) {
      return res.status(400).json({
        success: false,
        message: 'Student degree information is missing. Please contact admin.'
      });
    }

    // Enhanced search term handling - properly trim and validate
    const rawSearchTerm = query || search || '';
    const searchTerm = typeof rawSearchTerm === 'string' ? rawSearchTerm.trim() : '';
    const hasSearchTerm = searchTerm.length > 0;
    const searchRegex = hasSearchTerm ? new RegExp(searchTerm, 'i') : null;

    // Ensure pagination limits
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    // Enhanced search query with multiple filters
    // CRITICAL: Always filter by degree to ensure B.Tech and M.Tech students are completely separated
    // Students can form groups with students from ANY branch (Sem 5, 7, 8)
    // Only filter by branch if explicitly specified in the search parameters
    const searchQuery = {
      _id: { $ne: student._id },
      semester: branch ? parseInt(semester) || student.semester : student.semester,
      degree: student.degree // CRITICAL: This ensures B.Tech and M.Tech students are separated
      // Branch filtering: Only apply if explicitly requested via branch parameter
      // Otherwise, show all students from all branches (allows cross-branch group formation)
    };
    
    // Only add branch filter if explicitly specified in query parameters
    if (branch) {
      searchQuery.branch = branch;
    }
    // No branch filter by default - allows students from any branch to see each other
    
    // Only add search filter if search term is provided and not empty
    if (hasSearchTerm && searchRegex) {
      searchQuery.$or = [
          { fullName: searchRegex },
          { misNumber: searchRegex },
          { collegeEmail: searchRegex },
          { contactNumber: searchRegex }
      ];
    }

    // Enhanced sorting
    let sortQuery = { fullName: 1 }; // Default
    switch (sortBy) {
      case 'name':
        sortQuery = { fullName: 1 };
        break;
      case 'mis':
        sortQuery = { misNumber: 1 };
        break;
      case 'branch':
        sortQuery = { branch: 1, fullName: 1 };
        break;
      case 'semester':
        sortQuery = { semester: 1, fullName: 1 };
        break;
    }

    // Get students with enhanced fields
    // CRITICAL: Ensure degree is included in select to verify filtering
    const students = await Student.find(searchQuery)
      .select('fullName misNumber collegeEmail contactNumber branch semester degree')
      .limit(limitNum)
      .skip(skip)
      .sort(sortQuery);
    
    // Additional safety check: Filter out any students that don't match the degree
    // This is a defensive measure in case the query somehow returns incorrect results
    const filteredStudents = students.filter(s => s.degree === student.degree);

    // Check students' group status and invites
    const studentsWithStatus = await Promise.all(
      filteredStudents.map(async (s) => {
        // For Sem 7: Include track information instead of filtering
        let trackInfo = null;
        let isCourseworkEligible = true; // Default to true for non-Sem 7 students
        
        // For Sem 8: Include student type information for Type 1 filtering
        let sem8StudentType = null;
        let isType1Eligible = true; // Default to true for non-Sem 8 students
        
        if (student.semester === 7 && s.semester === 7) {
          // Get full student document with semester selections for track checking
          const fullStudent = await Student.findById(s._id);
          if (!fullStudent) {
            return null;
          }
          
          // Get track information for Sem 7 students
          const finalizedTrack = fullStudent.getFinalizedTrack(7);
          const semesterSelection = fullStudent.getSemesterSelection(7);
          const chosenTrack = semesterSelection?.chosenTrack || null;
          const selectedTrack = finalizedTrack || chosenTrack;
          
          trackInfo = {
            selectedTrack: selectedTrack || null,
            finalizedTrack: finalizedTrack || null,
            chosenTrack: chosenTrack || null,
            hasSelectedTrack: !!selectedTrack
          };
          
          // Check if student is eligible for coursework (for disabling in frontend)
          const eligibility = checkSem7CourseworkEligibility(fullStudent);
          isCourseworkEligible = eligibility.eligible;
        } else if (student.semester === 8 && s.semester === 8) {
          // Get full student document for Sem 8 Type 1 checking
          const fullStudent = await Student.findById(s._id);
          if (!fullStudent) {
            return null;
          }
          
          // Get Sem 8 student type
          sem8StudentType = fullStudent.getSem8StudentType();
          
          // For Sem 8 group formation: Only Type 1 students are eligible
          // (Type 1 students completed 6-month internship in Sem 7 and must do coursework)
          isType1Eligible = sem8StudentType === 'type1';
        }
        // For Sem 5 and other semesters: No track info needed, return all students

        const currentGroup = await Group.findOne({
          semester: student.semester,
          isActive: true,
          members: {
            $elemMatch: {
              student: s._id,
              isActive: true
            }
          }
        });

        // Check if student has pending invitation from the current group
        let currentGroupInvite = null;
        let hasRejectedInvite = false;
        if (groupId) {
          // Check if this specific student has a pending invite by manually checking the array
          const groupWithInvites = await Group.findById(groupId).select('invites');
          
          const hasPendingInvite = groupWithInvites?.invites?.some(invite => {
            return invite.student.toString() === s._id.toString() && invite.status === 'pending';
          });
          
          // Check if student has a rejected invitation
          hasRejectedInvite = groupWithInvites?.invites?.some(invite => {
            return invite.student.toString() === s._id.toString() && invite.status === 'rejected';
          });
          
          // Use the manual check result
          currentGroupInvite = hasPendingInvite ? groupWithInvites : null;
        }

        // Note: We're focusing on Group model invites, not Student model invites
        // The Group model's invites array is the source of truth for invitations
        const studentInvites = []; // Simplified - not using Student model invites for this check

        const finalStatus = currentGroup ? 'in_group' : 
                           currentGroupInvite ? 'pending_from_current_group' : 
                           hasRejectedInvite ? 'rejected_from_current_group' :
                           studentInvites.length > 0 ? 'pending_invites' : 'available';
        
        
        return {
          _id: s._id,
          fullName: s.fullName,
          misNumber: s.misNumber,
          collegeEmail: s.collegeEmail,
          contactNumber: s.contactNumber,
          branch: s.branch,
          semester: s.semester,
          groupId: currentGroup?._id,
          isInGroup: !!currentGroup,
          pendingInvites: studentInvites.length,
          hasPendingInviteFromCurrentGroup: !!currentGroupInvite,
          hasRejectedInviteFromCurrentGroup: hasRejectedInvite,
          status: finalStatus,
          // Sem 7 track information (only for Sem 7 students)
          ...(trackInfo && { trackInfo }),
          // Flag to indicate if student is eligible for coursework (for Sem 7)
          isCourseworkEligible,
          // Sem 8 student type information (only for Sem 8 students)
          ...(sem8StudentType && { sem8StudentType }),
          // Flag to indicate if student is Type 1 eligible (for Sem 8 group formation)
          isType1Eligible
        };
      })
    );

    // Don't filter out any students - show all but mark eligibility
    // Filter out any null entries (students that couldn't be processed)
    const filteredStudentsWithStatus = studentsWithStatus.filter(s => s !== null);

    // Count total for pagination and generate enhanced metadata
    const total = await Student.countDocuments(searchQuery);
    
    // Get available branches and semesters for filtering
    const availableBranches = await Student.distinct('branchCode', { 
      ...searchQuery,
      branchCode: { $exists: true, $ne: null, $ne: '' }
    });
    const availableSemesters = await Student.distinct('semester', { 
      ...searchQuery,
      semester: { $exists: true, $ne: null }
    });

    // Removed excessive debug logging

    res.json({
      success: true,
      data: filteredStudentsWithStatus,
      total: total, // Add total to response for frontend
      metadata: {
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        filters: {
          branches: availableBranches.sort(),
          semesters: availableSemesters.sort(),
          appliedFilters: {
            search: searchTerm,
            branch: branch,
            semester: parseInt(semester),
            sortBy
          }
        },
        currentStudent: {
          semester: student.semester,
          degree: student.degree,
          branch: student.branch,
          branchCode: student.branchCode
        }
      },
      message: `Found ${filteredStudentsWithStatus.length} students matching your criteria`
    });
  } catch (error) {
    console.error('Error getting available students:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting available students',
      error: error.message
    });
  }
};

// Sem 5 enhanced: Send invitations to students
// Helper function to reject all pending invitations when group is full or finalized
const rejectAllPendingInvitations = async (groupId, session, socketService = null, reason = 'Group is now full') => {
  const group = await Group.findById(groupId).session(session);
  if (!group) return;
  
  const pendingInvites = group.invites.filter(invite => invite.status === 'pending');
  
  for (const invite of pendingInvites) {
    invite.status = 'auto-rejected';
    invite.respondedAt = new Date();
    invite.rejectionReason = reason;
    
    // Send real-time notification to the student
    if (socketService) {
      try {
        await socketService.notifyInvitationAutoRejected(
          invite.student,
          groupId,
          reason
        );
      } catch (notificationError) {
        console.error('Error sending auto-rejection notification:', notificationError);
      }
    }
  }
  
  if (pendingInvites.length > 0) {
    await group.save({ session });
  }
};

// Helper function to cancel all invitations for a student (both sent and received)
// IMPORTANT: Only cancels invitations from the same semester as the student's current semester
const cancelAllStudentInvitations = async (studentId, session, socketService, reason = 'Student joined another group', studentSemester = null) => {
  try {
    // Get student to determine their semester if not provided
    let targetSemester = studentSemester;
    if (!targetSemester) {
      const student = await Student.findById(studentId).session(session);
      if (!student) {
        throw new Error('Student not found');
      }
      targetSemester = student.semester;
    }
    
    // 1. Cancel all invitations sent by this student (in groups they created/lead)
    // BUT ONLY from groups in the same semester
    const groupsLedByStudent = await Group.find({
      $or: [
        { createdBy: studentId },
        { leader: studentId }
      ],
      'semester': targetSemester, // CRITICAL: Only same semester groups
      'invites.status': 'pending'
    }).session(session);

    let totalCancelled = 0;

    for (const group of groupsLedByStudent) {
      const sentInvites = group.invites.filter(invite => 
        invite.status === 'pending' && 
        invite.invitedBy.toString() === studentId.toString()
      );

      for (const invite of sentInvites) {
        invite.status = 'auto-rejected';
        invite.respondedAt = new Date();
        invite.rejectionReason = reason;
      }

      if (sentInvites.length > 0) {
        await group.save({ session });
        totalCancelled += sentInvites.length;

        // Send real-time notifications for cancelled invitations
        if (socketService) {
          for (const invite of sentInvites) {
            await socketService.notifyInvitationAutoRejected(invite.student, {
              groupId: group._id,
              groupName: group.name,
              reason: reason,
              type: 'auto-rejected'
            });
          }
        }
      }
    }

    // 2. Cancel all invitations received by this student (from other groups)
    // BUT ONLY from groups in the same semester
    const groupsWithStudentInvites = await Group.find({
      'semester': targetSemester, // CRITICAL: Only same semester groups
      'invites.student': studentId,
      'invites.status': 'pending'
    }).session(session);

    for (const group of groupsWithStudentInvites) {
      const receivedInvites = group.invites.filter(invite => 
        invite.student.toString() === studentId.toString() && 
        invite.status === 'pending'
      );

      for (const invite of receivedInvites) {
        invite.status = 'auto-rejected';
        invite.respondedAt = new Date();
        invite.rejectionReason = reason;
      }

      if (receivedInvites.length > 0) {
        await group.save({ session });
        totalCancelled += receivedInvites.length;

        // Send real-time notification to group members about auto-rejected invitation
        if (socketService) {
          await socketService.notifyInvitationUpdate(group._id, {
            type: 'auto-rejected',
            student: {
              id: studentId,
              reason: reason
            }
          });
        }
      }
    }

    return totalCancelled;
  } catch (error) {
    console.error('Cancel all student invitations error:', error.message);
    throw error;
  }
};

const inviteToGroup = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: groupId } = req.params;
    const { studentIds = [], role = 'member' } = req.body;
    
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find group and verify access
    const group = await Group.findById(groupId)
      .populate('members.student');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    

    // Check if user is leader or can invite
    const member = group.members.find(m => 
      m.student._id.toString() === student._id.toString() && m.isActive
    );

    if (!member || (member.role !== 'leader' && student._id.toString() !== group.createdBy.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Only group leaders can invite members'
      });
    }

    // Validate role
    if (role !== 'member') {
      return res.status(400).json({
        success: false,
        message: 'Only can invite as member role'
      });
    }

    // Check if group is locked or finalized
    if (group.status === 'finalized' || group.status === 'locked') {
      return res.status(400).json({
        success: false,
        message: 'Group is finalized or locked'
      });
    }

    // Use transaction for atomic invitation batch
    const session = await mongoose.startSession();
    session.startTransaction();

    const results = [];
    const errors = [];

    try {
      // Invite each student with concurrency protection
      for (const invitedStudentId of studentIds) {
        try {
          // Verify invited student exists and in same semester
          const invitedStudent = await Student.findById(invitedStudentId).session(session);
          if (!invitedStudent || invitedStudent.semester !== student.semester) {
            errors.push(`${invitedStudentId}: Student not found or wrong semester`);
            continue;
          }

          // For Sem 7 groups: Check if invited student is finalized for coursework
          if (group.semester === 7) {
            const eligibility = checkSem7CourseworkEligibility(invitedStudent);
            if (!eligibility.eligible) {
              errors.push(`${invitedStudentId}: ${eligibility.reason}`);
              continue;
            }
          }

          // For Sem 8 groups: Check if invited student is Type 1 (only Type 1 students can join groups)
          if (group.semester === 8) {
            const invitedStudentType = invitedStudent.getSem8StudentType();
            if (invitedStudentType !== 'type1') {
              errors.push(`${invitedStudentId}: Only Type 1 students (completed 6-month internship in Sem 7) can join groups for Major Project 2. Type 2 students must do solo Major Project 2.`);
              continue;
            }
          }

          // Check if already in a group using session for integrity
          const inGroup = await Group.findOne({
            'members.student': invitedStudentId,
            semester: student.semester,
            isActive: true
          }).session(session);
          
          if (inGroup) {
            errors.push(`${invitedStudentId}: Student already in group`);
            continue;
          }

          // Use atomic group invite - refetch group from session
          const freshGroup = await Group.findById(groupId).session(session);
          const availableSlots = freshGroup.maxMembers - freshGroup.members.filter(m => m.isActive).length;
          
          if (availableSlots <= 0) {
            errors.push(`${invitedStudentId}: Group is now full`);
            continue;
          }

          // Check if invite already exists
          const existingInvite = freshGroup.invites.find(invite => 
            invite.student.toString() === invitedStudentId && invite.status === 'pending'
          );
          
          if (existingInvite) {
            errors.push(`${invitedStudentId}: Student already has pending invitation`);
            continue;
          }

          // Check if student has a rejected invitation - if so, update it to pending
          const rejectedInvite = freshGroup.invites.find(invite => 
            invite.student.toString() === invitedStudentId && invite.status === 'rejected'
          );
          
          if (rejectedInvite) {
            // Update the rejected invitation to pending instead of creating a new one
            rejectedInvite.status = 'pending';
            rejectedInvite.invitedBy = student._id;
            rejectedInvite.invitedAt = new Date();
            rejectedInvite.respondedAt = undefined; // Clear the response date
            
            await freshGroup.save({ session });
            
            // Update the student's invite record as well
            const studentRecord = await Student.findById(invitedStudentId).session(session);
            if (studentRecord) {
              const studentInvite = studentRecord.invites.find(invite => 
                invite.group.toString() === groupId && invite.status === 'rejected'
              );
              if (studentInvite) {
                studentInvite.status = 'pending';
                studentInvite.invitedBy = student._id;
                studentInvite.invitedAt = new Date();
                studentInvite.respondedAt = undefined;
                await studentRecord.save({ session });
              }
            }
            
            results.push({
              studentId: invitedStudentId,
              status: 'reinvited',
              role: role
            });
            continue;
          }

          // Add invitation atomically
          freshGroup.invites.push({
            student: invitedStudentId,
            role: role,
            invitedBy: student._id,
            invitedAt: new Date(),
            status: 'pending'
          });
          
          await freshGroup.save({ session });

          // Add to student's invite tracking
          invitedStudent.invites.push({
            group: groupId,
            role: role,
            invitedBy: student._id,
            invitedAt: new Date(),
            status: 'pending'
          });
          await invitedStudent.save({ session });

          results.push({
            studentId: invitedStudentId,
            status: 'invited',
            role: role
          });
        } catch (error) {
          errors.push(`${invitedStudentId}: ${error.message}`);
        }
      }
      
      await session.commitTransaction();
      await session.endSession();
      
      // Check if group is now full and reject all pending invitations
      const finalGroup = await Group.findById(groupId);
      const activeMembers = finalGroup.members.filter(m => m.isActive);
      if (activeMembers.length >= finalGroup.maxMembers) {
        const rejectSession = await mongoose.startSession();
        rejectSession.startTransaction();
        try {
          const socketService = req.app.get('socketService');
          await rejectAllPendingInvitations(groupId, rejectSession, socketService);
          await rejectSession.commitTransaction();
        } catch (rejectError) {
          console.error('Error rejecting pending invitations:', rejectError);
          await rejectSession.abortTransaction();
        } finally {
          await rejectSession.endSession();
        }
      }
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      console.error('Transaction failed in invite process:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process invitations',
        error: error.message
      });
    }

    // Get updated group data for notifications and response
    const updatedGroup = await Group.findById(groupId)
      .populate({
        path: 'members.student',
        select: 'fullName misNumber collegeEmail'
      })
      .populate({
        path: 'invites.student',
        select: 'fullName misNumber collegeEmail'
      });

    // 🔥 REAL-TIME & EMAIL NOTIFICATION: Invitations Sent
    try {
      const socketService = req.app.get('socketService');

      if (results.length > 0) {
        for (const invitation of results) {
          const invitedStudent = await Student.findById(invitation.studentId);
          if (!invitedStudent) continue;

          // Email invitation
          try {
            if (invitedStudent.collegeEmail) {
              const subject = 'SPMS IIITP - Group Invitation';
              const text = `Dear ${invitedStudent.fullName || 'Student'},\n\nYou have been invited to join the group "${updatedGroup.name}" by ${student.fullName}.\n\nPlease log in to the SPMS portal to accept or reject this invitation.\n\nRegards,\nSPMS IIIT Pune`;
              const html = `
                <p>Dear ${invitedStudent.fullName || 'Student'},</p>
                <p>You have been invited to join the group <strong>${updatedGroup.name}</strong> by <strong>${student.fullName}</strong>.</p>
                <p>Please log in to the SPMS portal to accept or reject this invitation.</p>
                <p>Regards,<br/>SPMS IIIT Pune</p>
              `;

              await sendEmail({
                to: invitedStudent.collegeEmail,
                subject,
                text,
                html,
              });
            }
          } catch (emailError) {
            console.error('Error sending group invitation email (inviteToGroup):', emailError);
          }

          // Socket notifications
          if (socketService) {
            await socketService.sendGroupInvitation(
              invitedStudent.user,
              {
                groupId,
                groupName: updatedGroup.name,
                groupDescription: updatedGroup.description,
                inviterName: student.fullName,
                role: invitation.role,
                invitedAt: new Date()
              }
            );

            await socketService.sendSystemNotification(invitedStudent.user, {
              title: 'New Group Invitation',
              message: `You've been invited to join "${updatedGroup.name}" by ${student.fullName}`,
              type: 'info'
            });
          }
        }

        // Notify existing group members about new invitations sent
        if (socketService) {
          await socketService.broadcastMembershipChange(groupId, {
            changeType: 'invitations_sent',
            invitations: results.map(r => ({ studentId: r.studentId, role: r.role })),
            triggeredBy: student._id
          });
        }
      }
    } catch (notificationError) {
      console.error('Real-time/email notification error for invitations:', notificationError);
    }

    res.json({
      success: true,
      data: {
        group: updatedGroup,
        invitedStudents: results,
        errors: errors,
        totalInvited: results.length,
        totalErrors: errors.length
      },
      message: `${results.length} students invited, ${errors.length} failed`
    });
  } catch (error) {
    console.error('Error inviting to group:', error);
    res.status(500).json({
      success: false,
      message: 'Error inviting to group',
      error: error.message
    });
  }
};

// Sem 5 enhanced: Accept invitation with concurrency protection
const acceptInvitation = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupId, inviteId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Use atomic transaction for maximum concurrency protection
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if student is already in a group for this semester
      const existingGroupMember = await Group.findOne({
        'members.student': student._id,
        semester: student.semester,
        isActive: true
      }).session(session);

      if (existingGroupMember) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(409).json({
          success: false,
          message: 'Student is already in another group for this semester'
        });
      }

      // Get fresh group data within transaction for race condition protection
      const group = await Group.findById(groupId).session(session);
      if (!group) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Check group status
      if (group.status === 'finalized' || group.status === 'locked') {
        await session.abortTransaction();
        await session.endSession();
        return res.status(409).json({
          success: false,
          message: 'Group is finalized or locked'
        });
      }

      // Check group capacity with fresh read
      const activeMembers = group.members.filter(m => m.isActive);
      if (activeMembers.length >= group.maxMembers) {
        // Find the invitation and mark it as auto-rejected
        const invite = group.invites.id(inviteId);
        if (invite) {
          invite.status = 'auto-rejected';
          invite.respondedAt = new Date();
          invite.rejectionReason = 'Group is now full';
          await group.save({ session });
        }
        
        await session.commitTransaction();
        await session.endSession();
        return res.status(409).json({
          success: false,
          message: 'Group is now full'
        });
      }

      const invite = group.invites.id(inviteId);
      if (!invite) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Invitation not found'
        });
      }

      // Validate invite belongs to student
      if (invite.student.toString() !== student._id.toString()) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(403).json({
          success: false,
          message: 'This invitation is not for you'
        });
      }

      if (invite.status !== 'pending') {
        await session.abortTransaction();
        await session.endSession();
        return res.status(409).json({
          success: false,
          message: 'This invitation has already been processed'
        });
      }

      // Use atomic group method
      await group.acceptInviteAtomic(inviteId, student._id, session);
      
      // Update student group membership atomically
      await student.addGroupMembershipAtomic(groupId, invite.role, student.semester, session);
      
      // Check if group is now full and reject all pending invitations
      const updatedGroup = await Group.findById(groupId).session(session);
      const currentActiveMembers = updatedGroup.members.filter(m => m.isActive);
      if (currentActiveMembers.length >= updatedGroup.maxMembers) {
        const socketService = req.app.get('socketService');
        await rejectAllPendingInvitations(groupId, session, socketService);
      }
      
      // Auto-cleanup student's other pending invites
      await student.cleanupInvitesAtomic(groupId, session);
      
      // Auto-reject student's invites from other groups (global cleanup)
      try {
        await group.autoRejectStudentInvites(student._id, session);
      } catch (autoRejectError) {
        console.error('Auto-reject student invites error:', autoRejectError.message);
        // Don't fail the entire transaction for this cleanup operation
      }

      // Cancel all invitations for this student (both sent and received)
      try {
        const socketService = req.app.get('socketService');
        await cancelAllStudentInvitations(student._id, session, socketService, 'Student joined another group');
      } catch (cancelError) {
        console.error('Cancel student invitations error:', cancelError.message);
        // Don't fail the entire transaction for this cleanup operation
      }
      
      await session.commitTransaction();
      await session.endSession();

      // 🔥 REAL-TIME NOTIFICATION: Invitation Accept
      try {
        const socketService = req.app.get('socketService');
        if (socketService) {
          await socketService.notifyInvitationAccepted(groupId, {
            student: {
              id: student._id,
              fullName: student.fullName,
              misNumber: student.misNumber
            },
            role: invite.role,
            joinedAt: new Date()
          });
          
          // Notify about capacity change if approaching limit
          const currentMemberCount = updatedGroup.members.filter(m => m.isActive).length;
          if (currentMemberCount >= updatedGroup.maxMembers * 0.8) {
            await socketService.broadcastCapacityUpdate(groupId, {
              currentMemberCount,
              maxMembers: updatedGroup.maxMembers
            });
          }
        }
      } catch (socketError) {
        console.error('Socket notification error:', socketError);
      }

      // Refresh and return data
      const finalGroup = await Group.findById(groupId)
        .populate({
          path: 'members.student',
          select: 'fullName misNumber collegeEmail branch'
        })
        .populate({
          path: 'invites.student',
          select: 'fullName misNumber collegeEmail branch'
        });

      try {
        const leaderStudent = await Student.findById(finalGroup.leader);
        if (leaderStudent && leaderStudent.collegeEmail) {
          const subject = 'SPMS IIITP - New member joined your group';
          const text = `Dear ${leaderStudent.fullName || 'Group Leader'},\n\n${student.fullName} has joined your group ${finalGroup.name || 'your group'}.\n\nPlease log in to the SPMS portal to view the updated group members and manage your group.\n\nRegards,\nSPMS IIIT Pune`;
          const html = `
            <p>Dear ${leaderStudent.fullName || 'Group Leader'},</p>
            <p><strong>${student.fullName}</strong> has joined your group <strong>${finalGroup.name || 'your group'}</strong>.</p>
            <p>Please log in to the SPMS portal to view the updated group members and manage your group.</p>
            <p>Regards,<br/>SPMS IIIT Pune</p>
          `;

          await sendEmail({
            to: leaderStudent.collegeEmail,
            subject,
            text,
            html,
          });
        }
      } catch (emailError) {
        console.error('Error sending group join notification email:', emailError);
      }

      res.json({
        success: true,
        data: {
          group: finalGroup,
          member: {
            student: student._id,
            role: invite.role,
            joinedAt: new Date()
          }
        },
        message: 'Invitation accepted successfully'
      });
    } catch (error) {
      console.error('Transaction error in accepting invitation:', error);
      await session.abortTransaction();
      await session.endSession();
      
      // Return appropriate error codes for different types of issues
      if (error.message.includes('already a member')) {
        return res.status(409).json({
          success: false,
          message: 'Already a member of this or another group'
        });
      } else if (error.message.includes('Group is now full')) {
        return res.status(409).json({
          success: false,
          message: 'Group is now full'
        });
      } else if (error.message.includes('Group is finalized')) {
        return res.status(409).json({
          success: false,
          message: 'Group is finalized or locked'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting invitation',
      error: error.message
    });
  }
};

// Sem 5 enhanced: Reject invitation
const rejectInvitation = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupId, inviteId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find group and invite
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const invite = group.invites.id(inviteId);
    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    // Validate invite belongs to student
    if (invite.student.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This invitation is not for you'
      });
    }

    // Reject the invite
    await group.rejectInvite(inviteId, student._id);

    res.json({
      success: true,
      message: 'Invitation rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting invitation',
      error: error.message
    });
  }
};

// Sem 5 specific: Leave group
const leaveGroup = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if student is a member
    const membership = group.members.find(m => m.student.toString() === student._id.toString());
    if (!membership) {
      return res.status(400).json({
        success: false,
        message: 'Student is not a member of this group'
      });
    }

    // Check if student is the leader
    if (membership.role === 'leader') {
      return res.status(400).json({
        success: false,
        message: 'Group leader cannot leave. Transfer leadership first.'
      });
    }

    // Remove student from group
    await group.removeMember(student._id);
    
    // Remove group membership from student
    await student.leaveGroup(group._id);

    try {
      const leaderStudent = await Student.findById(group.leader);
      if (leaderStudent && leaderStudent.collegeEmail) {
        const subject = 'SPMS IIITP - Member left your group';
        const text = `Dear ${leaderStudent.fullName || 'Group Leader'},\n\n${student.fullName} has left your group ${group.name || 'your group'}.\n\nPlease log in to the SPMS portal to review your current group members and take any necessary actions.\n\nRegards,\nSPMS IIIT Pune`;
        const html = `
          <p>Dear ${leaderStudent.fullName || 'Group Leader'},</p>
          <p><strong>${student.fullName}</strong> has left your group <strong>${group.name || 'your group'}</strong>.</p>
          <p>Please log in to the SPMS portal to review your current group members and take any necessary actions.</p>
          <p>Regards,<br/>SPMS IIIT Pune</p>
        `;

        await sendEmail({
          to: leaderStudent.collegeEmail,
          subject,
          text,
          html,
        });
      }
    } catch (emailError) {
      console.error('Error sending group leave notification email:', emailError);
    }

    res.json({
      success: true,
      message: 'Successfully left group'
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({
      success: false,
      message: 'Error leaving group',
      error: error.message
    });
  }
};

// Get student's group status for debugging
const getStudentGroupStatus = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get all groups for this student
    const allGroups = await Group.find({
      'members.student': student._id
    }).populate('members.student', 'fullName misNumber contactNumber branch');

    // Get semester 5 groups specifically
    const sem5Groups = await Group.find({
      'members.student': student._id,
      semester: 5
    }).populate('members.student', 'fullName misNumber contactNumber branch');

    // Get groups with matching academic year
    const studentAcademicYear = student.academicYear || '2024-25';
    const matchingAcademicYearGroups = await Group.find({
      'members.student': student._id,
      semester: 5,
      academicYear: studentAcademicYear
    }).populate('members.student', 'fullName misNumber contactNumber branch');

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          fullName: student.fullName,
          semester: student.semester,
          academicYear: studentAcademicYear,
          degree: student.degree,
          originalAcademicYear: student.academicYear
        },
        groups: {
          all: allGroups.map(g => ({
            id: g._id,
            name: g.name,
            status: g.status,
            semester: g.semester,
            academicYear: g.academicYear,
            memberCount: g.members.length
          })),
          sem5: sem5Groups.map(g => ({
            id: g._id,
            name: g.name,
            status: g.status,
            semester: g.semester,
            academicYear: g.academicYear,
            memberCount: g.members.length
          })),
          matchingAcademicYear: matchingAcademicYearGroups.map(g => ({
            id: g._id,
            name: g.name,
            status: g.status,
            semester: g.semester,
            academicYear: g.academicYear,
            memberCount: g.members.length
          }))
        },
        canRegister: matchingAcademicYearGroups.some(g => g.status === 'finalized')
      }
    });
  } catch (error) {
    console.error('Error getting student group status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting student group status',
      error: error.message
    });
  }
};

// Get faculty allocation status for a project
const getFacultyAllocationStatus = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { projectId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get project
    const project = await Project.findOne({
      _id: projectId,
      student: student._id
    }).populate([
      { path: 'group', populate: { path: 'members.student', select: 'fullName misNumber contactNumber branch' } },
      { path: 'facultyPreferences.faculty', select: 'fullName department designation mode' },
      { path: 'faculty', select: 'fullName department designation mode' }
    ]);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get faculty preference document
    const facultyPreference = await FacultyPreference.findOne({
      project: project._id,
      student: student._id
    }).populate('preferences.faculty', 'fullName department designation mode');

    const allocationStatus = project.getAllocationStatus();

    res.json({
      success: true,
      data: {
        project: {
          id: project._id,
          title: project.title,
          status: project.status,
          faculty: project.faculty,
          group: project.group,
          facultyPreferences: project.facultyPreferences,
          currentFacultyIndex: project.currentFacultyIndex,
          allocationHistory: project.allocationHistory
        },
        facultyPreference: facultyPreference,
        allocationStatus: allocationStatus,
        supportsAllocation: project.supportsFacultyAllocation()
      }
    });
  } catch (error) {
    console.error('Error getting faculty allocation status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting faculty allocation status',
      error: error.message
    });
  }
};

// Sem 5 specific: Submit faculty preferences
const submitFacultyPreferences = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupId } = req.params;
    const { preferences } = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find group
    const group = await Group.findById(groupId).populate('project');
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // For Sem 7: Check window for faculty preferences
    if (group.semester === 7) {
      const windowStatus = await isWindowOpen('sem7.major1.preferenceWindow');
      if (!windowStatus.isOpen) {
        return res.status(403).json({
          success: false,
          message: windowStatus.reason || 'Faculty preference submission window is currently closed',
          windowStart: windowStatus.start,
          windowEnd: windowStatus.end
        });
      }
    }

    // Check if student is a member
    const membership = group.members.find(m => m.student.toString() === student._id.toString());
    if (!membership) {
      return res.status(400).json({
        success: false,
        message: 'Student is not a member of this group'
      });
    }

    // Validate preferences
    if (!preferences || !Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Faculty preferences are required'
      });
    }

    // Get faculty preference limit from system config based on group semester
    let facultyPreferenceLimit;
    if (group.semester === 5) {
      facultyPreferenceLimit = await SystemConfig.getConfigValue('sem5.facultyPreferenceLimit', 7);
    } else if (group.semester === 7) {
      facultyPreferenceLimit = await SystemConfig.getConfigValue('sem7.major1.facultyPreferenceLimit') || 
                               await SystemConfig.getConfigValue('sem5.facultyPreferenceLimit', 7);
    } else {
      // Default fallback
      facultyPreferenceLimit = 7;
    }

    if (preferences.length > facultyPreferenceLimit) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${facultyPreferenceLimit} faculty preferences allowed`
      });
    }

    // Add faculty preferences to group
    await group.addFacultyPreferences(preferences);

    // Check if FacultyPreference document already exists for this group
    let facultyPrefDoc = await FacultyPreference.findOne({
      group: group._id,
      student: student._id,
      semester: group.semester,
      academicYear: group.academicYear
    });

    if (facultyPrefDoc) {
      // Update existing FacultyPreference document
      facultyPrefDoc.preferences = preferences.map((pref, index) => ({
        faculty: pref.faculty,
        priority: index + 1,
        submittedAt: new Date()
      }));
      facultyPrefDoc.currentFacultyIndex = 0; // Reset to first preference
      facultyPrefDoc.status = 'pending';
      await facultyPrefDoc.save();
    } else {
      // Create new FacultyPreference document for tracking allocation process
      const facultyPreferenceData = {
        student: student._id,
        project: group.project,
        group: group._id,
        semester: group.semester,
        academicYear: group.academicYear,
        status: 'pending',
        preferences: preferences.map((pref, index) => ({
          faculty: pref.faculty,
          priority: index + 1,
          submittedAt: new Date()
        })),
        currentFacultyIndex: 0 // Start with first preference
      };

      facultyPrefDoc = new FacultyPreference(facultyPreferenceData);
      await facultyPrefDoc.save();
    }

    res.json({
      success: true,
      data: group.getGroupSummary(),
      message: 'Faculty preferences submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting faculty preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting faculty preferences',
      error: error.message
    });
  }
};

// Sem 5 specific: Get available groups
const getAvailableGroups = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { semester } = req.query;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const query = {
      semester: semester || student.semester,
      status: 'forming',
      isActive: true
    };

    // Get available groups
    const groups = await Group.find(query)
      .populate('members.student', 'fullName misNumber collegeEmail')
      .populate('leader', 'fullName misNumber collegeEmail')
      .sort({ createdAt: -1 });

    // Filter groups that student can join
    const availableGroups = groups.filter(group => {
      const canJoin = group.canStudentJoin(student._id);
      return canJoin.canJoin;
    });

    res.json({
      success: true,
      data: availableGroups.map(group => group.getGroupSummary()),
      message: `Found ${availableGroups.length} available groups`
    });
  } catch (error) {
    console.error('Error getting available groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting available groups',
      error: error.message
    });
  }
};

// Sem 6 specific: Get continuation projects
const getContinuationProjects = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { projectType = 'minor2' } = req.query;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find completed projects that can be continued
    const completedProjects = await Project.find({
      student: student._id,
      projectType: projectType,
      status: 'completed',
      grade: { $nin: ['Fail', 'F'] }
    })
    .populate('faculty', 'fullName department designation')
    .populate('group', 'name members')
    .sort({ completedAt: -1 });

    // Filter projects that can be continued
    const continuationProjects = completedProjects.filter(project => 
      project.canBeContinued()
    );

    res.json({
      success: true,
      data: continuationProjects.map(project => ({
        ...project.toObject(),
        continuationStatus: project.getContinuationStatus()
      })),
      message: `Found ${continuationProjects.length} projects available for continuation`
    });
  } catch (error) {
    console.error('Error getting continuation projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting continuation projects',
      error: error.message
    });
  }
};

// Sem 6 specific: Create continuation project
const createContinuationProject = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { previousProjectId, title, description, projectType = 'minor3' } = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find previous project
    const previousProject = await Project.findOne({
      _id: previousProjectId,
      student: student._id
    });

    if (!previousProject) {
      return res.status(404).json({
        success: false,
        message: 'Previous project not found'
      });
    }

    // Check if project can be continued
    if (!previousProject.canBeContinued()) {
      return res.status(400).json({
        success: false,
        message: 'Previous project cannot be continued'
      });
    }

    // Create continuation project
    const continuationProject = new Project({
      title,
      description,
      projectType,
      student: student._id,
      group: previousProject.group,
      faculty: previousProject.faculty,
      semester: student.semester,
      academicYear: generateAcademicYear(),
      isContinuation: true,
      previousProject: previousProject._id,
      status: 'registered'
    });

    await continuationProject.save();

    res.status(201).json({
      success: true,
      data: {
        ...continuationProject.toObject(),
        continuationStatus: continuationProject.getContinuationStatus()
      },
      message: 'Continuation project created successfully'
    });
  } catch (error) {
    console.error('Error creating continuation project:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating continuation project',
      error: error.message
    });
  }
};

// Sem 6 specific: Get project milestones
const getProjectMilestones = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { projectId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({
      _id: projectId,
      student: student._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const milestones = project.getMilestones();
    const progress = project.getProgress();

    res.json({
      success: true,
      data: {
        milestones,
        progress,
        projectInfo: {
          title: project.title,
          projectType: project.projectType,
          status: project.status
        }
      },
      message: 'Project milestones retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting project milestones:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting project milestones',
      error: error.message
    });
  }
};

// Sem 6 specific: Update milestone
const updateMilestone = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { projectId, milestoneId } = req.params;
    const updates = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({
      _id: projectId,
      student: student._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Update milestone
    await project.updateMilestone(milestoneId, updates);

    const updatedMilestones = project.getMilestones();
    const progress = project.getProgress();

    res.json({
      success: true,
      data: {
        milestones: updatedMilestones,
        progress
      },
      message: 'Milestone updated successfully'
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating milestone',
      error: error.message
    });
  }
};

// Sem 6 specific: Get project progress
const getProjectProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { projectId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({
      _id: projectId,
      student: student._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const progress = project.getProgress();
    const continuationStatus = project.getContinuationStatus();

    res.json({
      success: true,
      data: {
        progress,
        continuationStatus,
        projectInfo: {
          title: project.title,
          projectType: project.projectType,
          status: project.status,
          submissionDeadline: project.submissionDeadline
        }
      },
      message: 'Project progress retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting project progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting project progress',
      error: error.message
    });
  }
};

// Sem 7 specific: Get semester 7 options
const getSem7Options = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is in semester 7
    if (student.semester !== 7) {
      return res.status(400).json({
        success: false,
        message: 'Student must be in semester 7 to access these options'
      });
    }

    const internshipEligibility = student.getInternshipEligibility();
    const majorProjectEligibility = student.getMajorProjectEligibility();
    const currentInternship = student.getCurrentInternship();
    const internshipStats = student.getInternshipStatistics();

    res.json({
      success: true,
      data: {
        semester: student.semester,
        degree: student.degree,
        branch: student.branch,
        options: {
          internship: {
            available: internshipEligibility.isEligible,
            eligibility: internshipEligibility,
            current: currentInternship,
            statistics: internshipStats
          },
          majorProject: {
            available: majorProjectEligibility.isEligible,
            eligibility: majorProjectEligibility
          }
        },
        recommendations: getSem7Recommendations(internshipEligibility, majorProjectEligibility)
      },
      message: 'Semester 7 options retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting semester 7 options:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting semester 7 options',
      error: error.message
    });
  }
};

// Sem 7 specific: Apply for internship
const applyForInternship = async (req, res) => {
  try {
    const studentId = req.user.id;
    const internshipData = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check eligibility
    const eligibility = student.getInternshipEligibility();
    if (!eligibility.isEligible) {
      return res.status(400).json({
        success: false,
        message: 'Student is not eligible for internship',
        requirements: eligibility.requirements
      });
    }

    // Check if already doing internship
    if (student.semesterStatus.isDoingInternship) {
      return res.status(400).json({
        success: false,
        message: 'Student is already doing an internship'
      });
    }

    // Add internship
    await student.addInternship({
      ...internshipData,
      type: '6month',
      semester: student.semester
    });

    // Update semester status
    await student.updateSemesterStatus({
      isDoingInternship: true,
      internshipSemester: student.semester
    });

    res.status(201).json({
      success: true,
      data: student.getCurrentInternship(),
      message: 'Internship application submitted successfully'
    });
  } catch (error) {
    console.error('Error applying for internship:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying for internship',
      error: error.message
    });
  }
};

// Sem 7 specific: Get major project analytics
const getMajorProjectAnalytics = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { projectId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({
      _id: projectId,
      student: student._id,
      projectType: { $in: ['major1', 'major2'] }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Major project not found'
      });
    }

    const analytics = project.getProjectAnalytics();
    const timeline = project.getProjectTimeline();
    const majorProjectStatus = project.getMajorProjectStatus();

    res.json({
      success: true,
      data: {
        analytics,
        timeline,
        majorProjectStatus,
        projectInfo: {
          title: project.title,
          projectType: project.projectType,
          status: project.status,
          faculty: project.faculty,
          group: project.group
        }
      },
      message: 'Major project analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting major project analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting major project analytics',
      error: error.message
    });
  }
};

// Sem 7 specific: Get internship progress
const getInternshipProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const currentInternship = student.getCurrentInternship();
    if (!currentInternship) {
      return res.status(404).json({
        success: false,
        message: 'No active internship found'
      });
    }

    const internshipStats = student.getInternshipStatistics();
    const progress = calculateInternshipProgress(currentInternship);

    res.json({
      success: true,
      data: {
        currentInternship,
        progress,
        statistics: internshipStats,
        studentInfo: {
          fullName: student.fullName,
          semester: student.semester,
          branch: student.branch
        }
      },
      message: 'Internship progress retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting internship progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting internship progress',
      error: error.message
    });
  }
};

// Helper function for Sem 7 recommendations
const getSem7Recommendations = (internshipEligibility, majorProjectEligibility) => {
  const recommendations = [];
  
  if (internshipEligibility.isEligible && majorProjectEligibility.isEligible) {
    recommendations.push('You can choose either internship or major project');
    recommendations.push('Consider your career goals and interests');
  } else if (internshipEligibility.isEligible) {
    recommendations.push('Internship is recommended based on your eligibility');
  } else if (majorProjectEligibility.isEligible) {
    recommendations.push('Major project is recommended based on your eligibility');
  } else {
    recommendations.push('Complete required prerequisites before proceeding');
  }
  
  return recommendations;
};

// Helper function to calculate internship progress
const calculateInternshipProgress = (internship) => {
  if (!internship.startDate || !internship.endDate) {
    return { progress: 0, daysRemaining: null, status: 'unknown' };
  }
  
  const now = new Date();
  const startDate = new Date(internship.startDate);
  const endDate = new Date(internship.endDate);
  
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - elapsedDays);
  
  const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  
  let status = 'ongoing';
  if (now < startDate) status = 'upcoming';
  else if (now > endDate) status = 'completed';
  else if (progress > 90) status = 'nearing_completion';
  
  return {
    progress: progress.toFixed(2),
    daysRemaining,
    status,
    totalDays,
    elapsedDays
  };
};

// Sem 8 specific: Get graduation status
const getGraduationStatus = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is in semester 8
    if (student.semester !== 8) {
      return res.status(400).json({
        success: false,
        message: 'Student must be in semester 8 to check graduation status'
      });
    }

    const graduationSummary = student.getGraduationSummary();
    const portfolio = student.getFinalProjectPortfolio();

    res.json({
      success: true,
      data: {
        graduationSummary,
        portfolio,
        studentInfo: {
          fullName: student.fullName,
          degree: student.degree,
          branch: student.branch,
          semester: student.semester,
          misNumber: student.misNumber
        }
      },
      message: 'Graduation status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting graduation status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting graduation status',
      error: error.message
    });
  }
};

// Sem 8 specific: Get final project portfolio
const getFinalProjectPortfolio = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const portfolio = student.getFinalProjectPortfolio();
    const academicJourney = student.getAcademicJourney();
    const semesterBreakdown = student.getSemesterBreakdown();

    res.json({
      success: true,
      data: {
        portfolio,
        academicJourney,
        semesterBreakdown,
        studentInfo: {
          fullName: student.fullName,
          degree: student.degree,
          branch: student.branch,
          semester: student.semester
        }
      },
      message: 'Final project portfolio retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting final project portfolio:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting final project portfolio',
      error: error.message
    });
  }
};

// Sem 8 specific: Get comprehensive project summary
const getComprehensiveProjectSummary = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { projectId } = req.params;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find project
    const project = await Project.findOne({
      _id: projectId,
      student: student._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const comprehensiveSummary = project.getComprehensiveSummary();
    const completionScore = project.calculateCompletionScore();
    const achievements = project.getProjectAchievements();
    const futureRecommendations = project.getFutureRecommendations();

    res.json({
      success: true,
      data: {
        comprehensiveSummary,
        completionScore,
        achievements,
        futureRecommendations,
        projectInfo: {
          title: project.title,
          projectType: project.projectType,
          semester: project.semester,
          status: project.status
        }
      },
      message: 'Comprehensive project summary retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting comprehensive project summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting comprehensive project summary',
      error: error.message
    });
  }
};

// Sem 8 specific: Get academic journey
const getAcademicJourney = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const academicJourney = student.getAcademicJourney();
    const semesterBreakdown = student.getSemesterBreakdown();
    const achievements = student.getAchievements();
    const finalGPA = student.calculateFinalGPA();

    res.json({
      success: true,
      data: {
        academicJourney,
        semesterBreakdown,
        achievements,
        finalGPA,
        studentInfo: {
          fullName: student.fullName,
          degree: student.degree,
          branch: student.branch,
          semester: student.semester
        }
      },
      message: 'Academic journey retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting academic journey:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting academic journey',
      error: error.message
    });
  }
};

// M.Tech specific: Get M.Tech semester options
const getMTechSemesterOptions = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is M.Tech
    if (student.degree !== 'M.Tech') {
      return res.status(400).json({
        success: false,
        message: 'Student is not in M.Tech program'
      });
    }

    const semesterOptions = student.getMTechSemesterOptions();
    const academicPath = student.getMTechAcademicPath();

    res.json({
      success: true,
      data: {
        semesterOptions,
        academicPath,
        studentInfo: {
          fullName: student.fullName,
          degree: student.degree,
          branch: student.branch,
          semester: student.semester
        }
      },
      message: 'M.Tech semester options retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting M.Tech semester options:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting M.Tech semester options',
      error: error.message
    });
  }
};

// M.Tech specific: Get project continuation options (Sem 2)
const getProjectContinuationOptions = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is M.Tech Sem 2
    if (student.degree !== 'M.Tech' || student.semester !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Project continuation available only for M.Tech semester 2 students'
      });
    }

    const continuationOptions = student.getProjectContinuationOptions();

    res.json({
      success: true,
      data: continuationOptions,
      message: 'Project continuation options retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting project continuation options:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting project continuation options',
      error: error.message
    });
  }
};

// Sem 5 specific: Get Sem 5 Dashboard
const getSem5Dashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId }).populate('user');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is in semester 5
    if (student.semester !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Sem 5 dashboard is only available for semester 5 students'
      });
    }

    // Get current group first - using $elemMatch to ensure the student is an *active* member
    const group = await Group.findOne({
      semester: 5,
      isActive: true,
      members: {
        $elemMatch: {
          student: student._id,
          isActive: true
        }
      }
    }).populate('members.student allocatedFaculty project');

    // Get student's current semester projects
    // Include projects where:
    // 1. Student is the owner (for solo projects like minor1)
    // 2. Student is in a group that has the project (for group projects like minor2)
    const projectQuery = {
      semester: 5,
      $or: [
        { student: student._id }, // Direct ownership
        { group: group?._id } // Group membership
      ]
    };
    
    const projects = await Project.find(projectQuery).populate('faculty group');

    // Get faculty preferences
    const facultyPreferences = await FacultyPreference.find({
      student: student._id,
      semester: 5
    }).populate('project group preferences.faculty');

    res.json({
      success: true,
      data: {
        student: student,
        project: projects.find(p => p.projectType === 'minor2') || null,
        group: group,
        facultyPreferences: facultyPreferences,
        allocationStatus: {
          groupFormed: !!group,
          projectRegistered: !!projects.find(p => p.projectType === 'minor2'),
          facultyPreferencesSubmitted: facultyPreferences.length > 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting Sem 5 dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting Sem 5 dashboard',
      error: error.message
    });
  }
};

// Get Group Invitations (supports both Sem 5 and Sem 7)
const getGroupInvitations = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is in semester 5, 7, or 8 (all support group invitations)
    if (student.semester !== 5 && student.semester !== 7 && student.semester !== 8) {
      return res.status(400).json({
        success: false,
        message: 'Group invitations are only available for semester 5, 7, and 8 students'
      });
    }

    // For Sem 7: Verify student is in coursework track
    if (student.semester === 7) {
      const eligibility = checkSem7CourseworkEligibility(student);
      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: eligibility.reason || 'Only coursework track students can receive group invitations'
        });
      }
    }

    // For Sem 8: Verify student is Type 1 (coursework track) - Type 1 students need groups for Major Project 2
    if (student.semester === 8) {
      const studentType = student.getSem8StudentType();
      if (studentType !== 'type1') {
        return res.status(400).json({
          success: false,
          message: 'Only Type 1 students (coursework track) can receive group invitations for Major Project 2'
        });
      }
    }

    // Find groups where this student has pending invitations
    // Filter by semester to only show invitations for the student's current semester
    const groupsWithInvitations = await Group.find({
      'invites.student': student._id,
      'invites.status': 'pending',
      semester: student.semester // Only get invitations for current semester
    })
    .populate({
      path: 'leader',
      select: 'fullName misNumber'
    })
    .populate({
      path: 'invites.student',
      select: 'fullName misNumber'
    })
    .populate({
      path: 'invites.invitedBy',
      select: 'fullName misNumber'
    });

    // Extract invitations for this student
    const studentInvitations = [];
    groupsWithInvitations.forEach(group => {
      group.invites.forEach(invite => {
        if (invite.student._id.toString() === student._id.toString() && invite.status === 'pending') {
          studentInvitations.push({
            _id: invite._id,
            group: {
              _id: group._id,
              name: group.name,
              description: group.description,
              status: group.status,
              maxMembers: group.maxMembers,
              minMembers: group.minMembers,
              semester: group.semester,
              leader: group.leader
            },
            role: invite.role,
            invitedBy: invite.invitedBy,
            invitedAt: invite.invitedAt,
            status: invite.status,
            createdAt: invite.invitedAt // For compatibility with frontend
          });
        }
      });
    });

    res.json({
      success: true,
      data: studentInvitations
    });
  } catch (error) {
    console.error('Error getting group invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting group invitations',
      error: error.message
    });
  }
};

// M.Tech specific: Apply for M.Tech internship
const applyForMTechInternship = async (req, res) => {
  try {
    const studentId = req.user.id;
    const internshipData = req.body;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check eligibility
    const eligibility = student.checkMTechInternshipEligibility();
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason || 'Student is not eligible for internship',
        requirements: eligibility.requirements
      });
    }

    // Check if already doing internship
    if (student.semesterStatus.isDoingInternship) {
      return res.status(400).json({
        success: false,
        message: 'Student is already doing an internship'
      });
    }

    // Add internship
    await student.addInternship({
      ...internshipData,
      type: '6month',
      semester: student.semester
    });

    // Update semester status
    await student.updateSemesterStatus({
      isDoingInternship: true,
      internshipSemester: student.semester
    });

    res.status(201).json({
      success: true,
      data: student.getCurrentInternship(),
      message: 'M.Tech internship application submitted successfully'
    });
  } catch (error) {
    console.error('Error applying for M.Tech internship:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying for M.Tech internship',
      error: error.message
    });
  }
};

// M.Tech specific: Check M.Tech coursework eligibility
const checkMTechCourseworkEligibility = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const eligibility = student.checkMTechCourseworkEligibility();

    res.json({
      success: true,
      data: eligibility,
      message: 'M.Tech coursework eligibility checked successfully'
    });
  } catch (error) {
    console.error('Error checking M.Tech coursework eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking M.Tech coursework eligibility',
      error: error.message
    });
  }
};

// M.Tech specific: Get M.Tech academic path
const getMTechAcademicPath = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is M.Tech
    if (student.degree !== 'M.Tech') {
      return res.status(400).json({
        success: false,
        message: 'Student is not in M.Tech program'
      });
    }

    const academicPath = student.getMTechAcademicPath();

    res.json({
      success: true,
      data: {
        academicPath,
        studentInfo: {
          fullName: student.fullName,
          degree: student.degree,
          branch: student.branch,
          semester: student.semester
        }
      },
      message: 'M.Tech academic path retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting M.Tech academic path:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting M.Tech academic path',
      error: error.message
    });
  }
};

// New methods for systematic upload tracking

// Get all uploads for a specific student
const getStudentUploads = async (req, res) => {
  try {
    const studentId = req.user.id;
    const uploads = await Project.getUploadsByStudent(studentId);
    
    res.json({
      success: true,
      data: uploads,
      message: 'Student uploads retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting student uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving uploads',
      error: error.message
    });
  }
};

// Get uploads for a specific project
const getProjectUploads = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: projectId } = req.params;
    
    // Get project for this student
    const project = await Project.findOne({
      _id: projectId,
      student: studentId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const uploads = project.getAllUploads();
    
    res.json({
      success: true,
      data: uploads,
      message: 'Project uploads retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting project uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving uploads',
      error: error.message
    });
  }
};

// Get uploads by type for a project
const getProjectUploadsByType = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id: projectId } = req.params;
    const { type } = req.query;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'File type is required'
      });
    }

    // Get project for this student
    const project = await Project.findOne({
      _id: projectId,
      student: studentId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const uploads = project.getUploadsByType(type);
    
    res.json({
      success: true,
      data: uploads,
      message: `${type} uploads retrieved successfully`
    });
  } catch (error) {
    console.error('Error getting project uploads by type:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving uploads',
      error: error.message
    });
  }
};

// Sem 5 Advanced Features: Transfer group leadership
const transferLeadership = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupId } = req.params;
    const { newLeaderId } = req.body;
    
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if current user is the group leader
    if (group.leader.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the group leader can transfer leadership'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await group.transferLeadership(newLeaderId, student._id, session);
      
      // Update student roles atomically
      await student.updateGroupRoleAtomic(groupId, 'member', session);
      
      // Update new leader's role
      const newLeader = await Student.findById(newLeaderId).session(session);
      if (newLeader && newLeader.groupId.toString() === groupId) {
        await newLeader.updateGroupRoleAtomic(groupId, 'leader', session);
      }
      
      await session.commitTransaction();
      await session.endSession();

      // 🔥 REAL-TIME NOTIFICATION: Leadership Transfer
      try {
        const socketService = req.app.get('socketService');
        if (socketService) {
          const newLeader = await Student.findById(newLeaderId);
          await socketService.notifyLeadershipTransfer(groupId, {
            previousLeader: { id: student._id, fullName: student.fullName },
            newLeader: { id: newLeader?._id, fullName: newLeader?.fullName },
            transferredAt: new Date()
          });
        }
      } catch (socketError) {
        console.error('Socket notification error:', socketError);
      }

      const updatedGroup = await Group.findById(groupId)
        .populate('members.student', 'fullName misNumber collegeEmail branch')
        .populate('leader', 'fullName misNumber collegeEmail branch');

      res.json({
        success: true,
        data: { group: updatedGroup },
        message: 'Leadership transferred successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error transferring leadership:', error);
    res.status(500).json({
      success: false,
      message: 'Error transferring leadership',
      error: error.message
    });
  }
};

// Sem 5 Advanced Features: Finalize group
const finalizeGroup = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupId } = req.params;
    
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if current user is the group leader
    if (group.leader.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the group leader can finalize the group'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await group.finalizeGroup(student._id, session);
      
      // Reject all pending invitations when group is finalized
      const socketService = req.app.get('socketService');
      await rejectAllPendingInvitations(groupId, session, socketService, 'Group has been finalized');
      
      await session.commitTransaction();
      await session.endSession();

      // 🔥 REAL-TIME NOTIFICATION: Group Finalization
      try {
        if (socketService) {
          await socketService.notifyGroupFinalized(groupId, {
            finalizedBy: { id: student._id, fullName: student.fullName },
            finalizedAt: new Date(),
            status: 'finalized'
          });
        }
      } catch (socketError) {
        console.error('Socket notification error:', socketError);
      }

      const updatedGroup = await Group.findById(groupId)
        .populate('members.student', 'fullName misNumber collegeEmail branch')
        .populate('leader', 'fullName misNumber collegeEmail branch');

      res.json({
        success: true,
        data: { group: updatedGroup },
        message: 'Group finalized successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  } catch (error) {
    console.error('Error finalizing group:', error);
    res.status(500).json({
      success: false,
      message: 'Error finalizing group',
      error: error.message
    });
  }
};

// Sem 5 Advanced Features: Force disband group (admin) 
const disbandGroupAdmin = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await group.disbandGroup(currentUserId, session);
      
      // Update all members to set groupId to null
      const groupMemberIds = group.members.filter(member => member.isActive)
        .map(member => member.student);
      
      await Student.updateMany(
        { _id: { $in: groupMemberIds } },
        { $unset: { groupId: "" } },
        { session }
      );

      await session.commitTransaction();
      await session.endSession();

      res.json({
        success: true,
        data: { groupId, status: 'disbanded' },
        message: 'Group disbanded successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error disbanding group:', error);
    res.status(500).json({
      success: false,
      message: 'Error disbanding group',
      error: error.message
    });
  }
};

// Enhanced leave group function 
const leaveGroupEnhanced = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupId } = req.params;
    
    const student = await Student.findOne({ user: studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await group.allowMemberLeave(student._id, session);
      await student.leaveGroupAtomic(groupId, session);
      
      await session.commitTransaction();
      await session.endSession();

      try {
        const leaderStudent = await Student.findById(group.leader);
        if (leaderStudent && leaderStudent.collegeEmail) {
          const subject = 'SPMS IIITP - Member left your group';
          const text = `Dear ${leaderStudent.fullName || 'Group Leader'},\n\n${student.fullName} has left your group ${group.name || 'your group'}.\n\nPlease log in to the SPMS portal to review your current group members and take any necessary actions.\n\nRegards,\nSPMS IIIT Pune`;
          const html = `
            <p>Dear ${leaderStudent.fullName || 'Group Leader'},</p>
            <p><strong>${student.fullName}</strong> has left your group <strong>${group.name || 'your group'}</strong>.</p>
            <p>Please log in to the SPMS portal to review your current group members and take any necessary actions.</p>
            <p>Regards,<br/>SPMS IIIT Pune</p>
          `;

          await sendEmail({
            to: leaderStudent.collegeEmail,
            subject,
            text,
            html,
          });
        }
      } catch (emailError) {
        console.error('Error sending group leave notification email:', emailError);
      }

      // 🔥 REAL-TIME NOTIFICATION: Member Left Group
      try {
        const socketService = req.app.get('socketService');
        if (socketService) {
          await socketService.notifyMemberLeave(groupId, {
            leftBy: { id: student._id, fullName: student.fullName },
            leftAt: new Date()
          });
        }
      } catch (socketError) {
        console.error('Socket notification error:', socketError);
      }

      // Don't return group data since the student is no longer part of it
      res.json({
        success: true,
        data: null,
        message: 'Left group successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({
      success: false,
      message: 'Error leaving group',
      error: error.message
    });
  }
};

// Test endpoint to verify student data fetching
const testStudentLookup = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const student = await Student.findById(studentId).select('fullName misNumber collegeEmail branch');
    
    res.json({
      success: true,
      data: {
        student: student,
        studentId: studentId
      }
    });
  } catch (error) {
    console.error('🔍 Backend TEST: Error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
};

// Get student profile
const getStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const student = await Student.findOne({ user: userId }).populate('user', 'email role isActive lastLogin').lean();
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          fullName: student.fullName,
          misNumber: student.misNumber,
          semester: student.semester,
          degree: student.degree,
          branch: student.branch,
          contactNumber: student.contactNumber,
          academicYear: student.academicYear,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
          isGraduated: student.isGraduated,
          graduationYear: student.graduationYear,
        },
        user: student.user
      }
    });
  } catch (err) {
    console.error('Error fetching student profile:', err);
    res.status(500).json({ success: false, message: 'Error fetching student profile' });
  }
};

// Update student profile
const updateStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    let { fullName, contactNumber, branch } = req.body;

    if (fullName !== undefined) {
      fullName = String(fullName).trim();
      if (fullName.length === 0) {
        return res.status(400).json({ success: false, message: 'Full name cannot be empty' });
      }
    }
    if (contactNumber !== undefined) {
      contactNumber = String(contactNumber).trim();
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(contactNumber)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit phone number' });
      }
    }

    // Build update object only with provided fields
    const update = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (contactNumber !== undefined) update.contactNumber = contactNumber;
    if (branch !== undefined) update.branch = branch;

    const updated = await Student.findOneAndUpdate(
      { user: userId },
      update,
      { new: true, runValidators: true }
    ).populate('user', 'email role isActive lastLogin');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // Sync User document for global displays (e.g., navbar)
    try {
      const userDoc = await User.findById(updated.user._id);
      if (userDoc) {
        if (fullName !== undefined) userDoc.name = updated.fullName;
        if (contactNumber !== undefined) userDoc.phone = updated.contactNumber;
        await userDoc.save();
      }
    } catch (e) {
      // Non-fatal; proceed even if user sync fails
      console.warn('Warning: failed to sync User with Student profile update:', e?.message);
    }

    // Re-populate user to reflect latest
    const refreshedUser = await User.findById(updated.user._id).select('email role isActive lastLogin createdAt name phone');

    return res.json({
      success: true,
      data: {
        student: {
          id: updated._id,
          fullName: updated.fullName,
          misNumber: updated.misNumber,
          semester: updated.semester,
          degree: updated.degree,
          branch: updated.branch,
          contactNumber: updated.contactNumber,
          academicYear: updated.academicYear,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          isGraduated: updated.isGraduated,
          graduationYear: updated.graduationYear,
        },
        user: refreshedUser
      }
    });
  } catch (err) {
    console.error('Error updating student profile:', err);
    if (err.name === 'ValidationError' || err.name === 'MongoServerError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: 'Error updating student profile' });
  }
};

const getSystemConfigForStudents = async (req, res) => {
  try {
    const { key } = req.params;
    
    let config = await SystemConfig.findOne({ configKey: key, isActive: true });
    
    // If config doesn't exist, check if we have a default value and auto-create it
    if (!config) {
      // Define default values for known config keys
      const defaultConfigs = {
        'sem7.major1.minGroupMembers': { value: 4, type: 'number', description: 'Minimum number of members required in a Sem 7 Major Project 1 group', category: 'sem7' },
        'sem7.major1.maxGroupMembers': { value: 5, type: 'number', description: 'Maximum number of members allowed in a Sem 7 Major Project 1 group', category: 'sem7' },
        'sem7.major1.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 7 Major Project 1 registration', category: 'sem7' },
        'sem7.major1.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 7 Major Project 1 preferences', category: 'sem7' },
        'sem7.internship1.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 7 Internship 1 registration', category: 'sem7' },
        'sem7.internship1.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 7 Internship 1 preferences', category: 'sem7' },
        'sem8.major2.group.minGroupMembers': { value: 4, type: 'number', description: 'Minimum number of members required in a Sem 8 Type 1 Major Project 2 group', category: 'sem8' },
        'sem8.major2.group.maxGroupMembers': { value: 5, type: 'number', description: 'Maximum number of members allowed in a Sem 8 Type 1 Major Project 2 group', category: 'sem8' },
        'sem8.major2.group.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 8 Type 1 Major Project 2 (group) registration', category: 'sem8' },
        'sem8.major2.group.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 8 Type 1 Major Project 2 (group) preferences', category: 'sem8' },
        'sem8.internship2.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 8 Internship 2 registration', category: 'sem8' },
        'sem8.internship2.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 8 Internship 2 preferences', category: 'sem8' },
        'sem8.major2.solo.facultyPreferenceLimit': { value: 5, type: 'number', description: 'Number of faculty preferences required for Sem 8 Type 2 Major Project 2 (solo) registration', category: 'sem8' },
        'sem8.major2.solo.allowedFacultyTypes': { value: ['Regular', 'Adjunct', 'On Lien'], type: 'array', description: 'Faculty types allowed in dropdown for Sem 8 Type 2 Major Project 2 (solo) preferences', category: 'sem8' }
      };
      
      // Check if we have a default for this key
      if (defaultConfigs[key]) {
        const defaultConfig = defaultConfigs[key];
        // Auto-create the config in the background (async, don't wait)
        // This ensures it exists for future requests without blocking this response
        SystemConfig.setConfigValue(
          key,
          defaultConfig.value,
          defaultConfig.type,
          defaultConfig.description,
          defaultConfig.category
        ).catch(err => {
          // Silently handle creation errors - default value is still returned
          console.error(`Failed to auto-create config ${key}:`, err.message);
        });
        
        // Return the default value immediately with 200 status (prevents 404 console errors)
        return res.json({
          success: true,
          data: {
            key: key,
            value: defaultConfig.value,
            description: defaultConfig.description
          }
        });
      } else {
        // No default available, return 404
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }
    }

    res.json({
      success: true,
      data: {
        key: config.configKey,
        value: config.configValue,
        description: config.description
      }
    });
  } catch (error) {
    console.error('Error getting system configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system configuration',
      error: error.message
    });
  }
};

// Sem 6: Get Sem 5 group and faculty for Sem 6 registration
const getSem5GroupForSem6 = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findOne({ user: studentId });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    if (student.semester !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Student must be in Semester 6'
      });
    }
    
    // Find Sem 5 group membership
    const sem5Membership = student.groupMemberships.find(
      gm => gm.semester === 5 && gm.isActive
    );
    
    if (!sem5Membership) {
      return res.status(404).json({
        success: false,
        message: 'No Sem 5 group found. You must have completed Semester 5 with a group.'
      });
    }
    
    // Get Sem 5 group with populated data
    const sem5Group = await Group.findById(sem5Membership.group)
      .populate('members.student', 'fullName misNumber collegeEmail branch')
      .populate('leader', 'fullName misNumber collegeEmail')
      .populate('allocatedFaculty', 'fullName department designation email phone')
      .populate('project', 'title description projectType status createdAt');
    
    if (!sem5Group) {
      return res.status(404).json({
        success: false,
        message: 'Sem 5 group not found'
      });
    }
    
    // Check if group has allocated faculty
    if (!sem5Group.allocatedFaculty) {
      return res.status(400).json({
        success: false,
        message: 'Your Sem 5 group does not have an allocated faculty. Please contact admin.'
      });
    }
    
    // Check if current student is the group leader (for UI display, not blocking)
    // Note: sem5Group.leader is populated, so we need to access ._id
    const isGroupLeader = sem5Group.leader._id.toString() === student._id.toString();
    
    // Check if already registered for Sem 6
    const existingSem6Project = await Project.findOne({
      group: sem5Group._id,
      semester: 6,
      projectType: 'minor3'
    });
    
    if (existingSem6Project) {
      return res.json({
        success: true,
        alreadyRegistered: true,
        message: 'Group already registered for Semester 6 project',
        data: {
          group: {
            _id: sem5Group._id,
            name: sem5Group.name,
            description: sem5Group.description,
            members: sem5Group.members,
            leader: sem5Group.leader,
            status: sem5Group.status,
            academicYear: sem5Group.academicYear
          },
          faculty: sem5Group.allocatedFaculty,
          sem5Project: sem5Group.project,
          projectId: existingSem6Project._id,
          isGroupLeader: isGroupLeader
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        group: {
          _id: sem5Group._id,
          name: sem5Group.name,
          description: sem5Group.description,
          members: sem5Group.members,
          leader: sem5Group.leader,
          status: sem5Group.status,
          academicYear: sem5Group.academicYear
        },
        faculty: sem5Group.allocatedFaculty,
        sem5Project: sem5Group.project,
        canContinue: !!sem5Group.project && sem5Group.project.status !== 'cancelled',
        isGroupLeader: isGroupLeader // Return this so frontend knows if user can submit
      }
    });
  } catch (error) {
    console.error('Error getting Sem 5 group for Sem 6:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Sem 5 group data',
      error: error.message
    });
  }
};

// Sem 6: Register project (continuation or new)
const registerSem6Project = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const studentId = req.user.id;
      const { 
        isContinuing, 
        previousProjectId, 
        title, 
        domain 
      } = req.body;
      
      const student = await Student.findOne({ user: studentId }).session(session);
      
      if (!student) {
        throw new Error('Student not found');
      }
      
      if (student.semester !== 6) {
        throw new Error('Student must be in Semester 6');
      }
      
      // Find Sem 5 group membership
      const sem5Membership = student.groupMemberships.find(
        gm => gm.semester === 5 && gm.isActive
      );
      
      if (!sem5Membership) {
        throw new Error('No Sem 5 group found');
      }
      
      const sem5Group = await Group.findById(sem5Membership.group)
        .populate('members.student')
        .session(session);
      
      if (!sem5Group) {
        throw new Error('Sem 5 group not found');
      }
      
      // Verify group leader
      // Note: leader is not populated here, so it's an ObjectId - direct comparison works
      const isGroupLeader = sem5Group.leader.toString() === student._id.toString();
      if (!isGroupLeader) {
        throw new Error('Only the group leader can register for Sem 6 project');
      }
      
      // Check if already registered
      const existingProject = await Project.findOne({
        group: sem5Group._id,
        semester: 6,
        projectType: 'minor3'
      }).session(session);
      
      if (existingProject) {
        throw new Error('Group already registered for Sem 6 project');
      }
      
      // Get academic year
      const newAcademicYear = generateAcademicYear();
      
      let sem6Group;
      let sem6Project;
      let sem5Project = null;
      
      if (isContinuing) {
        // Option A: Continue Sem 5 project
        if (!previousProjectId) {
          throw new Error('Previous project ID required for continuation');
        }
        
        sem5Project = await Project.findById(previousProjectId).session(session);
        if (!sem5Project || sem5Project.semester !== 5) {
          throw new Error('Invalid Sem 5 project');
        }
        
        if (sem5Project.group.toString() !== sem5Group._id.toString()) {
          throw new Error('Previous project does not belong to this group');
        }
        
        // Migrate existing group to Sem 6
        sem6Group = await migrateGroupToSem6(sem5Group._id, newAcademicYear, session);
        
        // Create continuation project
        // Since Sem 6 uses the same faculty from Sem 5, status should be 'faculty_allocated'
        const sem6Status = sem5Group.allocatedFaculty ? 'faculty_allocated' : 'registered';
        sem6Project = new Project({
          title: sem5Project.title, // Same title
          description: sem5Project.description, // Same description
          domain: sem5Project.domain, // Same domain
          projectType: 'minor3',
          semester: 6,
          academicYear: newAcademicYear,
          student: student._id, // Group leader
          group: sem6Group._id,
          faculty: sem5Group.allocatedFaculty, // Same faculty
          isContinuation: true,
          previousProject: sem5Project._id,
          status: sem6Status,
          startDate: new Date()
        });
        
        await sem6Project.save({ session });
        
        // Mark Sem 5 project as completed
        sem5Project.status = 'completed';
        sem5Project.endDate = new Date();
        await sem5Project.save({ session });
        
      } else {
        // Option B: New project
        if (!title || !domain) {
          throw new Error('Title and domain required for new project');
        }
        
        // Create new group for Sem 6 (don't migrate existing)
        sem6Group = await createNewGroupForSem6(sem5Group._id, newAcademicYear, session);
        
        // Create new project
        // Since Sem 6 uses the same faculty from Sem 5, status should be 'faculty_allocated'
        const sem6Status = sem5Group.allocatedFaculty ? 'faculty_allocated' : 'registered';
        sem6Project = new Project({
          title: title.trim(),
          // description is optional - not required for Sem 6 Minor Project 3 (using domain instead)
          domain: domain.trim(),
          projectType: 'minor3',
          semester: 6,
          academicYear: newAcademicYear,
          student: student._id,
          group: sem6Group._id,
          faculty: sem5Group.allocatedFaculty, // Same faculty
          isContinuation: false,
          previousProject: null,
          status: sem6Status,
          startDate: new Date()
        });
        
        await sem6Project.save({ session });
        
        // Mark Sem 5 project as completed (if exists)
        if (sem5Group.project) {
          const oldProject = await Project.findById(sem5Group.project).session(session);
          if (oldProject) {
            oldProject.status = 'completed';
            oldProject.endDate = new Date();
            await oldProject.save({ session });
          }
        }
      }
      
      // Update group with new project
      sem6Group.project = sem6Project._id;
      await sem6Group.save({ session });
      
      // Update all group members' current projects
      const groupMembers = sem6Group.members.filter(m => m.isActive);
      
      for (const member of groupMembers) {
        const memberStudent = await Student.findById(member.student).session(session);
        if (memberStudent) {
          const role = member.role === 'leader' ? 'leader' : 'member';
          
          // Check if project already exists in currentProjects
          const existingProject = memberStudent.currentProjects.find(cp => 
            cp.project && cp.project.toString() === sem6Project._id.toString()
          );
          
          if (!existingProject) {
            memberStudent.currentProjects.push({
              project: sem6Project._id,
              role: role,
              semester: 6,
              status: 'active',
              joinedAt: new Date()
            });
            await memberStudent.save({ session });
          }
        }
      }
      
      // Populate project before returning
      await sem6Project.populate('group', 'name members leader');
      await sem6Project.populate('faculty', 'fullName department designation');
      
      res.json({
        success: true,
        data: {
          project: sem6Project,
          group: sem6Group,
          isContinuation: isContinuing,
          previousProject: sem5Project
        },
        message: isContinuing 
          ? 'Sem 6 project registered successfully (continuing from Sem 5)' 
          : 'Sem 6 project registered successfully (new project)'
      });
    });
  } catch (error) {
    console.error('Error registering Sem 6 project:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering Sem 6 project'
    });
  } finally {
    session.endSession();
  }
};

// M.Tech Sem 2: Get Sem 1 project details for Sem 2 registration
const getMTechSem1ProjectForSem2 = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findOne({ user: studentId });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.degree !== 'M.Tech') {
      return res.status(400).json({
        success: false,
        message: 'This registration flow is only available for M.Tech students'
      });
    }

    if (student.semester !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Student must be in Semester 2 to register for Minor Project 2'
      });
    }

    const existingSem2Project = await Project.findOne({
      student: student._id,
      semester: 2,
      projectType: 'minor2'
    }).populate('faculty', 'fullName department designation email phone');

    if (existingSem2Project) {
      return res.status(400).json({
        success: false,
        message: 'Minor Project 2 has already been registered',
        alreadyRegistered: true,
        data: {
          project: existingSem2Project
        }
      });
    }

    const previousProject = await Project.findOne({
      student: student._id,
      semester: 1,
      projectType: 'minor1'
    })
      .populate('faculty', 'fullName department designation email phone')
      .lean();

    const responseData = {
      previousProject: previousProject || null,
      faculty: previousProject?.faculty || null,
      canContinue: !!previousProject,
      hasFaculty: !!previousProject?.faculty
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting Sem 1 project for M.Tech Sem 2:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching M.Tech Sem 1 project details',
      error: error.message
    });
  }
};

// M.Tech Sem 2: Register project (continuation or new)
const registerMTechSem2Project = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const studentId = req.user.id;
      const { isContinuing, previousProjectId, title, description } = req.body;

      const student = await Student.findOne({ user: studentId }).session(session);

      if (!student) {
        throw new Error('Student not found');
      }

      if (student.degree !== 'M.Tech') {
        throw new Error('This registration flow is only available for M.Tech students');
      }

      if (student.semester !== 2) {
        throw new Error('Student must be in Semester 2 to register for Minor Project 2');
      }

      const existingSem2Project = await Project.findOne({
        student: student._id,
        semester: 2,
        projectType: 'minor2'
      }).session(session);

      if (existingSem2Project) {
        throw new Error('Minor Project 2 has already been registered');
      }

      let previousProject = null;

      if (previousProjectId) {
        previousProject = await Project.findOne({
          _id: previousProjectId,
          student: student._id
        }).session(session);
      }

      if (!previousProject) {
        previousProject = await Project.findOne({
          student: student._id,
          semester: 1,
          projectType: 'minor1'
        }).session(session);
      }

      if (!previousProject) {
        throw new Error('Previous semester project not found');
      }

      if (!isContinuing && (!title || !description)) {
        throw new Error('Title and description are required for a new project');
      }

      const academicYear = generateAcademicYear();
      const now = new Date();

      const baseProjectData = {
        projectType: 'minor2',
        semester: 2,
        academicYear,
        student: student._id,
        faculty: previousProject.faculty || null,
        facultyPreferences: previousProject.facultyPreferences || [],
        status: 'registered',
        startDate: now,
        isInternship: false
      };

      let sem2Project;

      if (isContinuing) {
        sem2Project = new Project({
          ...baseProjectData,
          title: previousProject.title,
          description: previousProject.description,
          isContinuation: true,
          previousProject: previousProject._id
        });
      } else {
        sem2Project = new Project({
          ...baseProjectData,
          title: title.trim(),
          description: description.trim(),
          isContinuation: false,
          previousProject: null
        });
      }

      await sem2Project.save({ session });

      // Mark previous project as completed
      previousProject.status = 'completed';
      previousProject.endDate = now;
      await previousProject.save({ session });

      // Update student's current projects
      if (!student.currentProjects) {
        student.currentProjects = [];
      }

      const previousEntry = student.currentProjects.find(cp =>
        cp.project.toString() === previousProject._id.toString()
      );

      if (previousEntry) {
        previousEntry.status = 'completed';
      }

      const existingEntry = student.currentProjects.find(cp =>
        cp.project.toString() === sem2Project._id.toString()
      );

      if (!existingEntry) {
        student.currentProjects.push({
          project: sem2Project._id,
          role: 'solo',
          semester: 2,
          status: 'active',
          joinedAt: now
        });
      }

      if (student.semesterStatus) {
        student.semesterStatus.hasCompletedPreviousProject = true;
        student.semesterStatus.lastUpdated = now;
      }

      await student.save({ session });

      await sem2Project.populate('faculty', 'fullName department designation email phone');

      res.json({
        success: true,
        data: {
          project: sem2Project
        },
        message: isContinuing
          ? 'Minor Project 2 registered successfully as a continuation of Semester 1 project'
          : 'Minor Project 2 registered successfully'
      });
    });
  } catch (error) {
    console.error('Error registering M.Tech Sem 2 project:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering M.Tech Sem 2 project'
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getDashboardData,
  getSemesterFeatures,
  getStudentProjects,
  getProjectById,
  getStudentGroups,
  getStudentInternships,
  registerProject,
  submitProjectFacultyPreferences,
  registerMinorProject2,
  registerMajorProject1,
  registerMTechSem3MajorProject,
  registerInternship1,
  checkInternship1Status,
  // Sem 8 specific functions
  registerMajorProject2,
  registerInternship2,
  checkInternship2Status,
  getFacultyAllocationStatus,
  getStudentGroupStatus,
  updateProject,
  submitDeliverables,
  addInternship,
  // Sem 4 specific functions
  submitPPT,
  removePPT,
  schedulePresentation,
  getSem4ProjectStatus,
  // Sem 5 specific functions
  createGroup,
  updateGroupName,
  leaveGroup,
  submitFacultyPreferences,
  // Sem 5 enhanced functions
  getGroupById,
  getAvailableStudents,
  inviteToGroup,
  acceptInvitation,
  rejectInvitation,
  sendGroupInvitations,
  getAvailableGroups,
  getSem5Dashboard,
  getGroupInvitations,
  // Sem 5 advanced features
  transferLeadership,
  finalizeGroup,
  disbandGroupAdmin,
  leaveGroupEnhanced,
  // Sem 6 specific functions
  getContinuationProjects,
  createContinuationProject,
  getProjectMilestones,
  updateMilestone,
  getProjectProgress,
  getSem5GroupForSem6,
  registerSem6Project,
  getMTechSem1ProjectForSem2,
  registerMTechSem2Project,
  // Sem 7 specific functions
  getSem7Options,
  applyForInternship,
  getMajorProjectAnalytics,
  getInternshipProgress,
  // Sem 8 specific functions
  getGraduationStatus,
  getFinalProjectPortfolio,
  getComprehensiveProjectSummary,
  // Upload tracking functions
  getStudentUploads,
  getProjectUploads,
  getProjectUploadsByType,
  getAcademicJourney,
  // M.Tech specific functions
  getMTechSemesterOptions,
  getProjectContinuationOptions,
  applyForMTechInternship,
  checkMTechCourseworkEligibility,
  getMTechAcademicPath,
  // Faculty functions
  getFacultyList,
  // Test functions
  testStudentLookup,
  // System config functions (from Amrut1)
  getSystemConfigForStudents,
  // Profile functions (from main)
  getStudentProfile,
  updateStudentProfile
};