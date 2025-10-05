import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/common/Layout';

const ProjectDetails = () => {
  const { user, roleData } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock project data
  const projectData = {
    title: "SPMS2 - Student Project Management System",
    description: "A comprehensive project management system for students and faculty",
    academicYear: "2025-26",
    semester: 5,
    status: "active",
    faculty: {
      name: "Dr. John Smith",
      email: "john.smith@iiitp.ac.in",
      department: "Computer Science"
    },
    group: {
      name: "Group 2",
      members: [
        { name: "John Doe", misNumber: "2021CSE001", role: "leader" },
        { name: "Jane Smith", misNumber: "2021CSE002", role: "member" },
        { name: "Bob Johnson", misNumber: "2021CSE003", role: "member" },
        { name: "Alice Brown", misNumber: "2021CSE004", role: "member" }
      ]
    }
  };

  // Mock messages for demo
  useEffect(() => {
    const mockMessages = [
      {
        id: 1,
        sender: 'faculty',
        senderName: 'Dr. John Smith',
        message: 'Welcome to the project! Let\'s discuss the initial requirements and timeline.',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        isFaculty: true
      },
      {
        id: 2,
        sender: 'student',
        senderName: 'John Doe',
        message: 'Thank you, Dr. Smith. We\'re excited to work on this project.',
        timestamp: new Date(Date.now() - 82800000), // 23 hours ago
        isFaculty: false
      },
      {
        id: 3,
        sender: 'student',
        senderName: 'Jane Smith',
        message: 'When should we schedule our first meeting?',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        isFaculty: false
      },
      {
        id: 4,
        sender: 'faculty',
        senderName: 'Dr. John Smith',
        message: 'Let\'s meet tomorrow at 2 PM in my office. Bring your initial ideas.',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        isFaculty: true
      }
    ];
    setMessages(mockMessages);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsLoading(true);
    
    // Simulate sending message
    const message = {
      id: Date.now(),
      sender: roleData === 'faculty' ? 'faculty' : 'student',
      senderName: user?.fullName || 'Unknown',
      message: newMessage,
      timestamp: new Date(),
      isFaculty: roleData === 'faculty'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setIsLoading(false);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
                <p className="text-gray-600 mt-1">{projectData.title}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Academic Year</p>
                <p className="font-semibold text-gray-900">{projectData.academicYear}</p>
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
                    {roleData === 'student' ? 'Chat with Faculty' : 'Chat with Group'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {roleData === 'student' 
                      ? `Communicate with ${projectData.faculty.name}`
                      : `Communicate with ${projectData.group.name}`
                    }
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isFaculty ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isFaculty
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center mb-1">
                          <span className="text-xs font-medium opacity-75">
                            {message.senderName}
                          </span>
                          <span className="text-xs opacity-50 ml-2">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4">
                  <form onSubmit={handleSendMessage} className="flex space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !newMessage.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Sending...' : 'Send'}
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
                    <p className="text-gray-900">{projectData.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900 text-sm">{projectData.description}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                    <p className="text-gray-900">{projectData.academicYear}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {projectData.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Faculty Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Supervisor</h2>
                
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{projectData.faculty.name}</p>
                    <p className="text-sm text-gray-500">{projectData.faculty.department}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="text-gray-900">{projectData.faculty.email}</span>
                  </div>
                </div>
              </div>

              {/* Group Members */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Members</h2>
                
                <div className="space-y-3">
                  {projectData.group.members.map((member, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">
                          {member.misNumber} • {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                
                <div className="space-y-3">
                  <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Review Progress
                    </div>
                  </button>
                  
                  <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule Meeting
                    </div>
                  </button>
                  
                  <button className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Share Documents
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProjectDetails;
