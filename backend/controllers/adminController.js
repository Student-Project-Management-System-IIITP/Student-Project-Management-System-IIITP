const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const User = require('../models/User');

// Get admin dashboard data
const getDashboardData = async (req, res) => {
  try {
    // Get counts for dashboard
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalFaculty = await Faculty.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments();
    
    // Get recent students
    const recentStudents = await Student.find({ isActive: true })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent faculty
    const recentFaculty = await Faculty.find({ isActive: true })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalFaculty,
          totalUsers
        },
        recentStudents,
        recentFaculty
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

// Get all projects (placeholder for future implementation)
const getProjects = async (req, res) => {
  try {
    // This will be implemented when we add the Project model
    res.json({
      success: true,
      data: [],
      message: 'Projects feature coming soon'
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

// Get all groups (placeholder for future implementation)
const getGroups = async (req, res) => {
  try {
    // This will be implemented when we add the Group model
    res.json({
      success: true,
      data: [],
      message: 'Groups feature coming soon'
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

module.exports = {
  getDashboardData,
  getUsers,
  getStudents,
  getFaculty,
  getProjects,
  getGroups,
  getSystemStats
};
