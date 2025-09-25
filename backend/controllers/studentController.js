const Student = require('../models/Student');

// Get student dashboard data
const getDashboardData = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get student details
    const student = await Student.findOne({ user: studentId })
      .populate('user', 'name email phone');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get semester-specific features
    const semesterFeatures = getSemesterFeaturesData(student.semester);
    
    // Get student's projects (placeholder for future implementation)
    const projects = [];
    
    // Get student's groups (placeholder for future implementation)
    const groups = [];
    
    // Get student's internships
    const internships = student.internships || [];

    res.json({
      success: true,
      data: {
        student,
        semesterFeatures,
        projects,
        groups,
        internships,
        stats: {
          totalProjects: projects.length,
          totalGroups: groups.length,
          totalInternships: internships.length
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
const getSemesterFeaturesData = (semester) => {
  const features = {
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

  return features[semester] || features[1];
};

// Get student projects (placeholder for future implementation)
const getStudentProjects = async (req, res) => {
  try {
    // This will be implemented when we add the Project model
    res.json({
      success: true,
      data: [],
      message: 'Projects feature coming soon'
    });
  } catch (error) {
    console.error('Error getting student projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student projects',
      error: error.message
    });
  }
};

// Get student groups (placeholder for future implementation)
const getStudentGroups = async (req, res) => {
  try {
    // This will be implemented when we add the Group model
    res.json({
      success: true,
      data: [],
      message: 'Groups feature coming soon'
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
    
    const student = await Student.findOne({ user: studentId });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student.internships || []
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

module.exports = {
  getDashboardData,
  getSemesterFeatures,
  getStudentProjects,
  getStudentGroups,
  getStudentInternships
};
