const Project = require('../models/Project');
const Group = require('../models/Group');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Message = require('../models/Message');

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
        // Allow if student owns the project (solo projects like M.Tech Sem 1)
        if (project.student && project.student._id?.toString?.() === student._id.toString()) {
          hasAccess = true;
          userType = 'student';
        } else if (project.group) {
          // Or if student is in the project group
          const isMember = project.group.members.some(member => 
            member.student && member.student._id.toString() === student._id.toString()
          );
          hasAccess = isMember;
          userType = 'student';
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

// Get project messages
const getProjectMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50 } = req.query;
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
        if (project.student && project.student.toString() === student._id.toString()) {
          hasAccess = true;
        } else if (project.group) {
          const group = await Group.findById(project.group);
          const isMember = group.members.some(member => 
            member.student.toString() === student._id.toString()
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

    // Get messages
    const messages = await Message.find({ project: projectId })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .populate('sender', 'fullName')
      .lean();

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
      data: messages
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
        if (project.student && project.student.toString() === student._id.toString()) {
          hasAccess = true;
          senderModel = 'Student';
          senderName = student.user?.fullName || student.fullName || 'Unknown Student';
        } else if (project.group) {
          const group = await Group.findById(project.group);
          const isMember = group.members.some(member => 
            member.student.toString() === student._id.toString()
          );
          hasAccess = isMember;
          senderModel = 'Student';
          senderName = student.user?.fullName || student.fullName || 'Unknown Student';
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
    if (message.sender.toString() !== userId && userRole !== 'admin') {
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
        if (project.student && project.student.toString() === student._id.toString()) {
          hasAccess = true;
        } else if (project.group) {
          const group = await Group.findById(project.group);
          const isMember = group.members.some(member => 
            member.student.toString() === student._id.toString()
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
        if (project.student && project.student.toString() === student._id.toString()) {
          hasAccess = true;
        } else if (project.group) {
          const group = await Group.findById(project.group);
          const isMember = group.members.some(member => 
            member.student.toString() === student._id.toString()
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
  getFacultyAllocatedProjects
};

