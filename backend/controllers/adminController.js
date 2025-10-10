const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Project = require('../models/Project');
const Group = require('../models/Group');
const FacultyPreference = require('../models/FacultyPreference');

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
    if (allocation.project) {
      const project = await Project.findById(allocation.project);
      if (project) {
        project.faculty = facultyId;
        project.status = 'faculty_allocated';
        project.allocatedBy = 'admin_allocation';
        await project.save();
      }
    }

    if (allocation.group) {
      const group = await Group.findById(allocation.group);
      if (group) {
        group.allocatedFaculty = facultyId;
        await group.save();
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
  // Sem 4 specific functions
  getSem4MinorProject1Registrations
};
