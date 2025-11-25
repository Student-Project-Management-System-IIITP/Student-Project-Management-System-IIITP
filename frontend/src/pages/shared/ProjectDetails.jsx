import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { projectAPI, studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import { io } from 'socket.io-client';

// Component to display images with authentication
const ImageWithAuth = ({ src, alt, className }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(src, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
        }
      } catch (error) {
        console.error('Error loading image:', error);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src]);

  if (loading) {
    return <div className={`${className} flex items-center justify-center bg-gray-200 animate-pulse`}>
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>;
  }

  if (!imageSrc) {
    return <div className={`${className} flex items-center justify-center bg-gray-200 text-gray-500`}>
      Failed to load image
    </div>;
  }

  return <img src={imageSrc} alt={alt} className={className} />;
};

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, userRole, roleData, token } = useAuth();
  const socketRef = useRef(null);
  const chatContainerRef = useRef(null);
  
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userType, setUserType] = useState('');
  const [actualProjectId, setActualProjectId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  
  // New features state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showMessageEmojiPicker, setShowMessageEmojiPicker] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  
  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  
  // File preview state
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const [meetingSummary, setMeetingSummary] = useState('');
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Media panel state
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // Editable project/group details
  const [isEditingProjectTitle, setIsEditingProjectTitle] = useState(false);
  const [projectTitleInput, setProjectTitleInput] = useState('');
  const [isSavingProjectTitle, setIsSavingProjectTitle] = useState(false);

  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [isSavingGroupName, setIsSavingGroupName] = useState(false);

  // Scroll to bottom of messages
  const scrollToBottom = (behavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  // Load all media attachments for this project's chat (one shot, not paginated)
  const handleToggleMediaPanel = async () => {
    const next = !showMediaPanel;
    setShowMediaPanel(next);

    if (next && actualProjectId && mediaItems.length === 0 && !isLoadingMedia) {
      setIsLoadingMedia(true);
      try {
        const response = await projectAPI.getProjectMedia(actualProjectId);
        const items = response?.data || [];
        setMediaItems(items);
      } catch (error) {
        console.error('Error loading media:', error);
        toast.error('Failed to load media');
      } finally {
        setIsLoadingMedia(false);
      }
    }
  };

  // Sync editable fields when project changes
  useEffect(() => {
    if (project) {
      setProjectTitleInput(project.title || '');
      if (project.group) {
        setGroupNameInput(project.group.name || '');
      }
    }
  }, [project]);

  const handleSaveProjectTitle = async () => {
    if (userRole !== 'student' || !actualProjectId) return;
    const trimmed = (projectTitleInput || '').trim();
    if (!trimmed) {
      toast.error('Project title cannot be empty');
      return;
    }
    setIsSavingProjectTitle(true);
    try {
      const response = await studentAPI.updateProject(actualProjectId, { title: trimmed });
      const updated = response?.data || {};
      setProject((prev) => (prev ? { ...prev, title: updated.title || trimmed } : prev));
      toast.success(response?.message || 'Project title updated');
      setIsEditingProjectTitle(false);
    } catch (error) {
      console.error('Error updating project title:', error);
      toast.error(error.message || 'Failed to update project title');
    } finally {
      setIsSavingProjectTitle(false);
    }
  };

  const handleSaveGroupName = async () => {
    if (userRole !== 'student' || !project?.group?._id) return;
    const trimmed = (groupNameInput || '').trim();
    if (!trimmed) {
      toast.error('Group name cannot be empty');
      return;
    }
    setIsSavingGroupName(true);
    try {
      const response = await studentAPI.updateGroupName(project.group._id, trimmed);
      const updatedGroup = response?.data || {};
      setProject((prev) => (prev ? {
        ...prev,
        group: {
          ...prev.group,
          name: updatedGroup.name || trimmed,
        },
      } : prev));
      toast.success(response?.message || 'Group name updated');
      setIsEditingGroupName(false);
    } catch (error) {
      console.error('Error updating group name:', error);
      toast.error(error.message || 'Failed to update group name');
    } finally {
      setIsSavingGroupName(false);
    }
  };

  // Load project details
  useEffect(() => {
    const loadProjectDetails = async () => {
      let projectData = null; // Declare outside try block so it's accessible in catch
      
      try {
        setIsLoading(true);
        
        // If projectId is provided in URL, use it
        if (projectId) {
          const response = await projectAPI.getProjectDetails(projectId);
          
          if (!response || !response.data) {
            toast.error('Invalid server response');
            navigate('/dashboard');
            return;
          }
          
          projectData = response.data.project;
          setUserType(response.data.userType);
          setActualProjectId(projectId);
        } 
        // Otherwise, fetch current project based on role
        else if (userRole === 'student') {
          const response = await projectAPI.getStudentCurrentProject();
          
          if (!response) {
            toast.error('Invalid server response');
            navigate('/dashboard');
            return;
          }
          
          if (!response.hasProject) {
            if (response.hasPendingProject) {
              toast('Waiting for faculty allocation. Project details will be available once a faculty is assigned.', {
                icon: '⏳',
                duration: 4000
              });
            } else {
              toast.error('You do not have an active project');
            }
            navigate('/dashboard');
            return;
          }
          
          projectData = response.data;
          setUserType('student');
          setActualProjectId(projectData._id);
        } 
        else if (userRole === 'faculty') {
          // For faculty without projectId, fetch allocated projects and show selector
          const response = await projectAPI.getFacultyAllocatedProjects();
          
          if (!response.data || response.data.length === 0) {
            toast.error('You do not have any allocated projects');
            navigate('/dashboard');
            return;
          }
          
          // If only one project, load it directly
          if (response.data.length === 1) {
            projectData = response.data[0];
            setUserType('faculty');
            setActualProjectId(projectData._id);
          } else {
            // Multiple projects - need to select one
            // For now, redirect to dashboard
            toast('You have multiple allocated projects. Please select one from your dashboard.', {
              icon: 'ℹ️',
              duration: 4000
            });
            navigate('/dashboard');
            return;
          }
        }
        
        // Only set project if we have valid project data
        if (projectData) {
        setProject(projectData);
          // No need to show notification - UI already displays pending status banner
        } else {
          // If no project data, show appropriate message
          toast.error('Project data not available');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error loading project details:', error);
        
        // Check if we already have project data (partial success)
        if (projectData) {
          // Project loaded but there was an error (maybe socket connection, etc.)
          // Don't show error, just set the project silently
          // UI will show the pending status banner if faculty is not allocated
          setProject(projectData);
        } else {
          // Actual error loading project
        if (error.response?.status === 403) {
          toast.error('You do not have access to this project');
          navigate('/dashboard');
        } else if (error.response?.status === 404) {
          toast.error('Project not found');
          navigate('/dashboard');
        } else {
            // More specific error message
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
            toast.error(`Unable to load project: ${errorMessage}`);
            console.error('Full error details:', error);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectDetails();
  }, [projectId, userRole, navigate]);

  // Setup Socket.IO for real-time chat
  useEffect(() => {
    if (!actualProjectId || !token) return;

    // Connect to Socket.IO
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected for project chat');
      // Join project room
      socket.emit('join_project_room', actualProjectId);
    });

    socket.on('joined_project_room', (data) => {
      console.log('✅ Joined project room:', data.projectId);
    });

    // Listen for new messages
    socket.on('new_message', (data) => {
      console.log('📨 New message received:', data);
      if (data.projectId === actualProjectId) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
    });

    // Listen for typing indicators
    socket.on('user_typing', (data) => {
      if (data.userId !== user?.id) {
        setTypingUser(data.userName);
        setIsTyping(data.isTyping);
        
        if (data.isTyping) {
          // Clear typing indicator after 3 seconds
          setTimeout(() => {
            setIsTyping(false);
            setTypingUser(null);
          }, 3000);
        }
      }
    });

    // Listen for message updates (editing)
    socket.on('message_updated', (data) => {
      if (data.projectId === actualProjectId) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId ? data.update : msg
        ));
      }
    });

    // Listen for message deletions
    socket.on('message_deleted', (data) => {
      if (data.projectId === actualProjectId) {
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      }
    });

    // Listen for reaction updates
    socket.on('reaction_updated', (data) => {
      if (data.projectId === actualProjectId) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg
        ));
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.emit('leave_project_room', actualProjectId);
        socket.disconnect();
      }
    };
  }, [actualProjectId, token, user]);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!actualProjectId) return;
      try {
        const PAGE_SIZE = 30;
        const response = await projectAPI.getProjectMessages(actualProjectId, PAGE_SIZE);
        const payload = response?.data || {};
        const initialMessages = payload.messages || [];
        setMessages(initialMessages);
        setHasMoreMessages(!!payload.hasMore);
        setTimeout(() => scrollToBottom('auto'), 100);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    if (actualProjectId && project) {
      loadMessages();
    }
  }, [actualProjectId, project]);

  const handleLoadOlderMessages = async () => {
    if (!actualProjectId || !hasMoreMessages || isLoadingMore || messages.length === 0) return;
    setIsLoadingMore(true);
    try {
      const PAGE_SIZE = 30;
      const oldestMessage = messages[0];
      const before = oldestMessage.createdAt;
      const response = await projectAPI.getProjectMessages(actualProjectId, PAGE_SIZE, before);
      const payload = response?.data || {};
      const olderMessages = payload.messages || [];
      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
      }
      setHasMoreMessages(!!payload.hasMore);
    } catch (error) {
      console.error('Error loading older messages:', error);
      toast.error('Failed to load older messages');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Emit typing event
    if (socketRef.current && e.target.value.length > 0) {
      socketRef.current.emit('typing', {
        projectId: actualProjectId,
        isTyping: true
      });
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    // Block file selection for previous semester projects
    // Check if this is a previous semester project
    const currentStudentSemester = isStudent && roleData ? (roleData.semester || user?.semester) : null;
    const isPrevSemProject = isStudent && currentStudentSemester && project?.semester && 
                             project.semester < currentStudentSemester;
    
    if (isPrevSemProject) {
      e.preventDefault();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.error('File upload is not allowed for previous semester projects');
      return;
    }
    
    const files = Array.from(e.target.files);
    
    // Validate file count (max 3)
    if (files.length > 3) {
      toast.error('Maximum 3 files allowed per message');
      return;
    }
    
    // Validate file size (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setSelectedFiles(files);
  };

  // Remove selected file
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // Must have message or files
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    setIsSending(true);
    
    try {
      let response;
      
      // Use different API based on whether files are attached
      if (selectedFiles.length > 0) {
        response = await projectAPI.sendMessageWithFiles(actualProjectId, newMessage, selectedFiles);
      } else {
        response = await projectAPI.sendMessage(actualProjectId, newMessage);
      }
      
      // Note: Socket.IO will broadcast to others, but we add locally for instant feedback
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      setSelectedFiles([]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear typing indicator
      if (socketRef.current) {
        socketRef.current.emit('typing', {
          projectId: actualProjectId,
          isTyping: false
        });
      }
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Edit message
  const handleEditMessage = async (messageId) => {
    if (!editingText.trim()) return;

    try {
      const response = await projectAPI.editMessage(actualProjectId, messageId, editingText);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? response.data : msg
      ));
      setEditingMessageId(null);
      setEditingText('');
      toast.success('Message edited');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error(error.response?.data?.message || 'Failed to edit message');
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      await projectAPI.deleteMessage(actualProjectId, messageId);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Start editing
  const startEditing = (message) => {
    setEditingMessageId(message._id);
    setEditingText(message.message);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  // Add emoji to message input
  const addEmojiToMessage = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowMessageEmojiPicker(false);
  };

  // Copy message to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Message copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy message');
    });
    setShowMessageMenu(null);
  };

  // Add reaction
  const handleAddReaction = async (messageId, emoji) => {
    try {
      const response = await projectAPI.addReaction(actualProjectId, messageId, emoji);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? response.data : msg
      ));
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
      if (error.response?.status !== 400) {
        toast.error('Failed to add reaction');
      }
    }
  };

  // Remove reaction
  const handleRemoveReaction = async (messageId, emoji) => {
    try {
      const response = await projectAPI.removeReaction(actualProjectId, messageId, emoji);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? response.data : msg
      ));
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast.error('Failed to remove reaction');
    }
  };

  // Search messages
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await projectAPI.searchMessages(actualProjectId, query);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching messages:', error);
      toast.error('Failed to search messages');
    } finally {
      setIsSearching(false);
    }
  };

  // Check if message can be edited (within 5 minutes)
  const canEditMessage = (message) => {
    const currentUserId = user?.id || user?._id;
    const messageSenderId = message.sender?._id || message.sender;
    const isOwn = currentUserId && messageSenderId && 
                  (messageSenderId === currentUserId || messageSenderId.toString() === currentUserId.toString());
    
    if (!isOwn) return false;

    const messageTime = new Date(message.createdAt);
    const now = new Date();
    const diffMinutes = (now - messageTime) / 1000 / 60;
    
    return diffMinutes <= 5;
  };

  // Check if message can be deleted (within 5 minutes)
  const canDeleteMessage = (message) => {
    const currentUserId = user?.id || user?._id;
    const messageSenderId = message.sender?._id || message.sender;
    const isOwn = currentUserId && messageSenderId && 
                  (messageSenderId === currentUserId || messageSenderId.toString() === currentUserId.toString());
    
    if (!isOwn) return false;

    const messageTime = new Date(message.createdAt);
    const now = new Date();
    const diffMinutes = (now - messageTime) / 1000 / 60;
    
    return diffMinutes <= 5;
  };

  // Format timestamp
  const formatTimestamp = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + 
             messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
             messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for date separator
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const formatMeetingDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return [];
    
    const grouped = [];
    let currentDate = null;
    
    messages.forEach((message, index) => {
      const messageDate = new Date(message.createdAt).toDateString();
      
      // Add date separator if this is the first message or date has changed
      if (currentDate !== messageDate) {
        currentDate = messageDate;
        grouped.push({
          _id: `date-${message._id}`,
          type: 'date',
          date: message.createdAt
        });
      }
      
      // Add the actual message
      grouped.push(message);
    });
    
    return grouped;
  };

  // Get grouped messages
  const groupedMessages = groupMessagesByDate(messages);
  
  // Get file icon based on type
  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '🗜️';
    if (mimeType.includes('text')) return '📄';
    return '📎';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Check if file can be previewed
  const canPreviewFile = (mimeType) => {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  };

  // Preview file
  const handlePreviewFile = async (attachment) => {
    try {
      const token = localStorage.getItem('token');
      const url = projectAPI.getFileUrl(actualProjectId, attachment.filename);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load file');
      }
      
      const blob = await response.blob();
      const previewUrl = window.URL.createObjectURL(blob);
      
      setPreviewFile({
        url: previewUrl,
        name: attachment.originalName,
        type: attachment.mimeType
      });
      setShowPreview(true);
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Failed to preview file');
    }
  };

  // Close preview
  const closePreview = () => {
    if (previewFile?.url) {
      window.URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
    setShowPreview(false);
  };

  const openMeetingModal = () => {
    if (project?.nextMeeting?.scheduledAt) {
      const dateObj = new Date(project.nextMeeting.scheduledAt);
      setMeetingDate(dateObj.toISOString().slice(0, 10));
      setMeetingTime(dateObj.toISOString().slice(11, 16));
      setMeetingLocation(project.nextMeeting.location || '');
      setMeetingNotes(project.nextMeeting.notes || '');
    } else {
      setMeetingDate('');
      setMeetingTime('');
      setMeetingLocation('');
      setMeetingNotes('');
    }
    setShowMeetingModal(true);
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!meetingDate || !meetingTime) {
      toast.error('Please select date and time');
      return;
    }
    if (!actualProjectId) return;
    setIsScheduling(true);
    try {
      const scheduledAt = new Date(`${meetingDate}T${meetingTime}:00`);
      const response = await projectAPI.scheduleMeeting(actualProjectId, {
        scheduledAt,
        location: meetingLocation,
        notes: meetingNotes
      });
      setProject(prev => prev ? { ...prev, nextMeeting: response.data } : prev);
      toast.success('Meeting scheduled');
      setShowMeetingModal(false);
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast.error(error.message || 'Failed to schedule meeting');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSaveMeetingNotes = async () => {
    if (!actualProjectId || !project?.nextMeeting) return;
    if (!meetingSummary.trim()) {
      toast.error('Please write some notes before saving');
      return;
    }

    setIsSavingSummary(true);
    try {
      const response = await projectAPI.completeMeeting(actualProjectId, {
        notes: meetingSummary
      });
      const payload = response?.data || {};
      setProject(prev => prev ? {
        ...prev,
        nextMeeting: payload.nextMeeting || null,
        meetingHistory: payload.meetingHistory || prev.meetingHistory || []
      } : prev);
      setMeetingSummary('');
      toast.success('Meeting notes saved to history');
    } catch (error) {
      console.error('Error saving meeting notes:', error);
      const message = error.response?.data?.message || error.message || 'Failed to save meeting notes';
      toast.error(message);
    } finally {
      setIsSavingSummary(false);
    }
  };

  // Download file with authentication
  const handleDownloadFile = async (filename, originalName) => {
    try {
      const token = localStorage.getItem('token');
      const url = projectAPI.getFileUrl(actualProjectId, filename);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  // Download deliverable with authentication
  const handleDownloadDeliverable = async (filename, originalName) => {
    try {
      const token = localStorage.getItem('token');
      const url = projectAPI.getDeliverableUrl(actualProjectId, filename);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download deliverable');
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading deliverable:', error);
      toast.error('Failed to download deliverable');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading project details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Project Not Found</h2>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isFaculty = userType === 'faculty';
  const isStudent = userType === 'student';

  const isProjectOwnerStudent =
    isStudent && project.student && roleData && project.student._id === roleData._id;

  const canEditGroupName =
    isStudent && project.group && roleData && project.group.leader && project.group.leader === roleData._id;

  // Check if this is a previous semester project (for students)
  const currentStudentSemester = isStudent && roleData ? (roleData.semester || user?.semester) : null;
  const isPreviousSemesterProject = isStudent && currentStudentSemester && project?.semester && 
                                    project.semester < currentStudentSemester;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
                    <p className="text-gray-600 mt-1">{project.title}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Academic Year</p>
                <p className="font-semibold text-gray-900">{project.academicYear}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                  project.status === 'faculty_allocated' ? 'bg-green-100 text-green-800' :
                  project.status === 'registered' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status === 'faculty_allocated' ? 'Active' : 
                   project.status === 'registered' ? 'Pending Allocation' : 
                   project.status}
                </span>
              </div>
            </div>
          </div>

          {/* Faculty Allocation Pending Banner */}
          {!project.faculty && project.status === 'registered' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Faculty Allocation Pending</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Your project has been registered successfully. Faculty allocation is in progress. Once a faculty member is assigned, you'll be able to communicate with them through the chat feature.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Previous Semester Project Notice */}
          {isPreviousSemesterProject && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Previous Semester Project</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>This project is from Semester {project.semester}. Chat functionality is disabled for previous semester projects. You can view project details and history, but cannot send new messages.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="border-b border-gray-200 p-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {isFaculty ? 'Chat with Group' : 'Chat with Supervisor'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {isPreviousSemesterProject 
                        ? 'Chat disabled for previous semester projects'
                        : isFaculty 
                          ? `Communicate with ${project.group?.name || 'your group'}`
                          : project.faculty 
                            ? `Communicate with ${project.faculty.fullName}`
                            : 'Chat will be available once faculty is allocated'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Search Button */}
                    <button
                      onClick={() => setShowSearch(!showSearch)}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Search messages"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                    {/* Media Button */}
                    <button
                      onClick={handleToggleMediaPanel}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Media gallery"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 15l4-4 4 4 4-4 4 4" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h.01" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                {showSearch && (
                  <div className="border-b border-gray-200 p-3 bg-gray-50">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleSearch(e.target.value);
                        }}
                        placeholder="Search messages..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {searchQuery && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {isSearching && (
                      <p className="text-xs text-gray-500 mt-2">Searching...</p>
                    )}
                    {searchQuery && searchResults.length > 0 && (
                      <p className="text-xs text-gray-600 mt-2">{searchResults.length} result(s) found</p>
                    )}
                  </div>
                )}

                {/* Media Panel */}
                {showMediaPanel && (
                  <div className="border-b border-gray-200 p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Media, Docs &amp; Files</p>
                        {isPreviousSemesterProject && (
                          <p className="text-xs text-gray-500 mt-0.5">Read-only: Files from previous semester</p>
                        )}
                      </div>
                      {isLoadingMedia && (
                        <span className="text-xs text-gray-500">Loading...</span>
                      )}
                    </div>
                    {mediaItems.length === 0 && !isLoadingMedia ? (
                      <p className="text-xs text-gray-500">No media shared yet.</p>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {mediaItems.map((item) => (
                          <div
                            key={`${item.messageId}-${item.filename}-${item.uploadedAt}`}
                            className="flex-shrink-0 w-40 bg-white border border-gray-200 rounded-lg p-2"
                          >
                            <div className="mb-1">
                              {item.mimeType?.startsWith('image/') ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePreviewFile({
                                      filename: item.filename,
                                      originalName: item.originalName,
                                      mimeType: item.mimeType,
                                    })
                                  }
                                  className="block w-full overflow-hidden rounded-md bg-gray-100"
                                >
                                  <ImageWithAuth
                                    src={projectAPI.getFileUrl(actualProjectId, item.filename)}
                                    alt={item.originalName}
                                    className="w-full h-24 object-cover"
                                  />
                                </button>
                              ) : (
                                <div className="flex items-center justify-center w-full h-24 rounded-md bg-gray-50 border border-dashed border-gray-200">
                                  <span className="text-3xl">
                                    {getFileIcon(item.mimeType || '')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {item.originalName}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {formatFileSize(item.fileSize || 0)}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(item.filename, item.originalName)}
                              className="mt-1 w-full inline-flex justify-center items-center px-2 py-0.5 text-[11px] font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {hasMoreMessages && groupedMessages.length > 0 && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleLoadOlderMessages}
                        disabled={isLoadingMore}
                        className="px-3 py-1 text-xs rounded-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingMore ? 'Loading...' : 'Load earlier messages'}
                      </button>
                    </div>
                  )}

                  {groupedMessages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    groupedMessages.map((message) => {
                      // Skip if this is a date separator (handled below)
                      if (message.type === 'date') {
                        return (
                          <div key={message._id} className="flex items-center my-4">
                            <div className="flex-1 border-t border-gray-200"></div>
                            <div className="px-3 text-sm text-gray-500 font-medium">
                              {formatDate(message.date)}
                            </div>
                            <div className="flex-1 border-t border-gray-200"></div>
                          </div>
                        );
                      }
                      
                      // Check if message is from current user
                      const currentUserId = user?.id || user?._id;
                      const messageSenderId = message.sender?._id || message.sender;
                      const isOwnMessage = currentUserId && messageSenderId && 
                                          (messageSenderId === currentUserId || messageSenderId.toString() === currentUserId.toString());
                      const canEdit = canEditMessage(message);
                      const canDelete = canDeleteMessage(message);
                      const isEditing = editingMessageId === message._id;
                      
                      return (
                        <div
                          key={message._id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                        >
                          <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'ml-12' : 'mr-12'}`}>
                            {/* Message Bubble */}
                            <div
                              className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                                isOwnMessage
                                  ? 'bg-indigo-600 text-white rounded-br-md'
                                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                              }`}
                            >
                              {/* Sender Name & Time */}
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-medium ${isOwnMessage ? 'text-indigo-100' : 'text-gray-600'}`}>
                                  {message.senderName}
                                </span>
                                <span className={`text-xs ${isOwnMessage ? 'text-indigo-200' : 'text-gray-400'} ml-2`}>
                                  {formatTime(message.createdAt)}
                                </span>
                              </div>

                              {/* Message Content or Edit Form */}
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    rows="2"
                                    autoFocus
                                  />
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleEditMessage(message._id)}
                                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {message.message && (
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                                  )}
                                  
                                  {/* File Attachments */}
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {message.attachments.map((attachment, idx) => (
                                        <div key={idx}>
                                          {/* Image Preview */}
                                          {attachment.mimeType.startsWith('image/') ? (
                                            <div className="space-y-1">
                                              <div
                                                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity overflow-hidden bg-gray-100"
                                                onClick={() => handlePreviewFile(attachment)}
                                              >
                                                <ImageWithAuth
                                                  src={projectAPI.getFileUrl(actualProjectId, attachment.filename)}
                                                  alt={attachment.originalName}
                                                  className="w-full h-auto rounded-lg"
                                                />
                                              </div>
                                              <p className={`text-xs ${isOwnMessage ? 'text-indigo-100' : 'text-gray-500'}`}>
                                                {attachment.originalName} • {formatFileSize(attachment.fileSize)}
                                              </p>
                                            </div>
                                          ) : (
                                            /* File Card for non-images */
                                            <div className={`flex items-center gap-2 p-2 rounded border ${
                                              isOwnMessage 
                                                ? 'bg-indigo-500 border-indigo-400' 
                                                : 'bg-gray-50 border-gray-300'
                                            }`}>
                                              <span className="text-2xl">{getFileIcon(attachment.mimeType)}</span>
                                              <div className="flex-1 min-w-0 text-left">
                                                <p className={`text-xs font-medium truncate ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                                                  {attachment.originalName}
                                                </p>
                                                <p className={`text-xs ${isOwnMessage ? 'text-indigo-100' : 'text-gray-500'}`}>
                                                  {formatFileSize(attachment.fileSize)}
                                                </p>
                                              </div>
                                              <div className="flex gap-1">
                                                {/* Preview button for PDFs */}
                                                {canPreviewFile(attachment.mimeType) && (
                                                  <button
                                                    onClick={() => handlePreviewFile(attachment)}
                                                    className={`p-1 rounded hover:bg-opacity-20 hover:bg-white transition-colors ${isOwnMessage ? 'text-white' : 'text-gray-600'}`}
                                                    title="Preview"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                  </button>
                                                )}
                                                {/* Download button */}
                                                <button
                                                  onClick={() => handleDownloadFile(attachment.filename, attachment.originalName)}
                                                  className={`p-1 rounded hover:bg-opacity-20 hover:bg-white transition-colors ${isOwnMessage ? 'text-white' : 'text-gray-600'}`}
                                                  title="Download"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {message.isEdited && (
                                    <span className={`text-xs italic ${isOwnMessage ? 'text-indigo-200' : 'text-gray-400'} mt-1 block`}>
                                      (edited)
                                    </span>
                                  )}
                                </>
                              )}

                              {/* Reactions Display */}
                              {message.reactions && message.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {Object.entries(
                                    message.reactions.reduce((acc, r) => {
                                      acc[r.emoji] = acc[r.emoji] || [];
                                      acc[r.emoji].push(r);
                                      return acc;
                                    }, {})
                                  ).map(([emoji, reactions]) => {
                                    const userReacted = reactions.some(r => 
                                      (r.user._id || r.user) === currentUserId || 
                                      (r.user._id || r.user).toString() === currentUserId.toString()
                                    );
                                    return (
                                      <button
                                        key={emoji}
                                        onClick={() => userReacted ? handleRemoveReaction(message._id, emoji) : handleAddReaction(message._id, emoji)}
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                          userReacted
                                            ? 'bg-indigo-100 border-2 border-indigo-500'
                                            : 'bg-gray-100 border border-gray-300 hover:bg-gray-200'
                                        }`}
                                        title={reactions.map(r => r.userName).join(', ')}
                                      >
                                        <span>{emoji}</span>
                                        <span className="ml-1 text-gray-700">{reactions.length}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Message Actions (shown on hover) */}
                            {!isEditing && (
                              <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                {/* Message Menu Button */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowMessageMenu(showMessageMenu === message._id ? null : message._id);
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                    title="Message options"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Message Menu Dropdown */}
                                  {showMessageMenu === message._id && (
                                    <div
                                      className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'} bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 w-40`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex flex-col">
                                        <button
                                          onClick={() => { copyToClipboard(message.message); setShowMessageMenu(null); }}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                          Copy
                                        </button>
                                        {canEdit && (
                                          <button
                                            onClick={() => { startEditing(message); setShowMessageMenu(null); }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                            Edit
                                          </button>
                                        )}
                                        {canDelete && (
                                          <button
                                            onClick={() => { handleDeleteMessage(message._id); setShowMessageMenu(null); }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {/* Emoji Reaction Button - Positioned based on message alignment */}
                                <div className={`relative ${isOwnMessage ? 'order-first' : 'order-last'}`}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowEmojiPicker(showEmojiPicker === message._id ? null : message._id);
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                    title="Add reaction"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Emoji Picker - Position based on message alignment */}
                                  {showEmojiPicker === message._id && (
                                    <div 
                                      className={`absolute ${
                                        isOwnMessage ? 'right-0' : 'left-0'
                                      } bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 z-10`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex gap-0.5">
                                        {['👍', '❤️', '😊', '😂', '🎉', '🔥', '👏', '✅', '💯', '🚀'].map(emoji => (
                                          <button
                                            key={emoji}
                                            onClick={() => handleAddReaction(message._id, emoji)}
                                            className="text-base hover:bg-gray-100 rounded p-1 transition-colors w-7 h-7 flex items-center justify-center"
                                            title={emoji}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Edit Button (only for own messages within 5 min) */}
                                {canEdit && (
                                  <button
                                    onClick={() => startEditing(message)}
                                    className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Edit message (within 5 min)"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4">
                  {/* Previous Semester Project Message */}
                  {isPreviousSemesterProject && (
                    <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600 text-center">
                        <strong>🔒 Chat Disabled:</strong> This project is from a previous semester. Chat functionality is not available for viewing historical projects.
                      </p>
                    </div>
                  )}
                  
                  {/* Faculty Not Allocated Message */}
                  {!isPreviousSemesterProject && !project.faculty && project.status === 'registered' && !isFaculty && (
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Chat will be enabled once a faculty supervisor is allocated to your project.
                      </p>
                    </div>
                  )}
                  
                  {/* Typing Indicator */}
                  {isTyping && typingUser && (
                    <div className="mb-2 text-xs text-gray-500 italic">
                      {typingUser} is typing...
                    </div>
                  )}
                  
                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm">
                          <span>{getFileIcon(file.type)}</span>
                          <span className="text-gray-700 max-w-[150px] truncate">{file.name}</span>
                          <span className="text-gray-500 text-xs">({formatFileSize(file.size)})</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 ml-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <form onSubmit={(e) => {
                    if (isPreviousSemesterProject) {
                      e.preventDefault();
                      return;
                    }
                    handleSendMessage(e);
                  }} className="flex items-end space-x-2">
                    {/* File Upload Button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.rar,.7z,.js,.html,.css,.json,.py,.java,.c,.cpp,.h,.mp4,.mov,.avi"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Attach files (max 3 files, 10MB each)"
                      disabled={isSending || isPreviousSemesterProject || (!project.faculty && project.status === 'registered' && !isFaculty)}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    

                    <div className="relative flex-1">
                      {/* Message Input */}
                      <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder={
                          isPreviousSemesterProject
                            ? 'Chat disabled for previous semester projects'
                            : !project.faculty && project.status === 'registered' && !isFaculty
                            ? 'Waiting for faculty allocation...'
                            : 'Type your message...'
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={isSending || isPreviousSemesterProject || (!project.faculty && project.status === 'registered' && !isFaculty)}
                      />
                      
                      {/* Emoji Picker Button */}
                      <button
                        type="button"
                        onClick={() => setShowMessageEmojiPicker(!showMessageEmojiPicker)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-indigo-600 p-1 disabled:text-gray-300"
                        title="Add emoji"
                        disabled={isSending || isPreviousSemesterProject || (!project.faculty && project.status === 'registered' && !isFaculty)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      
                      {/* Emoji Picker */}
                      {showMessageEmojiPicker && (
                        <div className="absolute right-0 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 z-10">
                          <div className="flex flex-wrap gap-1 w-48 max-h-40 overflow-y-auto">
                            {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => addEmojiToMessage(emoji)}
                                className="text-xl hover:bg-gray-100 rounded p-1 transition-colors w-7 h-7 flex items-center justify-center"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    
                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={isSending || isPreviousSemesterProject || (!newMessage.trim() && selectedFiles.length === 0) || (!project.faculty && project.status === 'registered' && !isFaculty)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSending ? 'Sending...' : 'Send'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Project Information Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
                    {isStudent && isProjectOwnerStudent ? (
                      isEditingProjectTitle ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={projectTitleInput}
                            onChange={(e) => setProjectTitleInput(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSaveProjectTitle}
                              disabled={isSavingProjectTitle}
                              className="px-3 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {isSavingProjectTitle ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingProjectTitle(false);
                                setProjectTitleInput(project.title || '');
                              }}
                              className="px-3 py-1 text-xs font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-gray-900 break-words">{project.title}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingProjectTitle(true);
                              setProjectTitleInput(project.title || '');
                            }}
                            className="text-gray-400 hover:text-indigo-600"
                            title="Edit project title"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l9.536-9.536a1.5 1.5 0 00-2.121-2.121L6 17.879V20z" />
                            </svg>
                          </button>
                        </div>
                      )
                    ) : (
                      <p className="text-gray-900">{project.title}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                    <p className="text-gray-900 capitalize">{project.projectType?.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <p className="text-gray-900">Semester {project.semester}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                    <p className="text-gray-900">{project.academicYear}</p>
                  </div>
                </div>
              </div>

              {/* Faculty Information */}
              {project.faculty && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Supervisor</h2>
                  
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{project.faculty.fullName || roleData?.fullName || 'Faculty'}</p>
                      <p className="text-sm text-gray-500">{project.faculty.department || roleData?.department || ''}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {(project.faculty.email || project.faculty.user?.email) && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="text-gray-900">
                          {project.faculty.email || project.faculty.user?.email}
                        </span>
                      </div>
                    )}
                    {project.faculty.designation && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Designation:</span>
                        <span className="text-gray-900">{project.faculty.designation}</span>
                      </div>
                    )}
                    {project.faculty.mode && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mode:</span>
                        <span className="text-gray-900">{project.faculty.mode}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Next Meeting */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <div className="flex items-center mb-4">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a1 1 0 011-1h6a1 1 0 011 1v2m-9 0h10M5 11h14v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 leading-tight">Next Meeting</h2>
                    {!isFaculty && (
                      <p className="text-xs text-gray-500">Details of your next discussion with supervisor.</p>
                    )}
                  </div>
                </div>

                {project.nextMeeting ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Scheduled for</span>
                      <span className="font-medium text-gray-900 text-right">
                        {formatMeetingDateTime(project.nextMeeting.scheduledAt)}
                      </span>
                    </div>
                    {project.nextMeeting.location && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Location</span>
                        <span className="text-gray-900 text-right">{project.nextMeeting.location}</span>
                      </div>
                    )}
                    {project.nextMeeting.notes && (
                      <div>
                        <p className="text-gray-500">Notes</p>
                        <p className="text-gray-900 whitespace-pre-wrap break-words text-sm mt-1">{project.nextMeeting.notes}</p>
                      </div>
                    )}
                    {!isFaculty && (
                      <p className="text-xs text-gray-400 mt-1">If you need to change this timing, contact your supervisor.</p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    {isFaculty ? (
                      <p>No meeting scheduled yet. Use the button below to plan the next discussion.</p>
                    ) : (
                      <p>Your supervisor has not scheduled the next meeting yet. Once it is planned, date and time will appear here.</p>
                    )}
                  </div>
                )}

                {/* Post-meeting notes for faculty when meeting time is over */}
                {isFaculty && project.nextMeeting && project.nextMeeting.scheduledAt &&
                  new Date(project.nextMeeting.scheduledAt) < new Date() && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Add meeting notes</p>
                    <textarea
                      value={meetingSummary}
                      onChange={(e) => setMeetingSummary(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      rows="3"
                      placeholder="Summary of discussion, key points, action items..."
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSaveMeetingNotes}
                        disabled={isSavingSummary || !meetingSummary.trim()}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {isSavingSummary ? 'Saving...' : 'Save notes to history'}
                      </button>
                    </div>
                  </div>
                )}

                {isFaculty && (
                  <button
                    onClick={openMeetingModal}
                    className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {project.nextMeeting ? 'Reschedule Meeting' : 'Schedule Meeting'}
                  </button>
                )}
              </div>

              {/* Group Members */}
              {project.group && project.group.members && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Group Members</h2>
                    {project.group.name && (
                      isStudent && canEditGroupName ? (
                        isEditingGroupName ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={groupNameInput}
                              onChange={(e) => setGroupNameInput(e.target.value)}
                              className="w-40 border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={handleSaveGroupName}
                              disabled={isSavingGroupName}
                              className="px-2 py-1 text-[11px] font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {isSavingGroupName ? 'Saving' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingGroupName(false);
                                setGroupNameInput(project.group.name || '');
                              }}
                              className="px-2 py-1 text-[11px] font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingGroupName(true);
                              setGroupNameInput(project.group.name || '');
                            }}
                            className="flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-600"
                            title="Edit group name"
                          >
                            <span className="truncate max-w-[120px]">Group: {project.group.name}</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l9.536-9.536a1.5 1.5 0 00-2.121-2.121L6 17.879V20z" />
                            </svg>
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-gray-600">
                          Group: <span className="font-medium">{project.group.name}</span>
                        </span>
                      )
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {project.group.members
                      .filter(member => member.isActive)
                      .map((member, index) => (
                        <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900">{member.student?.fullName}</p>
                              {member.role === 'leader' && (
                                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">Leader</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {member.student?.misNumber} • {member.student?.branch}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meeting History */}
      {project?.meetingHistory && project.meetingHistory.length > 0 && (
        <div className="mt-8 px-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Meeting History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {project.meetingHistory
              .slice()
              .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))
              .map((meeting) => (
                <div key={meeting._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatMeetingDateTime(meeting.scheduledAt)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {meeting.location || 'No location specified'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>

                  {(meeting.agenda || meeting.notes) && <div className="border-t border-gray-200 my-3"></div>}

                  {meeting.agenda && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Agenda</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{meeting.agenda}</p>
                    </div>
                  )}
                  {meeting.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes & Action Items</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{meeting.notes}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Deliverables Section */}
      {project && (
        <div className="mt-8 px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Project Deliverables</h2>
            {isPreviousSemesterProject && (
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                🔒 Read-only (Previous Semester)
              </span>
            )}
          </div>
          {isPreviousSemesterProject && (
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> File uploads are disabled for previous semester projects. You can view and download existing deliverables, but cannot upload new files.
              </p>
            </div>
          )}
          {(() => {
            const isGroupProject = project.group && project.group.members && project.group.members.length > 1;
            const requiredDeliverables = isGroupProject
              ? [
                  { key: 'mid', label: 'Mid-Sem Presentation (PDF/PPT)' },
                  { key: 'end', label: 'End-Sem Presentation (PDF/PPT)' },
                  { key: 'report', label: 'Project Report (PDF)' },
                ]
              : [
                  { key: 'end', label: 'End-Sem Presentation (PDF/PPT)' },
                  { key: 'report', label: 'Project Report (PDF)' },
                ];

            const deliverablesByName = (project.deliverables || []).reduce((acc, d) => {
              acc[d.name] = d;
              return acc;
            }, {});

            const nameMap = {
              mid: 'Mid Sem Presentation',
              end: 'End Sem Presentation',
              report: 'Project Report',
            };

            const handleFileUpload = async (deliverableType, event) => {
              // Block file upload for previous semester projects
              if (isPreviousSemesterProject) {
                event.preventDefault();
                if (event.target) {
                  event.target.value = '';
                }
                toast.error('File upload is not allowed for previous semester projects');
                return;
              }

              const file = event.target.files[0];
              if (!file) return;

              const toastId = toast.loading('Uploading file...');
              try {
                await projectAPI.uploadDeliverable(actualProjectId, deliverableType, file);
                const response = await projectAPI.getProjectDetails(actualProjectId);
                setProject(response.data.project);
                toast.success('File uploaded successfully!', { id: toastId });
              } catch (error) {
                console.error('Error uploading file:', error);
                toast.error(error.message || 'Failed to upload file.', { id: toastId });
              }
            };

            const DeliverableIcon = ({ type }) => {
              if (type === 'presentation') {
                return (
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                );
              }
              return (
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              );
            };

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requiredDeliverables.map((d) => {
                  const deliverableName = nameMap[d.key];
                  const existing = deliverablesByName[deliverableName];

                  return (
                    <div key={d.key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col">
                      <div className="flex items-start mb-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mr-4 flex-shrink-0">
                          <DeliverableIcon type={d.icon} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{d.label}</p>
                          <p className="text-xs text-gray-500">{d.icon === 'report' ? 'PDF format' : 'PDF or PPT format'}</p>
                        </div>
                      </div>
                      
                      <div className="mt-auto">
                        {existing ? (
                          <div className="text-sm text-center bg-green-50 p-3 rounded-md border border-green-200">
                            <p className="font-medium text-green-800 truncate">{existing.originalName}</p>
                            <p className="text-xs text-green-600 mb-2">Uploaded on {new Date(existing.submittedAt).toLocaleDateString()}</p>
                            <button
                              onClick={() => handleDownloadDeliverable(existing.filename, existing.originalName)}
                              className="w-full mt-2 inline-flex justify-center items-center px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700"
                            >
                              Download
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-center text-gray-500 italic bg-gray-50 p-3 rounded-md border border-dashed">
                            Not yet uploaded
                          </div>
                        )}

                        {isStudent && (
                          <div className="mt-3">
                            <input
                              type="file"
                              id={`file-upload-${d.key}`}
                              className="hidden"
                              accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                              onChange={(e) => handleFileUpload(d.key, e)}
                              disabled={isPreviousSemesterProject}
                            />
                            {isPreviousSemesterProject ? (
                              <div className="w-full text-center rounded-md px-3 py-1.5 text-sm font-medium border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed">
                                Upload Disabled (Previous Semester)
                              </div>
                            ) : (
                              <label 
                                htmlFor={`file-upload-${d.key}`}
                                className="w-full text-center cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium border border-gray-300 hover:bg-gray-50 text-gray-700"
                              >
                                {existing ? 'Replace File' : 'Upload File'}
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => { if (!isScheduling) setShowMeetingModal(false); }}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {project.nextMeeting ? 'Reschedule Meeting' : 'Schedule Meeting'}
            </h3>
            <form onSubmit={handleScheduleMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Online (Teams/Meet) or room number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows="3"
                  placeholder="Agenda, meeting link, etc."
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { if (!isScheduling) setShowMeetingModal(false); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                  disabled={isScheduling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  disabled={isScheduling}
                >
                  {isScheduling ? 'Saving...' : 'Save Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showPreview && previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={closePreview}>
          <div className="relative max-w-6xl max-h-[90vh] w-full bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{previewFile.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadFile(previewFile.url.split('/').pop(), previewFile.name)}
                  className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-auto max-h-[calc(90vh-80px)] bg-gray-100 flex items-center justify-center p-4">
              {previewFile.type.startsWith('image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : previewFile.type === 'application/pdf' ? (
                <div className="w-full h-[calc(90vh-120px)] bg-white">
                  <iframe
                    src={`${previewFile.url}#toolbar=1&navpanes=1&scrollbar=1`}
                    className="w-full h-full border-0"
                    title={previewFile.name}
                    type="application/pdf"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};




export default ProjectDetails;