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

// Sem 5 specific: Get unallocated groups for faculty
const getUnallocatedGroups = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { semester = 5, academicYear = '2025-26' } = req.query;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }


    // Get groups currently presented to this faculty
    const preferences = await FacultyPreference.getGroupsForFaculty(
      faculty._id, 
      parseInt(semester), 
      academicYear
    );

    // Populate student details for each group
    for (const pref of preferences) {
      if (pref.group) {
        await pref.group.populate('members.student', 'fullName misNumber collegeEmail branch');
      }
    }



    // Format the response
    const groups = preferences.map(pref => ({
      id: pref._id,
      groupName: pref.group?.name || 'Unnamed Group',
      projectTitle: pref.project?.title || 'No Project',
      members: pref.group?.members?.map(member => ({
        name: member.student?.fullName || 'Unknown',
        misNumber: member.student?.misNumber || 'N/A',
        role: member.role || 'member'
      })) || [],
      preferences: pref.preferences?.map(p => p.faculty?.fullName || 'Unknown Faculty') || [],
      currentPreference: pref.currentFacultyIndex + 1,
      semester: pref.semester,
      academicYear: pref.academicYear,
      projectId: pref.project?._id,
      groupId: pref.group?._id
    }));

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

// Sem 5 specific: Get allocated groups for faculty
const getAllocatedGroups = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { semester = 5, academicYear = '2025-26' } = req.query;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Get groups allocated to this faculty
    const preferences = await FacultyPreference.getAllocatedGroupsForFaculty(
      faculty._id, 
      parseInt(semester), 
      academicYear
    );

    // Populate student details for each group
    for (const pref of preferences) {
      if (pref.group) {
        await pref.group.populate('members.student', 'fullName misNumber collegeEmail branch');
      }
    }

    // Format the response
    const groups = preferences.map(pref => ({
      id: pref._id,
      groupName: pref.group?.name || 'Unnamed Group',
      projectTitle: pref.project?.title || 'No Project',
      members: pref.group?.members?.map(member => ({
        name: member.student?.fullName || 'Unknown',
        misNumber: member.student?.misNumber || 'N/A',
        role: member.role || 'member'
      })) || [],
      allocatedDate: pref.allocatedAt,
      semester: pref.semester,
      academicYear: pref.academicYear,
      projectId: pref.project?._id,
      groupId: pref.group?._id
    }));

    res.json({
      success: true,
      data: groups,
      message: `Found ${groups.length} allocated groups`
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
    const currentFaculty = preference.getCurrentFaculty();
    if (!currentFaculty || currentFaculty.faculty.toString() !== faculty._id.toString()) {
      return res.status(400).json({ success: false, message: 'This group is not currently presented to you' });
    }

    // Allocate the group to this faculty
    await preference.allocateFaculty(faculty._id, 'faculty_choice');
    
    // Update the group and project with allocated faculty
    let group = null;
    if (preference.group) {
      group = await Group.findById(preference.group).populate('members.student');
      if (group) {
        group.allocatedFaculty = faculty._id;
        group.status = 'locked';
        await group.save();
      }
    }

    if (preference.project) {
      const project = await Project.findById(preference.project);
      if (project) {
        project.faculty = faculty._id;
        project.status = 'faculty_allocated';
        project.allocatedBy = 'faculty_choice';
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
    const currentFaculty = preference.getCurrentFaculty();
    if (!currentFaculty || currentFaculty.faculty.toString() !== faculty._id.toString()) {
      return res.status(400).json({ success: false, message: 'This group is not currently presented to you' });
    }

    // Record the faculty response
    await preference.recordFacultyResponse(faculty._id, 'rejected', comments);

    // Move to next faculty
    try {
      await preference.moveToNextFaculty();
      
      res.json({
        success: true,
        message: 'Group passed to next faculty preference',
        data: {
          groupId: preference.group,
          projectId: preference.project,
          nextFaculty: preference.getCurrentFaculty(),
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
    const { semester = 5, academicYear = '2025-26' } = req.query;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // Get statistics
    const [unallocatedCount, allocatedCount, totalGroups] = await Promise.all([
      FacultyPreference.countDocuments({
        'preferences.faculty': faculty._id,
        status: 'pending',
        semester: parseInt(semester),
        academicYear: academicYear,
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
        academicYear: academicYear
      }),
      FacultyPreference.countDocuments({
        'preferences.faculty': faculty._id,
        semester: parseInt(semester),
        academicYear: academicYear
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

// Update faculty profile
const updateFacultyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, department, mode, designation } = req.body;
    const faculty = await Faculty.findOne({ user: userId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty profile not found' });
    }
    if (fullName !== undefined) faculty.fullName = fullName;
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
  updateProject,
  evaluateProject,
  // Sem 5 specific functions
  getUnallocatedGroups,
  getAllocatedGroups,
  chooseGroup,
  passGroup,
  getSem5Statistics,
  getFacultyProfile,
  updateFacultyProfile
};