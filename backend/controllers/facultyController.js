const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const Project = require('../models/Project');
const Group = require('../models/Group');
const FacultyPreference = require('../models/FacultyPreference');

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
    const query = { allocatedFaculty: faculty._id, isActive: true };
    
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

    // Record faculty response
    await request.recordFacultyResponse(faculty._id, 'rejected', comments);

    res.json({
      success: true,
      message: 'Allocation request rejected successfully'
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

// Sem 5 specific: Get group allocation requests
const getGroupAllocationRequests = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { status = 'pending' } = req.query;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Find groups that have this faculty in their preferences
    const groups = await Group.find({
      'facultyPreferences.faculty': faculty._id,
      status: 'complete',
      isActive: true
    })
    .populate('members.student', 'fullName misNumber collegeEmail semester degree branch')
    .populate('leader', 'fullName misNumber collegeEmail')
    .sort({ createdAt: -1 });

    // Filter by allocation status
    let filteredGroups = groups;
    if (status === 'pending') {
      filteredGroups = groups.filter(group => !group.allocatedFaculty);
    } else if (status === 'allocated') {
      filteredGroups = groups.filter(group => group.allocatedFaculty);
    }

    res.json({
      success: true,
      data: filteredGroups.map(group => group.getGroupSummary()),
      message: `Found ${filteredGroups.length} group allocation requests`
    });
  } catch (error) {
    console.error('Error getting group allocation requests:', error);
    res.status(500).json({ success: false, message: 'Error getting allocation requests', error: error.message });
  }
};

// Sem 5 specific: Accept group allocation
const acceptGroupAllocation = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { groupId } = req.params;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if faculty is in group preferences
    const preference = group.facultyPreferences.find(p => p.faculty.toString() === faculty._id.toString());
    if (!preference) {
      return res.status(400).json({ success: false, message: 'Faculty is not in group preferences' });
    }

    // Check if group is already allocated
    if (group.allocatedFaculty) {
      return res.status(400).json({ success: false, message: 'Group is already allocated to another faculty' });
    }

    // Allocate group to faculty
    group.allocatedFaculty = faculty._id;
    group.status = 'locked';
    await group.save();

    res.json({
      success: true,
      data: group.getGroupSummary(),
      message: 'Group allocation accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting group allocation:', error);
    res.status(500).json({ success: false, message: 'Error accepting allocation', error: error.message });
  }
};

// Sem 5 specific: Reject group allocation
const rejectGroupAllocation = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { groupId } = req.params;
    const { reason = 'Not available' } = req.body;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if faculty is in group preferences
    const preference = group.facultyPreferences.find(p => p.faculty.toString() === faculty._id.toString());
    if (!preference) {
      return res.status(400).json({ success: false, message: 'Faculty is not in group preferences' });
    }

    // Remove faculty from preferences
    group.facultyPreferences = group.facultyPreferences.filter(p => p.faculty.toString() !== faculty._id.toString());
    await group.save();

    res.json({
      success: true,
      message: 'Group allocation rejected successfully',
      reason
    });
  } catch (error) {
    console.error('Error rejecting group allocation:', error);
    res.status(500).json({ success: false, message: 'Error rejecting allocation', error: error.message });
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
  updateProject,
  evaluateProject,
  // Sem 5 specific functions
  getGroupAllocationRequests,
  acceptGroupAllocation,
  rejectGroupAllocation
};