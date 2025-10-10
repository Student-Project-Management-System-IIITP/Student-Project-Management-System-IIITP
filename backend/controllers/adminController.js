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
    
    if (semester) {
      query.semester = parseInt(semester);
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
      .populate('student', 'fullName misNumber collegeEmail semester degree branch')
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
      group = await Group.findById(allocation.group).populate('members.student');
      if (group) {
        group.allocatedFaculty = facultyId;
        await group.save();
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
        const acYear = `${startYear}-${parseInt(startYear) + 4}`;
        query.academicYear = acYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        const acYear = `${academicStartYear}-${academicStartYear + 4}`;
        query.academicYear = acYear;
      }
    }

    // Get all Sem 5 students
    const students = await Student.find(query)
      .populate('user', 'email')
      .populate('groupId', 'name status allocatedFaculty')
      .sort({ fullName: 1 });

    // Get all Sem 5 projects
    const projects = await Project.find({
      projectType: 'minor2',
      semester: 5,
      ...(query.academicYear && { academicYear: query.academicYear })
    }).select('student');

    // Create a set of students who have registered
    const registeredStudentIds = new Set(projects.map(p => p.student.toString()));

    // Get all groups with allocated faculty for Sem 5
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
        const acYear = `${startYear}-${parseInt(startYear) + 4}`;
        query.academicYear = acYear;
      } else if (currentYear === 'true') {
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const isPreMid = currentDate.getMonth() < 6;
        const academicStartYear = isPreMid ? currentYearNum - 1 : currentYearNum;
        const acYear = `${academicStartYear}-${academicStartYear + 4}`;
        query.academicYear = acYear;
      }
    }

    // Get all groups with populated data
    const groups = await Group.find(query)
      .populate({
        path: 'members.student',
        select: 'fullName misNumber contactNumber branch user',
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
        select: 'title status'
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
        populate: {
          path: 'members.student',
          select: 'fullName misNumber contactNumber branch user',
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

    // Format the response with all group members and faculty preferences
    const formattedRegistrations = projects.map(project => {
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
  getSem5Statistics,
  // Sem 4 specific functions
  getSem4MinorProject1Registrations,
  // System Configuration functions
  getSystemConfigurations,
  getSystemConfig,
  updateSystemConfig,
  initializeSystemConfigs
};
