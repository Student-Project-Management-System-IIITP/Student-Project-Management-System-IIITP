const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Project = require('../models/Project');
const Group = require('../models/Group');
const FacultyPreference = require('../models/FacultyPreference');
const SystemConfig = require('../models/SystemConfig');

// Get admin profile data
const getAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get admin details with populated user data
    const admin = await Admin.findOne({ user: userId })
      .populate('user', 'email role isActive lastLogin createdAt')
      .lean();

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          fullName: admin.fullName,
          phone: admin.phone,
          adminId: admin.adminId,
          department: admin.department,
          designation: admin.designation,
          isSuperAdmin: admin.isSuperAdmin,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        },
        user: {
          id: admin.user._id,
          email: admin.user.email,
          role: admin.user.role,
          isActive: admin.user.isActive,
          lastLogin: admin.user.lastLogin,
          createdAt: admin.user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error getting admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin profile',
      error: error.message
    });
  }
};

// Update admin profile
const updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, department, designation } = req.body;

    // Validate required fields
    if (!fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name and phone are required'
      });
    }

    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Update admin profile
    const admin = await Admin.findOneAndUpdate(
      { user: userId },
      { 
        fullName: fullName.trim(),
        phone: phone.trim(),
        ...(department && { department }),
        ...(designation && { designation })
      },
      { new: true, runValidators: true }
    ).populate('user', 'email role isActive lastLogin createdAt');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        admin: {
          id: admin._id,
          fullName: admin.fullName,
          phone: admin.phone,
          adminId: admin.adminId,
          department: admin.department,
          designation: admin.designation,
          isSuperAdmin: admin.isSuperAdmin,
          updatedAt: admin.updatedAt
        },
        user: {
          id: admin.user._id,
          email: admin.user.email,
          role: admin.user.role,
          isActive: admin.user.isActive,
          lastLogin: admin.user.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Get admin dashboard data
const getDashboardData = async (req, res) => {
  try {
    // Get basic counts
    const totalStudents = await Student.countDocuments();
    const totalFaculty = await Faculty.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProjects = await Project.countDocuments();
    const totalGroups = await Group.countDocuments();
    
    // Get project statistics
    const projectStats = {
      total: totalProjects,
      registered: await Project.countDocuments({ status: 'registered' }),
      faculty_allocated: await Project.countDocuments({ status: 'faculty_allocated' }),
      active: await Project.countDocuments({ status: 'active' }),
      completed: await Project.countDocuments({ status: 'completed' }),
      cancelled: await Project.countDocuments({ status: 'cancelled' })
    };

    // Get group statistics
    const groupStats = {
      total: totalGroups,
      forming: await Group.countDocuments({ status: 'forming' }),
      complete: await Group.countDocuments({ status: 'complete' }),
      locked: await Group.countDocuments({ status: 'locked' }),
      disbanded: await Group.countDocuments({ status: 'disbanded' })
    };

    // Get allocation statistics
    const allocationStats = {
      pending: await FacultyPreference.countDocuments({ status: 'pending' }),
      allocated: await FacultyPreference.countDocuments({ status: 'allocated' }),
      rejected: await FacultyPreference.countDocuments({ status: 'rejected' })
    };

    // Get recent activities
    const recentStudents = await Student.find()
      .populate('user', 'email role isActive lastLogin')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentFaculty = await Faculty.find()
      .populate('user', 'email role isActive lastLogin')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentProjects = await Project.find()
      .populate('student', 'fullName misNumber')
      .populate('faculty', 'fullName department')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalFaculty,
          totalUsers,
          totalProjects,
          totalGroups
        },
        projectStats,
        groupStats,
        allocationStats,
        recentStudents,
        recentFaculty,
        recentProjects
      }
    });
  } catch (error) {
    console.error('Error getting admin dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Get all students
const getStudents = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
};

// Get all faculty
const getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find({ isActive: true })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: faculty
    });
  } catch (error) {
    console.error('Error getting faculty:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculty',
      error: error.message
    });
  }
};

// Get all projects
const getProjects = async (req, res) => {
  try {
    const { semester, status, projectType, faculty } = req.query;
    
    // Build query
    const query = {};
    
    if (semester !== undefined && semester !== null && semester !== '') {
      const semesterNumber = parseInt(semester, 10);
      if (!Number.isNaN(semesterNumber)) {
        query.semester = semesterNumber;
      }
    }
    
    if (status) {
      query.status = status;
    }
    
    if (projectType) {
      query.projectType = projectType;
    }
    
    if (faculty) {
      query.faculty = faculty;
    }

    // Get projects with populated data
    const projects = await Project.find(query)
      .populate('student', 'fullName misNumber collegeEmail semester degree branch contactNumber')
      .populate('faculty', 'fullName department designation')
      .populate({
        path: 'facultyPreferences.faculty',
        select: 'fullName department designation'
      })
      .populate({
        path: 'group',
        select: 'name members allocatedFaculty',
        populate: [
          {
            path: 'members.student',
            select: 'fullName misNumber collegeEmail semester degree branch contactNumber'
          },
          {
            path: 'allocatedFaculty',
            select: 'fullName department designation'
          }
        ]
      })
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
    console.error('Error getting projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
};

// Get all groups
const getGroups = async (req, res) => {
  try {
    const { semester, status, faculty } = req.query;
    
    // Build query
    const query = {};
    
    if (semester) {
      query.semester = parseInt(semester);
    }
    
    if (status) {
      query.status = status;
    }
    
    if (faculty) {
      query.allocatedFaculty = faculty;
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
    console.error('Error getting groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: error.message
    });
  }
};

// Get system statistics
const getSystemStats = async (req, res) => {
  try {
    const stats = {
      totalStudents: await Student.countDocuments({ isActive: true }),
      totalFaculty: await Faculty.countDocuments({ isActive: true }),
      totalUsers: await User.countDocuments(),
      activeStudents: await Student.countDocuments({ isActive: true, isGraduated: false }),
      graduatedStudents: await Student.countDocuments({ isGraduated: true })
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system statistics',
      error: error.message
    });
  }
};

// Get all allocations
const getAllocations = async (req, res) => {
  try {
    const { status, semester, faculty } = req.query;
    
    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (semester) {
      query.semester = parseInt(semester);
    }
    
    if (faculty) {
      query.allocatedFaculty = faculty;
    }

    // Get allocations with populated data
    const allocations = await FacultyPreference.find(query)
      .populate('student', 'fullName misNumber collegeEmail semester degree branch')
      .populate('project', 'title description projectType')
      .populate('group', 'name members')
      .populate('preferences.faculty', 'fullName department designation')
      .populate('allocatedFaculty', 'fullName department designation')
      .sort({ createdAt: -1 });

    // Get allocation statistics
    const stats = {
      total: allocations.length,
      pending: allocations.filter(a => a.status === 'pending').length,
      allocated: allocations.filter(a => a.status === 'allocated').length,
      rejected: allocations.filter(a => a.status === 'rejected').length,
      cancelled: allocations.filter(a => a.status === 'cancelled').length
    };

    res.json({
      success: true,
      data: allocations,
      stats,
      message: `Found ${allocations.length} allocations`
    });
  } catch (error) {
    console.error('Error getting allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching allocations',
      error: error.message
    });
  }
};

// Get unallocated groups
const getUnallocatedGroups = async (req, res) => {
  try {
    const { semester } = req.query;
    
    // Build query for groups without faculty allocation
    const query = {
      allocatedFaculty: { $exists: false },
      isActive: true,
      status: { $in: ['complete', 'locked'] }
    };
    
    if (semester) {
      query.semester = parseInt(semester);
    }

    // Get unallocated groups
    const groups = await Group.find(query)
      .populate('members.student', 'fullName misNumber collegeEmail')
      .populate('leader', 'fullName misNumber collegeEmail')
      .populate('project', 'title description projectType')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: groups,
      message: `Found ${groups.length} unallocated groups`
    });
  } catch (error) {
    console.error('Error getting unallocated groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unallocated groups',
      error: error.message
    });
  }
};

// Force allocate faculty to group/project
const forceAllocateFaculty = async (req, res) => {
  try {
    const { allocationId, facultyId } = req.body;
    
    // Find allocation
    const allocation = await FacultyPreference.findById(allocationId);
    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation not found'
      });
    }

    // Check if faculty exists
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Force allocate
    await allocation.adminAllocate(facultyId, req.user.id);

    // Update project/group with faculty allocation
    let group = null;
    if (allocation.group) {
      // Don't populate when saving to avoid validation issues
      group = await Group.findById(allocation.group);
      if (group) {
        group.allocatedFaculty = facultyId;
        await group.save();
        
        // Get populated version for member updates below
        group = await Group.findById(allocation.group).populate('members.student');
      }
    }

    if (allocation.project) {
      const project = await Project.findById(allocation.project);
      if (project) {
        project.faculty = facultyId;
        project.status = 'faculty_allocated';
        project.allocatedBy = 'admin_allocation';
        await project.save();
        
        // Update all group members' currentProjects status
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
        }
      }
    }

    res.json({
      success: true,
      message: 'Faculty allocated successfully'
    });
  } catch (error) {
    console.error('Error force allocating faculty:', error);
    res.status(500).json({
      success: false,
      message: 'Error force allocating faculty',
      error: error.message
    });
  }
};

// Update project status (admin override)
const updateProjectStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, grade, feedback } = req.body;
    
    // Find project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Update project
    if (status) project.status = status;
    if (grade) project.grade = grade;
    if (feedback) project.feedback = feedback;
    
    if (status === 'completed' || grade) {
      project.evaluatedBy = req.user.id;
      project.evaluatedAt = new Date();
    }

    await project.save();

    res.json({
      success: true,
      data: project,
      message: 'Project status updated successfully'
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating project status',
      error: error.message
    });
  }
};

// Sem 5 specific: Get allocation statistics
const getAllocationStatistics = async (req, res) => {
  try {
    const { semester, academicYear } = req.query;

    const query = { isActive: true };
    if (semester) query.semester = parseInt(semester);
    if (academicYear) query.academicYear = academicYear;

    const totalGroups = await Group.countDocuments(query);
    const allocatedGroups = await Group.countDocuments({ ...query, allocatedFaculty: { $exists: true } });
    const unallocatedGroups = totalGroups - allocatedGroups;

    const groupsByStatus = await Group.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const groupsByFaculty = await Group.aggregate([
      { $match: { ...query, allocatedFaculty: { $exists: true } } },
      { $group: { _id: '$allocatedFaculty', count: { $sum: 1 } } },
      { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
      { $unwind: '$faculty' },
      { $project: { facultyName: '$faculty.fullName', count: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalGroups,
        allocatedGroups,
        unallocatedGroups,
        allocationRate: totalGroups > 0 ? (allocatedGroups / totalGroups * 100).toFixed(2) : 0,
        groupsByStatus,
        groupsByFaculty
      },
      message: 'Allocation statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting allocation statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting allocation statistics',
      error: error.message
    });
  }
};

// Get Sem 4 Minor Project 1 registrations
const getSem4MinorProject1Registrations = async (req, res) => {
  try {
    const { batch, currentYear } = req.query;
    
    let query = {
      projectType: 'minor1',
      semester: 4
    };

    // Add academic year filter based on batch
    if (batch || currentYear) {
      if (batch) {
        // Convert batch (e.g., "2024-2028") to academicYear format
        const startYear = batch.split('-')[0];
        const academicYear = `${startYear}-${parseInt(startYear) + 4}`;
        query.academicYear = academicYear;
      } else if (currentYear === 'true') {
        // Get current academic year
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6; // July = month index 6
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        const academicYear = `${academicStartYear}-${academicStartYear + 4}`;
        query.academicYear = academicYear;
      }
    }

    // Get projects with populated student data
    const projects = await Project.find(query)
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .sort({ createdAt: -1 });

    // Format the response with required columns
    const formattedRegistrations = projects.map(project => ({
      _id: project._id,
      timestamp: project.createdAt,
      email: project.student?.user?.email || 'N/A',
      name: project.student?.fullName || 'N/A',
      misNumber: project.student?.misNumber || 'N/A',
      contact: project.student?.contactNumber || 'N/A',
      branch: project.student?.branch || 'N/A',
      projectTitle: project.title,
      status: project.status,
      academicYear: project.academicYear,
      projectType: project.projectType,
      semester: project.semester
    }));

    res.json({
      success: true,
      data: formattedRegistrations,
      total: formattedRegistrations.length
    });

  } catch (error) {
    console.error('Error getting Sem 4 Minor Project 1 registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

// Get Unregistered Sem 4 Students
const getUnregisteredSem4Students = async (req, res) => {
  try {
    // Find all Semester 4 students
    const allSem4Students = await Student.find({ 
      semester: 4,
      degree: 'B.Tech'
    })
    .populate('user', 'email')
    .lean();

    // Find all students who have registered for Minor Project 1
    const registeredProjects = await Project.find({
      projectType: 'minor1',
      semester: 4
    }).distinct('student');

    // Filter out students who have already registered
    const unregisteredStudents = allSem4Students.filter(
      student => !registeredProjects.some(
        registeredId => registeredId.toString() === student._id.toString()
      )
    );

    res.json({
      success: true,
      data: unregisteredStudents,
      count: unregisteredStudents.length,
      message: 'Unregistered Sem 4 students retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting unregistered Sem 4 students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unregistered students',
      error: error.message
    });
  }
};

// Get Sem 5 Non-Registered Students
const getSem5NonRegisteredStudents = async (req, res) => {
  try {
    const { batch, currentYear, academicYear } = req.query;
    
    let query = {
      semester: 5
    };

    // Add academic year filter
    if (academicYear) {
      query.academicYear = academicYear;
    } else if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        // Academic year format should be "2024-25" not "2024-2028"
        const acYear = `${startYear}-${(parseInt(startYear) + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        // Academic year format should be "2024-25" not "2024-2028"
        const acYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      }
    }

    // Get all Sem 5 students
    const students = await Student.find(query)
      .populate('user', 'email')
      .populate('groupId', 'name status allocatedFaculty')
      .sort({ fullName: 1 });

    // Get all Sem 5 projects (only from groups still in Sem 5)
    const projectQuery = {
      projectType: 'minor2',
      semester: 5,
      ...(query.academicYear && { academicYear: query.academicYear })
    };
    
    const projects = await Project.find(projectQuery)
      .populate('group', 'semester')
      .select('student group');
    
    // Filter to only include projects where group is still in Sem 5
    const sem5OnlyProjects = projects.filter(p => !p.group || p.group.semester === 5);

    // Create a set of students who have registered
    const registeredStudentIds = new Set(sem5OnlyProjects.map(p => p.student.toString()));

    // Get all groups with allocated faculty for Sem 5 (only groups still in Sem 5)
    const allocatedGroups = await Group.find({
      semester: 5,
      allocatedFaculty: { $exists: true, $ne: null },
      isActive: true,
      ...(query.academicYear && { academicYear: query.academicYear })
    }).select('members');

    // Create a set of students who are in groups with allocated faculty
    const studentsInAllocatedGroups = new Set();
    allocatedGroups.forEach(group => {
      group.members.forEach(member => {
        if (member.isActive) {
          studentsInAllocatedGroups.add(member.student.toString());
        }
      });
    });

    // Filter students who:
    // 1. Haven't registered for minor2 project
    // 2. Are NOT in a group that has allocated faculty
    const nonRegisteredStudents = students.filter(student => 
      !registeredStudentIds.has(student._id.toString()) &&
      !studentsInAllocatedGroups.has(student._id.toString())
    );

    // Format the response
    const formattedStudents = nonRegisteredStudents.map(student => ({
      _id: student._id,
      fullName: student.fullName,
      misNumber: student.misNumber,
      email: student.user?.email || 'N/A',
      contactNumber: student.contactNumber,
      branch: student.branch,
      academicYear: student.academicYear,
      groupStatus: student.groupId ? 'In Group' : 'Not in Group',
      groupName: student.groupId?.name || 'N/A',
      groupId: student.groupId?._id || null
    }));

    // Calculate statistics
    const stats = {
      totalNotRegistered: formattedStudents.length,
      inGroup: formattedStudents.filter(s => s.groupId).length,
      notInGroup: formattedStudents.filter(s => !s.groupId).length
    };

    res.json({
      success: true,
      data: formattedStudents,
      stats,
      total: formattedStudents.length
    });

  } catch (error) {
    console.error('Error getting non-registered students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-registered students',
      error: error.message
    });
  }
};

// Get Sem 5 Groups for Admin Dashboard
const getSem5Groups = async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    const query = {
      semester: 5,
      isActive: true
    };

    if (academicYear) {
      query.academicYear = academicYear;
    } else {
      // Default to current academic year
      const currentDate = new Date();
      const currentYearNum = currentDate.getFullYear();
      const isPreMid = currentDate.getMonth() < 6;
      const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
      query.academicYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
    }

    const groups = await Group.find(query)
      .populate('members.student', 'fullName misNumber')
      .populate('allocatedFaculty', 'fullName department')
      .populate('project', 'title status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: groups,
      total: groups.length
    });
  } catch (error) {
    console.error('Error getting Sem 5 groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Sem 5 groups',
      error: error.message
    });
  }
};

// Get Sem 5 Statistics for Admin Dashboard
const getSem5Statistics = async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    const query = {
      semester: 5
    };

    if (academicYear) {
      query.academicYear = academicYear;
    } else {
      // Default to current academic year
      const currentDate = new Date();
      const currentYearNum = currentDate.getFullYear();
      const isPreMid = currentDate.getMonth() < 6;
      const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
      query.academicYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
    }

    // Get group statistics
    const totalGroups = await Group.countDocuments({ ...query, isActive: true });
    const formedGroups = await Group.countDocuments({ ...query, isActive: true, status: { $in: ['finalized', 'locked', 'open'] } });
    const allocatedGroups = await Group.countDocuments({ ...query, isActive: true, allocatedFaculty: { $exists: true } });
    const unallocatedGroups = totalGroups - allocatedGroups;

    // Get project statistics
    const totalProjects = await Project.countDocuments({ ...query, projectType: 'minor2' });
    const registeredProjects = await Project.countDocuments({ ...query, projectType: 'minor2', status: 'registered' });
    const allocatedProjects = await Project.countDocuments({ ...query, projectType: 'minor2', status: 'faculty_allocated' });
    const activeProjects = await Project.countDocuments({ ...query, projectType: 'minor2', status: 'active' });

    res.json({
      success: true,
      data: {
        totalGroups,
        formedGroups,
        allocatedGroups,
        unallocatedGroups,
        totalProjects,
        registeredProjects,
        allocatedProjects,
        activeProjects,
        allocationRate: totalGroups > 0 ? ((allocatedGroups / totalGroups) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error getting Sem 5 statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Sem 5 statistics',
      error: error.message
    });
  }
};

// Get Sem 5 Allocated Faculty Overview
const getSem5AllocatedFaculty = async (req, res) => {
  try {
    const { batch, currentYear, academicYear } = req.query;
    
    let query = {
      semester: 5,
      isActive: true
    };

    // Add academic year filter
    if (academicYear) {
      query.academicYear = academicYear;
    } else if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        // Academic year format should be "2024-25" not "2024-2028"
        const acYear = `${startYear}-${(parseInt(startYear) + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        // Academic year format should be "2024-25" not "2024-2028"
        const acYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      }
    }

    // Get all groups with populated data
    // This will only get groups that are CURRENTLY in semester 5 (not migrated to sem 6)
    const groups = await Group.find(query)
      .populate({
        path: 'members.student',
        select: 'fullName misNumber contactNumber branch user semester',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .populate({
        path: 'allocatedFaculty',
        select: 'fullName department designation'
      })
      .populate({
        path: 'project',
        select: 'title status semester'
      })
      .sort({ allocatedFaculty: 1, createdAt: -1 }); // Sort by faculty first, then by creation date

    // Format the response with group members and allocated faculty
    const formattedGroups = groups.map(group => {
      const members = group.members?.filter(m => m.isActive) || [];
      
      const groupData = {
        _id: group._id,
        groupName: group.name || 'Unnamed Group',
        status: group.status,
        createdAt: group.createdAt,
        projectTitle: group.project?.title || 'Not registered yet',
        projectStatus: group.project?.status || 'N/A',
        allocatedFaculty: group.allocatedFaculty?.fullName || 'Not Allocated',
        facultyDepartment: group.allocatedFaculty?.department || '',
        facultyDesignation: group.allocatedFaculty?.designation || '',
        isAllocated: !!group.allocatedFaculty,
        memberCount: members.length,
        academicYear: group.academicYear
      };

      // Add all group members (up to 5)
      for (let i = 0; i < 5; i++) {
        const member = members[i];
        const memberNum = i + 1;
        
        if (member && member.student) {
          groupData[`member${memberNum}Name`] = member.student.fullName || '';
          groupData[`member${memberNum}MIS`] = member.student.misNumber || '';
          groupData[`member${memberNum}Contact`] = member.student.contactNumber || '';
          groupData[`member${memberNum}Branch`] = member.student.branch || '';
          groupData[`member${memberNum}Email`] = member.student.user?.email || '';
        } else {
          groupData[`member${memberNum}Name`] = '';
          groupData[`member${memberNum}MIS`] = '';
          groupData[`member${memberNum}Contact`] = '';
          groupData[`member${memberNum}Branch`] = '';
          groupData[`member${memberNum}Email`] = '';
        }
      }

      return groupData;
    });

    // Sort: Allocated groups first (sorted by faculty name), then unallocated groups
    const allocatedGroups = formattedGroups.filter(g => g.isAllocated);
    // Unallocated groups should only include those who have registered (have a project)
    const unallocatedGroups = formattedGroups.filter(g => 
      !g.isAllocated && g.projectTitle !== 'Not registered yet'
    );
    
    // Sort allocated groups by faculty name
    allocatedGroups.sort((a, b) => a.allocatedFaculty.localeCompare(b.allocatedFaculty));
    
    const sortedGroups = [...allocatedGroups, ...unallocatedGroups];

    // Calculate statistics
    const stats = {
      totalGroups: formattedGroups.length,
      allocatedGroups: allocatedGroups.length,
      unallocatedGroups: unallocatedGroups.length,
      allocationRate: formattedGroups.length > 0 
        ? ((allocatedGroups.length / formattedGroups.length) * 100).toFixed(2) 
        : 0
    };

    res.json({
      success: true,
      data: sortedGroups,
      stats,
      total: sortedGroups.length
    });

  } catch (error) {
    console.error('Error getting Sem 5 allocated faculty overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching allocated faculty data',
      error: error.message
    });
  }
};

// Get Sem 5 Minor Project 2 registrations
const getSem5MinorProject2Registrations = async (req, res) => {
  try {
    const { batch, currentYear } = req.query;
    
    let query = {
      projectType: 'minor2',
      semester: 5
    };

    // Add academic year filter based on batch
    if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        const academicYear = `${startYear}-${parseInt(startYear) + 4}`;
        query.academicYear = academicYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        const academicYear = `${academicStartYear}-${academicStartYear + 4}`;
        query.academicYear = academicYear;
      }
    }

    // Get projects with populated data
    const projects = await Project.find(query)
      .populate({
        path: 'group',
        select: 'name semester academicYear members',
        populate: {
          path: 'members.student',
          select: 'fullName misNumber contactNumber branch user semester',
          populate: {
            path: 'user',
            select: 'email'
          }
        }
      })
      .populate({
        path: 'facultyPreferences.faculty',
        select: 'fullName'
      })
      .sort({ createdAt: -1 });

    // Filter out projects where the group has been migrated to Sem 6
    // (group.semester will be 6 if it was migrated for continuation)
    const sem5OnlyProjects = projects.filter(project => {
      if (!project.group) return true; // Keep if no group data
      return project.group.semester === 5; // Only keep if group is still in Sem 5
    });

    // Format the response with all group members and faculty preferences
    const formattedRegistrations = sem5OnlyProjects.map(project => {
      const group = project.group;
      const members = group?.members?.filter(m => m.isActive) || [];
      
      // Create a flat structure with all member details
      const registration = {
        _id: project._id,
        timestamp: project.createdAt,
        email: members[0]?.student?.user?.email || 'N/A',
        projectTitle: project.title,
        academicYear: project.academicYear,
        status: project.status,
        groupId: group?._id,
        groupName: group?.name || 'N/A'
      };

      // Add all group members (up to 5)
      for (let i = 0; i < 5; i++) {
        const member = members[i];
        const memberNum = i + 1;
        
        if (member && member.student) {
          registration[`member${memberNum}Name`] = member.student.fullName || 'N/A';
          registration[`member${memberNum}MIS`] = member.student.misNumber || 'N/A';
          registration[`member${memberNum}Contact`] = member.student.contactNumber || 'N/A';
          registration[`member${memberNum}Branch`] = member.student.branch || 'N/A';
        } else {
          registration[`member${memberNum}Name`] = '';
          registration[`member${memberNum}MIS`] = '';
          registration[`member${memberNum}Contact`] = '';
          registration[`member${memberNum}Branch`] = '';
        }
      }

      // Add faculty preferences (up to 10 to support any configuration)
      const facultyPrefs = project.facultyPreferences || [];
      for (let i = 0; i < 10; i++) {
        const pref = facultyPrefs.find(p => p.priority === i + 1);
        registration[`supervisor${i + 1}`] = pref?.faculty?.fullName || '';
      }

      return registration;
    });

    res.json({
      success: true,
      data: formattedRegistrations,
      total: formattedRegistrations.length
    });

  } catch (error) {
    console.error('Error getting Sem 5 Minor Project 2 registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

// Get Sem 6 Major Project registrations
const getSem6MajorProjectRegistrations = async (req, res) => {
  try {
    const { batch, currentYear } = req.query;
    
    let query = {
      projectType: 'minor3', // Sem 6 uses 'minor3' not 'major'
      semester: 6
    };

    // Add academic year filter based on batch
    if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        // Academic year format should be "2024-25" not "2024-2028"
        const academicYear = `${startYear}-${(parseInt(startYear) + 1).toString().slice(-2)}`;
        query.academicYear = academicYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        // Academic year format should be "2024-25" not "2024-2028"
        const academicYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
        query.academicYear = academicYear;
      }
    }

    // Get projects with populated data
    const projects = await Project.find(query)
      .populate({
        path: 'group',
        select: 'name semester academicYear members allocatedFaculty',
        populate: [
          {
            path: 'members.student',
            select: 'fullName misNumber contactNumber branch user semester',
            populate: {
              path: 'user',
              select: 'email'
            }
          },
          {
            path: 'allocatedFaculty',
            select: 'fullName department designation'
          }
        ]
      })
      .populate({
        path: 'faculty',
        select: 'fullName department designation'
      })
      .sort({ createdAt: -1 });

    // Filter to only include projects where group is actually in Sem 6 (or no group for new projects)
    const validProjects = projects.filter(project => {
      if (!project.group) return true; // Include if no group (edge case)
      return project.group.semester === 6; // Only include if group is in Sem 6
    });

    const formattedRegistrations = validProjects.map(project => {
      const group = project.group;
      const members = group?.members?.filter(m => m.isActive) || [];
      
      // Create a flat structure with all member details
      const registration = {
        _id: project._id,
        timestamp: project.createdAt,
        email: members[0]?.student?.user?.email || 'N/A',
        projectTitle: project.title,
        academicYear: project.academicYear,
        status: project.status,
        groupId: group?._id,
        groupName: group?.name || 'N/A',
        isContinuation: project.isContinuation || false,
        // Add allocated faculty information
        allocatedFaculty: group?.allocatedFaculty?.fullName || project.faculty?.fullName || 'Not Allocated',
        facultyDepartment: group?.allocatedFaculty?.department || project.faculty?.department || 'N/A',
        facultyDesignation: group?.allocatedFaculty?.designation || project.faculty?.designation || 'N/A'
      };

      // Add all group members (up to 5)
      for (let i = 0; i < 5; i++) {
        const member = members[i];
        const memberNum = i + 1;
        
        if (member && member.student) {
          registration[`member${memberNum}Name`] = member.student.fullName || 'N/A';
          registration[`member${memberNum}MIS`] = member.student.misNumber || 'N/A';
          registration[`member${memberNum}Contact`] = member.student.contactNumber || 'N/A';
          registration[`member${memberNum}Branch`] = member.student.branch || 'N/A';
        } else {
          registration[`member${memberNum}Name`] = '';
          registration[`member${memberNum}MIS`] = '';
          registration[`member${memberNum}Contact`] = '';
          registration[`member${memberNum}Branch`] = '';
        }
      }

      return registration;
    });

    res.json({
      success: true,
      data: formattedRegistrations,
      total: formattedRegistrations.length
    });

  } catch (error) {
    console.error('Error getting Sem 6 Major Project registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

// Get Sem 6 Non-Registered Groups
const getSem6NonRegisteredGroups = async (req, res) => {
  try {
    const { batch, currentYear, academicYear } = req.query;
    
    let query = {
      semester: 5, // Looking at Sem 5 groups that should continue to Sem 6
      isActive: true
    };

    // Add academic year filter
    if (academicYear) {
      query.academicYear = academicYear;
    } else if (batch || currentYear) {
      if (batch) {
        const startYear = batch.split('-')[0];
        // For Sem 5 groups, academic year is in format "2024-25" not "2024-2028"
        const acYear = `${startYear}-${(parseInt(startYear) + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        // For Sem 5 groups, academic year is in format "2024-25" not "2024-2028"
        const acYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
        query.academicYear = acYear;
      }
    }

    // Get all Sem 5 groups that are still in semester 5 (not migrated)
    const sem5Groups = await Group.find(query)
      .populate({
        path: 'members.student',
        select: 'fullName misNumber contactNumber branch user semester',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .populate('leader', 'fullName misNumber')
      .populate('allocatedFaculty', 'fullName department')
      .sort({ createdAt: -1 });

    // Get all Sem 6 projects
    const sem6Projects = await Project.find({
      projectType: 'minor3', // Sem 6 uses 'minor3' not 'major'
      semester: 6
    })
    .populate('student', 'semester')
    .select('group student');

    // Create a set of group IDs that have registered for Sem 6 (and group is actually in Sem 6)
    const registeredGroupIds = new Set();
    sem6Projects.forEach(project => {
      // Only count if the student is CURRENTLY in semester 6
      if (project.group && project.student && project.student.semester === 6) {
        registeredGroupIds.add(project.group.toString());
      }
    });

    // Get student IDs who are CURRENTLY in Sem 6 and have projects
    const sem6StudentIds = new Set();
    sem6Projects.forEach(project => {
      if (project.student && project.student.semester === 6) {
        sem6StudentIds.add(project.student._id.toString());
      }
    });

    // Filter out groups where at least one member has registered for Sem 6 AND is currently in Sem 6
    const nonRegisteredGroups = sem5Groups.filter(group => {
      const groupId = group._id.toString();
      
      // Check if group itself is registered (by a student currently in Sem 6)
      if (registeredGroupIds.has(groupId)) {
        return false;
      }
      
      // Check if any member of this group is CURRENTLY in Sem 6
      const hasCurrentSem6Member = group.members.some(member => {
        if (!member.student || !member.student._id) return false;
        // Check both: has Sem 6 project AND currently in semester 6
        const hasProject = sem6StudentIds.has(member.student._id.toString());
        const isCurrentlySem6 = member.student.semester === 6;
        return hasProject && isCurrentlySem6;
      });
      
      return !hasCurrentSem6Member;
    });

    // Format the response
    const formattedGroups = nonRegisteredGroups.map(group => {
      const members = group.members.filter(m => m.isActive) || [];
      
      const groupData = {
        _id: group._id,
        groupName: group.name || 'N/A',
        leaderName: group.leader?.fullName || 'N/A',
        leaderMIS: group.leader?.misNumber || 'N/A',
        allocatedFaculty: group.allocatedFaculty?.fullName || 'Not Allocated',
        facultyDepartment: group.allocatedFaculty?.department || 'N/A',
        memberCount: members.length,
        createdAt: group.createdAt,
        academicYear: group.academicYear
      };

      // Add all group members (up to 5)
      for (let i = 0; i < 5; i++) {
        const member = members[i];
        const memberNum = i + 1;
        
        if (member && member.student) {
          groupData[`member${memberNum}Name`] = member.student.fullName || 'N/A';
          groupData[`member${memberNum}MIS`] = member.student.misNumber || 'N/A';
          groupData[`member${memberNum}Contact`] = member.student.contactNumber || 'N/A';
          groupData[`member${memberNum}Branch`] = member.student.branch || 'N/A';
          groupData[`member${memberNum}Email`] = member.student.user?.email || 'N/A';
        } else {
          groupData[`member${memberNum}Name`] = '';
          groupData[`member${memberNum}MIS`] = '';
          groupData[`member${memberNum}Contact`] = '';
          groupData[`member${memberNum}Branch`] = '';
          groupData[`member${memberNum}Email`] = '';
        }
      }

      return groupData;
    });

    res.json({
      success: true,
      data: formattedGroups,
      total: formattedGroups.length,
      stats: {
        totalSem5Groups: sem5Groups.length,
        registeredForSem6: sem5Groups.length - nonRegisteredGroups.length,
        notRegisteredForSem6: nonRegisteredGroups.length
      }
    });

  } catch (error) {
    console.error('Error getting Sem 6 non-registered groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching non-registered groups',
      error: error.message
    });
  }
};

// Get Sem 6 Statistics for Admin Dashboard
const getSem6Statistics = async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    const query = {
      semester: 6
    };

    if (academicYear) {
      query.academicYear = academicYear;
    } else {
      // Default to current academic year
      const currentDate = new Date();
      const currentYearNum = currentDate.getFullYear();
      const isPreMid = currentDate.getMonth() < 6;
      const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
      query.academicYear = `${academicStartYear}-${(academicStartYear + 1).toString().slice(-2)}`;
    }

    // Get Sem 5 groups (potential Sem 6 groups)
    const sem5Query = {
      semester: 5,
      isActive: true,
      academicYear: query.academicYear
    };
    const totalSem5Groups = await Group.countDocuments(sem5Query);

    // Get project statistics
    const totalProjects = await Project.countDocuments({ ...query, projectType: 'minor3' });
    const registeredProjects = await Project.countDocuments({ ...query, projectType: 'minor3', status: 'registered' });
    const activeProjects = await Project.countDocuments({ ...query, projectType: 'minor3', status: 'active' });
    
    // Get continuation vs new projects
    const continuationProjects = await Project.countDocuments({ ...query, projectType: 'minor3', isContinuation: true });
    const newProjects = totalProjects - continuationProjects;

    res.json({
      success: true,
      data: {
        totalSem5Groups,
        totalProjects,
        registeredProjects,
        activeProjects,
        notRegistered: totalSem5Groups - totalProjects,
        continuationProjects,
        newProjects,
        registrationRate: totalSem5Groups > 0 ? ((totalProjects / totalSem5Groups) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error getting Sem 6 statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Sem 6 statistics',
      error: error.message
    });
  }
};

// Get all system configurations
const getSystemConfigurations = async (req, res) => {
  try {
    const { category } = req.query;
    
    let configs;
    if (category) {
      configs = await SystemConfig.getConfigsByCategory(category);
    } else {
      configs = await SystemConfig.find({ isActive: true }).sort({ category: 1, configKey: 1 });
    }

    res.json({
      success: true,
      data: configs,
      total: configs.length
    });
  } catch (error) {
    console.error('Error getting system configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system configurations',
      error: error.message
    });
  }
};

// Get specific system configuration
const getSystemConfig = async (req, res) => {
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
      data: config
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

// Update system configuration
const updateSystemConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description, force } = req.body;
    
    const config = await SystemConfig.findOne({ configKey: key });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Special validation for faculty preference limit
    if (key === 'sem5.facultyPreferenceLimit') {
      const oldValue = config.configValue;
      const newValue = value;
      
      // If reducing the limit, check for existing registrations
      if (newValue < oldValue && !force) {
        // Check if any projects have more preferences than the new limit
        const projectsWithMorePrefs = await Project.find({
          semester: 5,
          projectType: 'minor2',
          'facultyPreferences': { $exists: true }
        }).select('facultyPreferences title student');
        
        const affectedProjects = projectsWithMorePrefs.filter(project => 
          project.facultyPreferences && project.facultyPreferences.length > newValue
        );
        
        if (affectedProjects.length > 0) {
          // Populate student details for affected projects
          await Project.populate(affectedProjects, { 
            path: 'student', 
            select: 'fullName misNumber' 
          });
          
          return res.status(400).json({
            success: false,
            message: 'Cannot reduce faculty preference limit',
            warning: {
              type: 'EXISTING_REGISTRATIONS_AFFECTED',
              oldLimit: oldValue,
              newLimit: newValue,
              affectedCount: affectedProjects.length,
              affectedProjects: affectedProjects.map(p => ({
                projectId: p._id,
                title: p.title,
                studentName: p.student?.fullName,
                currentPreferences: p.facultyPreferences.length
              })),
              suggestion: 'Some groups have already submitted more preferences than the new limit. You can force update, but existing registrations will remain unchanged.'
            }
          });
        }
      }
    }

    // Update config
    const oldValue = config.configValue;
    config.configValue = value;
    if (description) {
      config.description = description;
    }
    config.updatedBy = req.user.id;
    config.updatedAt = Date.now();
    
    await config.save();

    res.json({
      success: true,
      data: config,
      message: 'System configuration updated successfully',
      note: oldValue !== value ? `Changed from ${oldValue} to ${value}` : 'No change in value'
    });
  } catch (error) {
    console.error('Error updating system configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating system configuration',
      error: error.message
    });
  }
};

// Initialize default system configurations
const initializeSystemConfigs = async (req, res) => {
  try {
    const count = await SystemConfig.initializeDefaults();
    
    res.json({
      success: true,
      message: `Initialized ${count} default configurations`,
      count: count
    });
  } catch (error) {
    console.error('Error initializing system configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing system configurations',
      error: error.message
    });
  }
};

// Update Student Semesters (for testing and semester progression)
const updateStudentSemesters = async (req, res) => {
  try {
    const { fromSemester, toSemester, studentIds, degree, validatePrerequisites } = req.body;

    // Validation
    if (!fromSemester || !toSemester) {
      return res.status(400).json({
        success: false,
        message: 'Both fromSemester and toSemester are required'
      });
    }

    if (toSemester < 1 || toSemester > 8) {
      return res.status(400).json({
        success: false,
        message: 'toSemester must be between 1 and 8'
      });
    }

    // Build query
    let query = { semester: fromSemester };
    
    // If specific students are provided
    if (studentIds && studentIds.length > 0) {
      query._id = { $in: studentIds };
    }
    
    // Filter by degree if provided
    if (degree) {
      query.degree = degree;
    }

    // Find students matching criteria
    const students = await Student.find(query)
      .populate('user', 'email')
      .lean();

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found matching the criteria'
      });
    }

    // Validation results
    const validationResults = [];
    const eligibleStudents = [];
    const ineligibleStudents = [];

    // Validate prerequisites if requested
    if (validatePrerequisites) {
      for (const student of students) {
        const validation = {
          studentId: student._id,
          fullName: student.fullName,
          misNumber: student.misNumber,
          email: student.user?.email,
          currentSemester: student.semester,
          eligible: true,
          issues: []
        };

        // For Sem 5 to Sem 6 progression - check if they have a finalized group and project
        if (fromSemester === 5 && toSemester === 6) {
          // Check for Sem 5 group
          const sem5Group = await Group.findOne({
            'members.student': student._id,
            semester: 5,
            status: 'finalized'
          });

          if (!sem5Group) {
            validation.eligible = false;
            validation.issues.push('No finalized Sem 5 group found');
          }

          // Check for Sem 5 project
          const sem5Project = await Project.findOne({
            semester: 5,
            $or: [
              { student: student._id },
              { group: sem5Group?._id }
            ]
          });

          if (!sem5Project) {
            validation.eligible = false;
            validation.issues.push('No Sem 5 project found');
          }

          // Check if faculty is allocated
          if (sem5Group && !sem5Group.allocatedFaculty) {
            validation.eligible = false;
            validation.issues.push('No faculty allocated to Sem 5 group');
          }
        }

        validationResults.push(validation);
        
        if (validation.eligible) {
          eligibleStudents.push(student._id);
        } else {
          ineligibleStudents.push(validation);
        }
      }

      // If validation requested and some are ineligible, return validation results
      if (ineligibleStudents.length > 0) {
        return res.json({
          success: true,
          validated: true,
          totalStudents: students.length,
          eligibleCount: eligibleStudents.length,
          ineligibleCount: ineligibleStudents.length,
          eligibleStudents: eligibleStudents,
          ineligibleStudents: ineligibleStudents,
          message: `${eligibleStudents.length} students eligible for semester update, ${ineligibleStudents.length} ineligible`,
          validationResults: validationResults
        });
      }
    }

    // Update students
    const updateQuery = validatePrerequisites && eligibleStudents.length > 0
      ? { _id: { $in: eligibleStudents } }
      : query;
    
    const updateResult = await Student.updateMany(
      updateQuery,
      { 
        $set: { 
          semester: toSemester,
          updatedAt: new Date()
        } 
      }
    );

    // Get updated students for confirmation
    const updatedStudents = await Student.find({ 
      _id: { $in: validatePrerequisites ? eligibleStudents : students.map(s => s._id) }
    })
      .populate('user', 'email')
      .select('fullName misNumber semester degree')
      .lean();

    res.json({
      success: true,
      message: `Successfully updated ${updateResult.modifiedCount} students from Semester ${fromSemester} to Semester ${toSemester}`,
      data: {
        fromSemester,
        toSemester,
        totalMatched: students.length,
        totalUpdated: updateResult.modifiedCount,
        matchedCount: updateResult.matchedCount,
        validated: validatePrerequisites || false,
        updatedStudents: updatedStudents,
        ineligibleStudents: validatePrerequisites ? ineligibleStudents : []
      }
    });
  } catch (error) {
    console.error('Error updating student semesters:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student semesters',
      error: error.message
    });
  }
};

// Get Students by Semester (helper for the UI)
const getStudentsBySemester = async (req, res) => {
  try {
    const { semester, degree } = req.query;

    let query = {};
    
    if (semester) {
      query.semester = parseInt(semester);
    }
    
    if (degree) {
      query.degree = degree;
    }

    const students = await Student.find(query)
      .populate('user', 'email')
      .select('fullName misNumber semester degree branch collegeEmail contactNumber')
      .sort({ misNumber: 1 })
      .lean();

    // Get group and project info for each student
    const studentsWithInfo = await Promise.all(students.map(async (student) => {
      // Check for current semester group
      const group = await Group.findOne({
        'members.student': student._id,
        semester: student.semester
      }).select('name status allocatedFaculty').populate('allocatedFaculty', 'fullName');

      // Check for current semester project
      const project = await Project.findOne({
        semester: student.semester,
        $or: [
          { student: student._id },
          { group: group?._id }
        ]
      }).select('title status projectType');

      return {
        ...student,
        hasGroup: !!group,
        groupStatus: group?.status,
        hasFaculty: !!group?.allocatedFaculty,
        facultyName: group?.allocatedFaculty?.fullName,
        hasProject: !!project,
        projectTitle: project?.title,
        projectStatus: project?.status
      };
    }));

    res.json({
      success: true,
      data: studentsWithInfo,
      count: studentsWithInfo.length,
      filters: { semester, degree }
    });
  } catch (error) {
    console.error('Error getting students by semester:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
};

module.exports = {
  getAdminProfile,
  updateAdminProfile,
  getDashboardData,
  getUsers,
  getStudents,
  getFaculty,
  getProjects,
  getGroups,
  getSystemStats,
  getAllocations,
  getUnallocatedGroups,
  forceAllocateFaculty,
  updateProjectStatus,
  // Sem 5 specific functions
  getAllocationStatistics,
  getSem5MinorProject2Registrations,
  getSem5AllocatedFaculty,
  getSem5NonRegisteredStudents,
  getSem5Groups,
  // Sem 6 specific functions
  getSem6MajorProjectRegistrations,
  getSem6NonRegisteredGroups,
  getSem6Statistics,
  getSem5Statistics,
  // Sem 4 specific functions
  getSem4MinorProject1Registrations,
  getUnregisteredSem4Students,
  // System Configuration functions
  getSystemConfigurations,
  getSystemConfig,
  updateSystemConfig,
  initializeSystemConfigs,
  // Semester Management functions
  updateStudentSemesters,
  getStudentsBySemester
};
