import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { projectAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import { io } from 'socket.io-client';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, userRole, token } = useAuth();
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userType, setUserType] = useState('');
  const [actualProjectId, setActualProjectId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load project details
  useEffect(() => {
    const loadProjectDetails = async () => {
      try {
        setIsLoading(true);
        
        let projectData;
        
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
        
        setProject(projectData);
      } catch (error) {
        console.error('Error loading project details:', error);
        
        if (error.response?.status === 403) {
          toast.error('You do not have access to this project');
          navigate('/dashboard');
        } else if (error.response?.status === 404) {
          toast.error('Project not found');
          navigate('/dashboard');
        } else {
          toast.error('Failed to load project details');
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
        setTimeout(scrollToBottom, 100);
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
      try {
        const response = await projectAPI.getProjectMessages(actualProjectId);
        setMessages(response.data);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    if (actualProjectId && project) {
      loadMessages();
    }
  }, [actualProjectId, project]);

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

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    
    try {
      const response = await projectAPI.sendMessage(actualProjectId, newMessage);
      // Note: Socket.IO will broadcast to others, but we add locally for instant feedback
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      
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
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="border-b border-gray-200 p-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isFaculty ? 'Chat with Group' : 'Chat with Supervisor'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {isFaculty 
                      ? `Communicate with ${project.group?.name || 'your group'}`
                      : `Communicate with ${project.faculty?.fullName || 'your supervisor'}`
                    }
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = message.sender?._id === user?.id || message.sender === user?.id;
                      const isFacultyMessage = message.senderModel === 'Faculty';
                      
                      return (
                        <div
                          key={message._id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isFacultyMessage
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div className="flex items-center mb-1">
                              <span className="text-xs font-medium opacity-75">
                                {message.senderName}
                              </span>
                              <span className="text-xs opacity-50 ml-2">
                                {new Date(message.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4">
                  {/* Typing Indicator */}
                  {isTyping && typingUser && (
                    <div className="mb-2 text-xs text-gray-500 italic">
                      {typingUser} is typing...
                    </div>
                  )}
                  
                  <form onSubmit={handleSendMessage} className="flex space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleTyping}
                      placeholder="Type your message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={isSending}
                    />
                    <button
                      type="submit"
                      disabled={isSending || !newMessage.trim()}
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
                    <p className="text-gray-900">{project.title}</p>
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
                      <p className="font-semibold text-gray-900">{project.faculty.fullName}</p>
                      <p className="text-sm text-gray-500">{project.faculty.department}</p>
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

              {/* Group Members */}
              {project.group && project.group.members && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Members</h2>
                  
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
    </Layout>
  );
};

export default ProjectDetails;
