const Project = require('../models/Project');
const Group = require('../models/Group');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Message = require('../models/Message');
const { deliverableUploadDir } = require('../middleware/deliverableUpload');

// Helper to check if project belongs to a student (covers populated and non-populated refs)
// Helper to get a user ID from a populated or unpopulated field
const getUserId = (field) => {
  if (!field) return null;
  return field._id ? field._id.toString() : field.toString();
};

const isProjectOwnedByStudent = (projectStudent, studentId) => {
  if (!projectStudent || !studentId) {
    return false;
  }

  const projectStudentId =
    projectStudent._id?.toString?.() ??
    projectStudent.toString?.() ??
    `${projectStudent}`;

  return projectStudentId === studentId.toString();
};

// Save notes for a completed meeting and move it to history
const completeMeeting = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const project = await Project.findById(projectId).populate('faculty');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (userRole !== 'faculty' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty or admin can add meeting notes'
      });
    }

    let facultyId = null;

    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ user: userId });
      if (!faculty || !project.faculty || project.faculty._id.toString() !== faculty._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not the supervisor for this project'
        });
      }
      facultyId = faculty._id;
    } else if (userRole === 'admin') {
      facultyId = project.faculty?._id || project.faculty;
    }

    if (!project.nextMeeting || !project.nextMeeting.scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'No scheduled meeting to add notes for'
      });
    }

    const now = new Date();

    const historyEntry = {
      scheduledAt: project.nextMeeting.scheduledAt,
      location: project.nextMeeting.location || '',
      agenda: project.nextMeeting.notes || '',
      notes: notes || '',
      createdBy: facultyId,
      createdAt: project.nextMeeting.createdAt || now,
      completedAt: now
    };

    if (!project.meetingHistory) {
      project.meetingHistory = [];
    }
    project.meetingHistory.push(historyEntry);

    // Clear next meeting once it is moved to history
    project.nextMeeting = undefined;

    await project.save();

    res.json({
      success: true,
      data: {
        nextMeeting: project.nextMeeting,
        meetingHistory: project.meetingHistory
      },
      message: 'Meeting notes saved successfully'
    });
  } catch (error) {
    console.error('Error saving meeting notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving meeting notes',
      error: error.message
    });
  }
};

// Get project details with access control
const getProjectDetails = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find the project with all necessary relations
    const project = await Project.findById(projectId)
      .populate({
        path: 'group',
        populate: {
          path: 'members.student',
          select: 'fullName misNumber contactNumber branch user'
        }
      })
      .populate({
        path: 'faculty',
        select: 'fullName email department designation mode user',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .populate('student', 'fullName misNumber');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Access control: Check if user has access to this project
    let hasAccess = false;
    let userType = '';

    if (userRole === 'student') {
      const student = await Student.findOne({ user: userId });
      if (student) {
        if (isProjectOwnedByStudent(project.student, student._id)) {
          hasAccess = true;
          userType = 'student';
        } else if (project.group) {
          const isMember = project.group.members.some(
            (member) =>
              member.student &&
              member.student._id.toString() === student._id.toString()
          );
          hasAccess = isMember;
          if (isMember) {
            userType = 'student';
          }
        }
      }
    } else if (userRole === 'faculty') {
      // Check if faculty is allocated to this project
      const faculty = await Faculty.findOne({ user: userId });
      if (faculty && project.faculty) {
        hasAccess = project.faculty._id.toString() === faculty._id.toString();
        userType = 'faculty';
      }
    } else if (userRole === 'admin') {
      hasAccess = true;
      userType = 'admin';
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    // Get unread message count
    const unreadCount = await Message.getUnreadCount(projectId, userId);

    res.json({
      success: true,
      data: {
        project,
        userType,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project details',
      error: error.message
    });
  }
};

// Get project messages (supports pagination with limit & before cursor)
const getProjectMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify access to project first
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Access control
    let hasAccess = false;

    if (userRole === 'student') {
      const student = await Student.findOne({ user: userId });
      if (student) {
        if (isProjectOwnedByStudent(project.student, student._id)) {
          hasAccess = true;
        } else if (project.group) {
          const group = await Group.findById(project.group);
          const isMember = group.members.some(
            (member) => member.student.toString() === student._id.toString()
          );
          hasAccess = isMember;
        }
      }
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ user: userId });
      if (faculty && project.faculty) {
        hasAccess = project.faculty.toString() === faculty._id.toString();
      }
    } else if (userRole === 'admin') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    // Build query with optional "before" cursor
    const query = { project: projectId };
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    const numericLimit = parseInt(limit, 10) || 50;

    // Get messages ordered from newest to oldest, then reverse for chronological order
    const fetched = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .populate('sender', 'fullName')
      .lean();

    const messages = fetched.slice().reverse();

    // Determine if there are older messages
    let hasMore = false;
    if (messages.length > 0) {
      const oldest = messages[0];
      const olderCount = await Message.countDocuments({
        project: projectId,
        createdAt: { $lt: oldest.createdAt }
      });
      hasMore = olderCount > 0;
    }

    // Mark messages as read for this user
    await Message.updateMany(
      {
        project: projectId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: { readBy: { user: userId } },
        $set: { isRead: true }
      }
    );

    res.json({
      success: true,
      data: {
        messages,
        hasMore
      }
    });
  } catch (error) {
    console.error('Error fetching project messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project messages',
      error: error.message
    });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const files = req.files; // Uploaded files from multer

    // Message or files must be present
    if ((!message || !message.trim()) && (!files || files.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Message or file attachment is required'
      });
    }

    // Verify access to project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Access control and get sender info
    let hasAccess = false;
    let senderModel = '';
    let senderName = '';

    if (userRole === 'student') {
      const student = await Student.findOne({ user: userId }).populate('user', 'fullName');
      if (student) {
        if (isProjectOwnedByStudent(project.student, student._id)) {
          hasAccess = true;
          senderModel = 'Student';
          senderName = student.user?.fullName || student.fullName || 'Unknown Student';
        } else if (project.group) {
          const group = await Group.findById(project.group);
          const isMember = group.members.some(
            (member) => member.student.toString() === student._id.toString()
          );
          hasAccess = isMember;
          if (isMember) {
            senderModel = 'Student';
            senderName = student.user?.fullName || student.fullName || 'Unknown Student';
          }
        }
      }
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ user: userId }).populate('user', 'fullName');
      if (faculty && project.faculty) {
        hasAccess = project.faculty.toString() === faculty._id.toString();
        senderModel = 'Faculty';
        senderName = faculty.user?.fullName || faculty.fullName || 'Unknown Faculty';
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    // Process file attachments
    const attachments = [];
    if (files && files.length > 0) {
      files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          url: `/api/projects/${projectId}/files/${file.filename}`,
          fileType: file.mimetype.split('/')[0], // 'image', 'application', etc.
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        });
      });
    }

    // Create message
    const newMessage = new Message({
      project: projectId,
      sender: userId,
      senderModel,
      senderName,
      message: message ? message.trim() : '',
      attachments: attachments
    });

    await newMessage.save();

    // Populate sender info
    await newMessage.populate('sender', 'fullName');

    // Broadcast message via Socket.IO
    const socketService = req.app.get('socketService');
    if (socketService) {
      await socketService.broadcastNewMessage(projectId, newMessage);
    }

    res.status(201).json({
      success: true,
      data: newMessage,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};

// Get student's current project (for Sem 5)
const getStudentCurrentProject = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await Student.findOne({ user: userId });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Method 1: Check student's currentProjects array
    let project = null;
    let currentProjectRef = student.currentProjects.find(cp => cp.semester === 5);
    
    if (currentProjectRef) {
      project = await Project.findById(currentProjectRef.project)
        .populate({
          path: 'group',
          populate: {
            path: 'members.student',
            select: 'fullName misNumber contactNumber branch user'
          }
        })
        .populate({
          path: 'faculty',
          select: 'fullName email department designation mode user',
          populate: {
            path: 'user',
            select: 'email'
          }
        });
    }

    // Method 2: If not in currentProjects, search by group membership
    if (!project) {
      // Find groups where this student is a member
      const Group = require('../models/Group');
      const groups = await Group.find({
        'members.student': student._id,
        'members.isActive': true,
        semester: 5
      });

      // Find project associated with these groups
      if (groups.length > 0) {
        for (const group of groups) {
          if (group.project) {
            project = await Project.findById(group.project)
              .populate({
                path: 'group',
                populate: {
                  path: 'members.student',
                  select: 'fullName misNumber contactNumber branch user'
                }
              })
              .populate({
                path: 'faculty',
                select: 'fullName email department designation mode user',
                populate: {
                  path: 'user',
                  select: 'email'
                }
              });
            
            if (project) {
              break;
            }
          }
        }
      }
    }

    // No project found at all
    if (!project) {
      return res.json({
        success: true,
        message: 'No active project found for current semester',
        hasProject: false,
        hasPendingProject: false,
        data: null
      });
    }

    // Only return project if faculty is allocated
    if (!project.faculty) {
      return res.json({
        success: true,
        message: 'Project found but faculty not yet allocated',
        hasProject: false,
        hasPendingProject: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: project,
      hasProject: true
    });
  } catch (error) {
    console.error('Error fetching student current project:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching current project',
      error: error.message
    });
  }
};

// Get faculty's allocated projects
const getFacultyAllocatedProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const faculty = await Faculty.findOne({ user: userId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const projects = await Project.find({ 
      faculty: faculty._id,
      status: 'faculty_allocated'
    })
      .populate({
        path: 'group',
        populate: {
          path: 'members.student',
          select: 'fullName misNumber contactNumber branch'
        }
      })
      .populate('student', 'fullName misNumber')
      .populate({
        path: 'faculty',
        select: 'fullName email department designation mode user',
        populate: {
          path: 'user',
          select: 'email'
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Error fetching faculty projects:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching allocated projects',
      error: error.message
    });
  }
};

// Edit a message
const editMessage = async (req, res) => {
  try {
    const { projectId, messageId } = req.params;
    const { message: newMessage } = req.body;
    const userId = req.user.id;

    if (!newMessage || !newMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify message belongs to this project
    if (message.project.toString() !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this project'
      });
    }

    // Edit the message (will throw error if not allowed)
    try {
      await message.editMessage(newMessage.trim(), userId);
      await message.populate('sender', 'fullName');

      // Broadcast update via Socket.IO
      const socketService = req.app.get('socketService');
      if (socketService) {
        await socketService.broadcastMessageUpdate(projectId, messageId, message);
      }

      res.json({
        success: true,
        data: message,
        message: 'Message edited successfully'
      });
    } catch (editError) {
      return res.status(403).json({
        success: false,
        message: editError.message
      });
    }
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: 'Error editing message',
      error: error.message
    });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const { projectId, messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify message belongs to this project
    if (message.project.toString() !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this project'
      });
    }

    // Only sender or admin can delete
    const senderId = getUserId(message.sender);
    if (!senderId || (senderId.toString() !== userId.toString() && userRole !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    // Check if message can be deleted (5 minute window for non-admins)
    if (userRole !== 'admin' && !message.canDelete(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Messages can only be deleted within 5 minutes of sending'
      });
    }

    await Message.findByIdAndDelete(messageId);

    // Broadcast deletion via Socket.IO
    const socketService = req.app.get('socketService');
    if (socketService) {
      await socketService.broadcastMessageDelete(projectId, messageId);
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
};

// Search messages
const searchMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { q: searchQuery } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!searchQuery || !searchQuery.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Verify access to project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Access control
    let hasAccess = false;

    if (userRole === 'student') {
      const student = await Student.findOne({ user: userId });
      if (student) {
        if (isProjectOwnedByStudent(project.student, student._id)) {
          hasAccess = true;
        } else if (project.group) {
          const group = await Group.findById(project.group);
          const isMember = group.members.some(
            (member) => member.student.toString() === student._id.toString()
          );
          hasAccess = isMember;
        }
      }
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ user: userId });
      if (faculty && project.faculty) {
        hasAccess = project.faculty.toString() === faculty._id.toString();
      }
    } else if (userRole === 'admin') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    // Search messages
    const messages = await Message.searchMessages(projectId, searchQuery.trim());

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching messages',
      error: error.message
    });
  }
};

// Add reaction to message
const addReaction = async (req, res) => {
  try {
    const { projectId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify message belongs to this project
    if (message.project.toString() !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this project'
      });
    }

    // Get user name
    let userName = 'Unknown';
    if (userRole === 'student') {
      const student = await Student.findOne({ user: userId });
      userName = student?.fullName || 'Unknown Student';
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ user: userId });
      userName = faculty?.fullName || 'Unknown Faculty';
    }

    // Add reaction
    try {
      await message.addReaction(emoji, userId, userName);
      await message.populate('sender', 'fullName');

      // Broadcast reaction via Socket.IO
      const socketService = req.app.get('socketService');
      if (socketService) {
        await socketService.broadcastReactionUpdate(projectId, messageId, message.reactions);
      }

      res.json({
        success: true,
        data: message,
        message: 'Reaction added successfully'
      });
    } catch (reactionError) {
      return res.status(400).json({
        success: false,
        message: reactionError.message
      });
    }
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reaction',
      error: error.message
    });
  }
};

// Remove reaction from message
const removeReaction = async (req, res) => {
  try {
    const { projectId, messageId, emoji } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify message belongs to this project
    if (message.project.toString() !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this project'
      });
    }

    // Remove reaction
    try {
      await message.removeReaction(emoji, userId);
      await message.populate('sender', 'fullName');

      // Broadcast reaction update via Socket.IO
      const socketService = req.app.get('socketService');
      if (socketService) {
        await socketService.broadcastReactionUpdate(projectId, messageId, message.reactions);
      }

      res.json({
        success: true,
        data: message,
        message: 'Reaction removed successfully'
      });
    } catch (reactionError) {
      return res.status(400).json({
        success: false,
        message: reactionError.message
      });
    }
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing reaction',
      error: error.message
    });
  }
};

// Download/serve chat file
const downloadChatFile = async (req, res) => {
  try {
    const { projectId, filename } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify access to project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Access control
    let hasAccess = false;

    if (userRole === 'student') {
      const student = await Student.findOne({ user: userId });
      if (student) {
        if (isProjectOwnedByStudent(project.student, student._id)) {
          hasAccess = true;
        } else if (project.group) {
          const group = await Group.findById(project.group);
          const isMember = group.members.some(
            (member) => member.student.toString() === student._id.toString()
          );
          hasAccess = isMember;
        }
      }
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ user: userId });
      if (faculty && project.faculty) {
        hasAccess = project.faculty.toString() === faculty._id.toString();
      }
    } else if (userRole === 'admin') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    // Serve the file
    const path = require('path');
    const { chatUploadDir } = require('../middleware/chatUpload');
    const filePath = path.join(chatUploadDir, filename);

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
};

// Schedule a meeting for a project
const scheduleMeeting = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { scheduledAt, location, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date and time is required'
      });
    }

    const project = await Project.findById(projectId).populate('faculty');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (userRole !== 'faculty' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty or admin can schedule meetings'
      });
    }

    let facultyId = null;

    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ user: userId });
      if (!faculty || !project.faculty || project.faculty._id.toString() !== faculty._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not the supervisor for this project'
        });
      }
      facultyId = faculty._id;
    } else if (userRole === 'admin') {
      facultyId = project.faculty;
    }

    project.nextMeeting = {
      scheduledAt: new Date(scheduledAt),
      location: location || '',
      notes: notes || '',
      createdBy: facultyId,
      createdAt: new Date()
    };

    await project.save();

    res.json({
      success: true,
      data: project.nextMeeting,
      message: 'Meeting scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling meeting',
      error: error.message
    });
  }
};

// Upload a deliverable for a project
const uploadDeliverable = async (req, res) => {
  try {
    const { projectId, deliverableType } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const file = req.file;

    if (userRole !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can upload deliverables' });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Access control: ensure student is part of the project
    const student = await Student.findOne({ user: userId });
    let hasAccess = false;
    if (student) {
      if (project.group) {
        const group = await Group.findById(project.group);
        hasAccess = group.members.some(member => member.student.toString() === student._id.toString());
      } else if (project.student) {
        hasAccess = project.student.toString() === student._id.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'You do not have access to this project' });
    }

    const nameMap = {
      mid: 'Mid Sem Presentation',
      end: 'End Sem Presentation',
      report: 'Project Report'
    };
    const deliverableName = nameMap[deliverableType];

    if (!deliverableName) {
      return res.status(400).json({ success: false, message: 'Invalid deliverable type' });
    }

    let simpleFileType = 'other';
    if (file.mimetype === 'application/pdf') {
      simpleFileType = 'pdf';
    } else if (file.mimetype.includes('powerpoint') || file.mimetype.includes('presentation')) {
      simpleFileType = 'ppt';
    }

    const newDeliverable = {
      name: deliverableName,
      submitted: true,
      submittedAt: new Date(),
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: simpleFileType,
      uploadedBy: userId
    };

    // Check if deliverable already exists and update it, otherwise add new
    const existingIndex = project.deliverables.findIndex(d => d.name === deliverableName);
    if (existingIndex > -1) {
      project.deliverables[existingIndex] = { ...project.deliverables[existingIndex], ...newDeliverable };
    } else {
      project.deliverables.push(newDeliverable);
    }

    await project.save();

    res.json({ success: true, message: 'Deliverable uploaded successfully', data: project.deliverables });

  } catch (error) {
    console.error('Error uploading deliverable:', error);
    res.status(500).json({ success: false, message: 'Error uploading deliverable', error: error.message });
  }
};

// Download a deliverable file
const downloadDeliverable = async (req, res) => {
  try {
    const { projectId, filename } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Access control (students in project, assigned faculty, admin)
    let hasAccess = false;
    if (userRole === 'admin') {
      hasAccess = true;
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ user: userId });
      if (faculty && project.faculty) {
        hasAccess = project.faculty.toString() === faculty._id.toString();
      }
    } else if (userRole === 'student') {
      const student = await Student.findOne({ user: userId });
       if (student) {
        if (project.group) {
          const group = await Group.findById(project.group);
          hasAccess = group.members.some(member => member.student.toString() === student._id.toString());
        } else if (project.student) {
          hasAccess = project.student.toString() === student._id.toString();
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'You do not have access to this project' });
    }

    const deliverable = project.deliverables.find(d => d.filename === filename);
    if (!deliverable) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const path = require('path');
    const filePath = path.join(deliverableUploadDir, filename);

    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.download(filePath, deliverable.originalName);

  } catch (error) {
    console.error('Error downloading deliverable:', error);
    res.status(500).json({ success: false, message: 'Error downloading deliverable', error: error.message });
  }
};

module.exports = {
  getProjectDetails,
  getProjectMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  searchMessages,
  addReaction,
  removeReaction,
  downloadChatFile,
  getStudentCurrentProject,
  getFacultyAllocatedProjects,
  scheduleMeeting,
  completeMeeting,
  uploadDeliverable,
  downloadDeliverable
};
