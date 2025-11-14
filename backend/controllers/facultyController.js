const Faculty = require('../models/Faculty');
const Student = require('../models/Student');
const Project = require('../models/Project');
const Group = require('../models/Group');
const FacultyPreference = require('../models/FacultyPreference');
const FacultyNotification = require('../models/FacultyNotification');

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

// Get unallocated groups for faculty (all active semesters)
const getUnallocatedGroups = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { semester, academicYear = '2025-26' } = req.query;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // If semester specified, use it; otherwise get all active semesters (4-8)
    const semestersToFetch = semester ? [parseInt(semester)] : [4, 5, 6, 7, 8];
    
    // Get groups currently presented to this faculty across all semesters
    const allPreferences = [];
    for (const sem of semestersToFetch) {
      const preferences = await FacultyPreference.getGroupsForFaculty(
        faculty._id, 
        sem, 
        academicYear
      );
      allPreferences.push(...preferences);
    }

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
      // Handle solo projects (internship1) - no group
      const isSoloProject = pref.project?.projectType === 'internship1' || !pref.group;
      const student = pref.student;
      
      return {
      id: pref._id,
        groupName: isSoloProject 
          ? (student?.fullName ? `${student.fullName}'s Project` : 'Solo Project')
          : (pref.group?.name || 'Unnamed Group'),
      projectTitle: pref.project?.title || 'No Project',
      projectType: pref.project?.projectType || (pref.semester === 7 ? 'major1' : pref.semester === 5 ? 'minor2' : pref.semester === 4 ? 'minor1' : pref.semester === 6 ? 'minor3' : 'unknown'),
        members: isSoloProject 
          ? (student ? [{
              name: student.fullName || 'Unknown',
              misNumber: student.misNumber || 'N/A',
              role: 'leader'
            }] : [])
          : (pref.group?.members?.map(member => ({
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
    const { semester, academicYear = '2025-26' } = req.query;

    const faculty = await Faculty.findOne({ user: facultyId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // If semester specified, use it; otherwise get all active semesters (4-8)
    const semestersToFetch = semester ? [parseInt(semester)] : [4, 5, 6, 7, 8];
    
    // Method 1: Get groups from FacultyPreference records (for Sem 4-5)
    const allPreferences = [];
    for (const sem of semestersToFetch) {
      const preferences = await FacultyPreference.getAllocatedGroupsForFaculty(
        faculty._id, 
        sem, 
        academicYear
      );
      allPreferences.push(...preferences);
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
    const groupQuery = {
      allocatedFaculty: faculty._id,
      isActive: true,
      semester: { $in: semestersToFetch },
      academicYear: academicYear
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
      // Handle solo projects (internship1) - no group
      const isSoloProject = pref.project?.projectType === 'internship1' || !pref.group;
      const student = pref.student;
      
      return {
      id: pref._id,
        groupName: isSoloProject 
          ? (student?.fullName ? `${student.fullName}'s Project` : 'Solo Project')
          : (pref.group?.name || 'Unnamed Group'),
      projectTitle: pref.project?.title || 'No Project',
      projectType: pref.project?.projectType || (pref.semester === 7 ? 'major1' : pref.semester === 5 ? 'minor2' : pref.semester === 4 ? 'minor1' : pref.semester === 6 ? 'minor3' : 'unknown'),
        members: isSoloProject 
          ? (student ? [{
              name: student.fullName || 'Unknown',
              misNumber: student.misNumber || 'N/A',
              role: 'leader'
            }] : [])
          : (pref.group?.members?.map(member => ({
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
      projectType: group.project?.projectType || (group.semester === 7 ? 'major1' : group.semester === 5 ? 'minor2' : group.semester === 4 ? 'minor1' : group.semester === 6 ? 'minor3' : 'unknown'),
      members: group.members?.map(member => ({
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
    // For solo projects (internship1), check the Project's currentFacultyIndex
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

    if (preference.project) {
      const project = await Project.findById(preference.project);
      if (project) {
        // For solo projects (internship1), use the Project's facultyChoose method
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
          // Handle solo projects (internship1) - update student's currentProjects directly
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
    // For solo projects (internship1), check the Project's currentFacultyIndex
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

    // Record the faculty response
    await preference.recordFacultyResponse(faculty._id, 'rejected', comments);

    // Update the Project's currentFacultyIndex first (for solo projects like internship1)
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
  updateFacultyProfile,
  // Notification functions
  getNotifications,
  dismissNotification
};