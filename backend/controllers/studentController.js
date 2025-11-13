const Student = require('../models/Student');
const Project = require('../models/Project');
const Group = require('../models/Group');
const Faculty = require('../models/Faculty');
const FacultyPreference = require('../models/FacultyPreference');
const SystemConfig = require('../models/SystemConfig');
const mongoose = require('mongoose');
const User = require('../models/User');
const { migrateGroupToSem6, createNewGroupForSem6, generateAcademicYear } = require('../utils/semesterMigration');

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
      .populate('members.student', 'fullName misNumber collegeEmail')
      .populate('leader', 'fullName misNumber collegeEmail')
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
          
          // Check if project already exists in currentProjects (avoid duplicates)
          const existingProject = memberStudent.currentProjects.find(cp => 
            cp.project.toString() === project._id.toString()
          );
          
          if (!existingProject) {
            memberStudent.currentProjects.push({
              project: project._id,
              role: role,
              semester: 5,
              status: 'active',
              joinedAt: new Date()
            });
            await memberStudent.save({ session });
          }
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

    // Check if student can form groups - Sem 5 students should be allowed
    if (student.semester === 5) {
      // Semester 5 students explicitly allowed for Minor Project 2
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

    // Create new group using transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
    // Create group with creator as leader
    const group = new Group({
      name,
      description,
      maxMembers,
      minMembers: 4,
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
    try {
      const cancelSession = await mongoose.startSession();
      cancelSession.startTransaction();
      
      const socketService = req.app.get('socketService');
      await cancelAllStudentInvitations(student._id, cancelSession, socketService, 'Student created their own group');
      
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

// Sem 5 enhanced: Send invitations to selected members
const sendGroupInvitations = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds = [] } = req.body;
    const studentId = req.user.id;

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
    if (group.status !== 'invitations_sent') {
      return res.status(400).json({
        success: false,
        message: 'Group is not in invitations_sent status'
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

          // Check if student is already invited
          const existingInvite = freshGroup.invites.find(inv => inv.student.toString() === memberId);
          if (existingInvite) {
            invitationResults.push({
              studentId: memberId,
              status: 'already_invited',
              message: `Student already invited (${existingInvite.status})`
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

          // Add invitation to group
          freshGroup.invites.push({
            student: memberId,
            role: 'member',
            invitedBy: student._id,
            invitedAt: new Date(),
            status: 'pending'
          });
          
          await freshGroup.save({ session });
          
          // Add invitation to student's invites array
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
      select: 'fullName misNumber collegeEmail'
    });
    
    await group.populate('members.student');
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

    // Enhanced search term handling
    const searchTerm = query || search;
    const searchRegex = searchTerm ? new RegExp(searchTerm, 'i') : null;

    // Ensure pagination limits
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    // Enhanced search query with multiple filters
    // For 5th semester BTech students, show both CSE and ECE students
    const searchQuery = {
      _id: { $ne: student._id },
      semester: branch ? parseInt(semester) || student.semester : student.semester,
      degree: student.degree,
      // For 5th semester BTech, allow both CSE and ECE branches
      ...(student.semester === 5 && student.degree === 'B.Tech' ? {
        branch: { $in: ['CSE', 'ECE'] }
      } : {
        branch: branch || student.branch // For other semesters, use same branch or specified branch
      }),
      ...(searchRegex ? {
        $or: [
          { fullName: searchRegex },
          { misNumber: searchRegex },
          { collegeEmail: searchRegex },
          { contactNumber: searchRegex }
        ]
      } : {})
    };

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
    const students = await Student.find(searchQuery)
      .select('fullName misNumber collegeEmail contactNumber branch semester')
      .limit(limitNum)
      .skip(skip)
      .sort(sortQuery);


    // Check students' group status and invites
    const studentsWithStatus = await Promise.all(
      students.map(async (s) => {
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
          status: finalStatus
        };
      })
    );

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

    res.json({
      success: true,
      data: studentsWithStatus,
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
      message: `Found ${studentsWithStatus.length} students matching your criteria`
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
    invite.status = 'rejected';
    invite.rejectedAt = new Date();
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
const cancelAllStudentInvitations = async (studentId, session, socketService, reason = 'Student joined another group') => {
  try {
    // 1. Cancel all invitations sent by this student (in groups they created/lead)
    const groupsLedByStudent = await Group.find({
      $or: [
        { createdBy: studentId },
        { leader: studentId }
      ],
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
    const groupsWithStudentInvites = await Group.find({
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

    // 🔥 REAL-TIME NOTIFICATION: Invitations Sent
    try {
      const socketService = req.app.get('socketService');
      if (socketService && results.length > 0) {
        for (const invitation of results) {
          // Send real-time invitation to every invited student
          const invitedStudent = await Student.findById(invitation.studentId);
          if (invitedStudent) {
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
            
            // Send a system notification to the student
            await socketService.sendSystemNotification(invitedStudent.user, {
              title: 'New Group Invitation',
              message: `You've been invited to join "${updatedGroup.name}" by ${student.fullName}`,
              type: 'info'
            });
          }
        }

        // Notify existing group members about new invitations sent
        await socketService.broadcastMembershipChange(groupId, {
          changeType: 'invitations_sent',
          invitations: results.map(r => ({ studentId: r.studentId, role: r.role })),
          triggeredBy: student._id
        });
      }
    } catch (socketError) {
      console.error('Socket notification error for invitations:', socketError);
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
        // Find the invitation and mark it as rejected
        const invite = group.invites.id(inviteId);
        if (invite) {
          invite.status = 'rejected';
          invite.rejectedAt = new Date();
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

    if (preferences.length > 7) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 7 faculty preferences allowed'
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

// Sem 5 specific: Get Group Invitations
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

    // Check if student is in semester 5
    if (student.semester !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Group invitations are only available for semester 5 students'
      });
    }

    // Find groups where this student has pending invitations
    const groupsWithInvitations = await Group.find({
      'invites.student': student._id,
      'invites.status': 'pending'
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
    
    const config = await SystemConfig.findOne({ configKey: key, isActive: true });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
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
      return res.status(400).json({
        success: false,
        message: 'Group already registered for Semester 6 project',
        alreadyRegistered: true
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
        description 
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
        sem6Project = new Project({
          title: sem5Project.title, // Same title
          description: sem5Project.description, // Same description
          projectType: 'minor3',
          semester: 6,
          academicYear: newAcademicYear,
          student: student._id, // Group leader
          group: sem6Group._id,
          faculty: sem5Group.allocatedFaculty, // Same faculty
          isContinuation: true,
          previousProject: sem5Project._id,
          status: 'registered',
          startDate: new Date()
        });
        
        await sem6Project.save({ session });
        
        // Mark Sem 5 project as completed
        sem5Project.status = 'completed';
        sem5Project.endDate = new Date();
        await sem5Project.save({ session });
        
      } else {
        // Option B: New project
        if (!title || !description) {
          throw new Error('Title and description required for new project');
        }
        
        // Create new group for Sem 6 (don't migrate existing)
        sem6Group = await createNewGroupForSem6(sem5Group._id, newAcademicYear, session);
        
        // Create new project
        sem6Project = new Project({
          title: title.trim(),
          description: description.trim(),
          projectType: 'minor3',
          semester: 6,
          academicYear: newAcademicYear,
          student: student._id,
          group: sem6Group._id,
          faculty: sem5Group.allocatedFaculty, // Same faculty
          isContinuation: false,
          previousProject: null,
          status: 'registered',
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