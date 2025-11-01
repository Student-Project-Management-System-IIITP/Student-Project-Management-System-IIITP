import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSem5 } from '../../context/Sem5Context';

const FacultyDashboard = () => {
  const { user, roleData, isLoading: authLoading } = useAuth();
  const { allocationStatus, chooseGroup, passGroup, loading } = useSem5();
  const [activeTab, setActiveTab] = useState(() => {
    // Get saved tab from localStorage, default to 'allocated' for new users
    return localStorage.getItem('facultyDashboardTab') || 'allocated';
  });
  const [actionLoading, setActionLoading] = useState({});

  // Show loading screen if authentication is loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading faculty dashboard...</p>
        </div>
      </div>
    );
  }

  // Get data from context
  const unallocatedGroups = allocationStatus?.unallocatedGroups || [];
  const allocatedGroups = allocationStatus?.allocatedGroups || [];
  const statistics = allocationStatus?.statistics || {};
  
  // No debugging code needed
  
  // Helper function to categorize groups by semester and project type
  const categorizeGroups = (groups) => {
    // First, group by semester
    const bySemester = groups.reduce((acc, group) => {
      const semester = group.semester || 'Unknown';
      if (!acc[semester]) {
        acc[semester] = [];
      }
      acc[semester].push(group);
      return acc;
    }, {});
    
    // Then within each semester, group by project type
    const categorized = Object.entries(bySemester).map(([semester, semesterGroups]) => {
      // Group by project type
      const byProjectType = semesterGroups.reduce((acc, group) => {
        // Get project type from the group or project object
        let projectType = 'Unknown';
        
        // Try to determine project type from various properties
        if (group.projectType) {
          projectType = group.projectType;
        } else if (group.project && group.project.projectType) {
          projectType = group.project.projectType;
        } else if (group.semester === 4) {
          // For Semester 4, it's typically Minor Project 1
          projectType = 'minor1';
        } else if (group.semester === 5) {
          // For Semester 5, it's typically Minor Project 2
          projectType = 'minor2';
        } else if (group.semester === 6) {
          // For Semester 6, it's typically Minor Project 3
          projectType = 'minor3';
        } else if (group.semester === 7) {
          // For Semester 7, it's typically Major Project 1
          projectType = 'major1';
        } else if (group.semester === 8) {
          // For Semester 8, it's typically Major Project 2
          projectType = 'major2';
        }
        
        // Format project type for display
        let displayName = projectType;
        switch (projectType.toLowerCase()) {
          case 'minor1':
            displayName = 'Minor Project 1';
            break;
          case 'minor2':
            displayName = 'Minor Project 2';
            break;
          case 'minor3':
            displayName = 'Minor Project 3';
            break;
          case 'major1':
            displayName = 'Major Project 1';
            break;
          case 'major2':
            displayName = 'Major Project 2';
            break;
          case 'internship1':
            displayName = 'Internship (2 Month)';
            break;
          case 'internship2':
            displayName = 'Internship (6 Month)';
            break;
          default:
            displayName = projectType || 'Unknown';
        }
        
        if (!acc[projectType]) {
          acc[projectType] = {
            displayName,
            groups: []
          };
        }
        acc[projectType].groups.push(group);
        return acc;
      }, {});
      
      return {
        semester,
        projectTypes: Object.values(byProjectType)
      };
    });
    
    // Sort by semester (numerically)
    return categorized.sort((a, b) => {
      const semA = parseInt(a.semester);
      const semB = parseInt(b.semester);
      return !isNaN(semA) && !isNaN(semB) ? semA - semB : 0;
    });
  };
  
  // Organize groups by semester and project type
  const categorizedUnallocatedGroups = useMemo(() => 
    categorizeGroups(unallocatedGroups), [unallocatedGroups]);
  
  const categorizedAllocatedGroups = useMemo(() => 
    categorizeGroups(allocatedGroups), [allocatedGroups]);

  // Handle tab change and save to localStorage
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('facultyDashboardTab', tab);
  };

  const handleChooseGroup = async (groupId) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to allocate this group to yourself?\n\n' +
      'This action will:\n' +
      '• Assign the group to you for supervision\n' +
      '• Remove the group from other faculty consideration\n' +
      '• Lock the group allocation\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmed) return;

    setActionLoading(prev => ({ ...prev, [`choose-${groupId}`]: true }));
    try {
      await chooseGroup(groupId);
      // The context will automatically refresh the data
    } catch (error) {
      console.error('Error choosing group:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`choose-${groupId}`]: false }));
    }
  };

  const handlePassGroup = async (groupId) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to pass this group to the next faculty?\n\n' +
      'This action will:\n' +
      '• Move the group to the next faculty in the preference list\n' +
      '• Record your decision to pass on this group\n' +
      '• Continue the allocation process\n\n' +
      'If all faculty pass, the group will be sent to admin for manual allocation.'
    );
    
    if (!confirmed) return;

    setActionLoading(prev => ({ ...prev, [`pass-${groupId}`]: true }));
    try {
      await passGroup(groupId);
      // The context will automatically refresh the data
    } catch (error) {
      console.error('Error passing group:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`pass-${groupId}`]: false }));
    }
  };

  const GroupCard = ({ group, isAllocated = false }) => {
    const cardContent = (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{group.groupName}</h3>
          <p className="text-sm text-gray-600 mt-1">{group.projectTitle}</p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Sem {group.semester}
          </span>
          <p className="text-xs text-gray-500 mt-1">{group.academicYear}</p>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Group Members</h4>
        <div className="space-y-1">
          {group.members.map((member, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-900">{member.name}</span>
              <span className="text-gray-500">{member.misNumber} • {member.role}</span>
            </div>
          ))}
        </div>
      </div>

      {!isAllocated && group.preferences && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Faculty Preferences</h4>
          <div className="flex flex-wrap gap-2">
            {group.preferences.map((faculty, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  index === group.currentPreference - 1
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {faculty}
                {index === group.currentPreference - 1 && ' (Current)'}
              </span>
            ))}
          </div>
        </div>
      )}

      {isAllocated && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Allocated on:</span> {group.allocatedDate}
          </p>
        </div>
      )}

      {!isAllocated && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleChooseGroup(group.id)}
            disabled={actionLoading[`choose-${group.id}`] || actionLoading[`pass-${group.id}`]}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading[`choose-${group.id}`] ? 'Choosing...' : 'Choose Group'}
          </button>
          <button
            onClick={() => handlePassGroup(group.id)}
            disabled={actionLoading[`choose-${group.id}`] || actionLoading[`pass-${group.id}`]}
            className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading[`pass-${group.id}`] ? 'Passing...' : 'Pass Group'}
          </button>
        </div>
      )}
    </div>
    );

    // If allocated, wrap in Link to project details
    if (isAllocated) {
      return (
        <Link to={`/projects/${group.projectId}`} className="block">
          {cardContent}
        </Link>
      );
    }

    // If not allocated, return the card directly
    return cardContent;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Faculty Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome, {roleData?.fullName ? 
            (roleData.fullName.charAt(0).toUpperCase() + roleData.fullName.slice(1)) : 
            user?.fullName ? 
              (user.fullName.charAt(0).toUpperCase() + user.fullName.slice(1)) :
            user?.email?.split('@')[0] ? 
              (user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)) : 
              'Faculty Member'}! Manage your project groups and student allocations
        </p>
      </div>

      {/* Dashboard Overview */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Project Supervision Overview</h2>
              <p className="text-sm text-gray-600 mt-1">
                Review and manage your allocated groups across all semesters
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm bg-blue-50 text-blue-800 px-4 py-2 rounded-md flex items-center">
                <span className="font-semibold">{allocatedGroups.length}</span>
                <span className="mx-2">Allocated Groups</span>
              </div>
              <div className="text-sm bg-orange-50 text-orange-800 px-4 py-2 rounded-md flex items-center">
                <span className="font-semibold">{unallocatedGroups.length}</span>
                <span className="mx-2">Pending Decisions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('allocated')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'allocated'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Allocated Groups
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {allocatedGroups.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('unallocated')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'unallocated'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Unallocated Groups
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {unallocatedGroups.length}
              </span>
            </button>
          </nav>
        </div>
          </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'allocated' && (
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Allocated Groups</h3>
              <p className="text-gray-600 text-sm">
                Groups that have been allocated to you for supervision.
              </p>
            </div>
            
            {allocatedGroups.length > 0 ? (
              <div className="space-y-8">
                {categorizedAllocatedGroups.map((semesterData) => (
                  // Only show semesters that have groups
                  semesterData.projectTypes.length > 0 && (
                    <div key={`semester-${semesterData.semester}`} className="mb-8">
                      <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b border-gray-200 mb-4">
                        Semester {semesterData.semester}
                      </h3>
                      
                      <div className="space-y-8">
                        {semesterData.projectTypes.map((projectType) => (
                          // Only show project types that have groups
                          projectType.groups.length > 0 && (
                            <div key={`${semesterData.semester}-${projectType.displayName}`} className="mb-6">
                              <h4 className="text-lg font-medium text-gray-800 mb-4 pl-4 border-l-4 border-green-500">
                                {projectType.displayName}
                                <span className="ml-2 text-sm text-gray-500">
                                  ({projectType.groups.length} group{projectType.groups.length !== 1 ? 's' : ''})
                                </span>
                              </h4>
                              
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {projectType.groups.map((group) => (
                                  <GroupCard key={group.id} group={group} isAllocated={true} />
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No allocated groups</h3>
                <p className="text-gray-500">You don't have any groups allocated to you yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'unallocated' && (
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Groups Awaiting Your Decision</h3>
              <p className="text-gray-600 text-sm">
                These groups have selected you as their current preference. You can choose to allocate them to yourself or pass them to the next faculty in their preference list.
              </p>
            </div>
            
            {unallocatedGroups.length > 0 ? (
              <div className="space-y-8">
                {categorizedUnallocatedGroups.map((semesterData) => (
                  // Only show semesters that have groups
                  semesterData.projectTypes.length > 0 && (
                    <div key={`semester-${semesterData.semester}`} className="mb-8">
                      <h3 className="text-xl font-semibold text-gray-900 pb-2 border-b border-gray-200 mb-4">
                        Semester {semesterData.semester}
                      </h3>
                      
                      <div className="space-y-8">
                        {semesterData.projectTypes.map((projectType) => (
                          // Only show project types that have groups
                          projectType.groups.length > 0 && (
                            <div key={`${semesterData.semester}-${projectType.displayName}`} className="mb-6">
                              <h4 className="text-lg font-medium text-gray-800 mb-4 pl-4 border-l-4 border-blue-500">
                                {projectType.displayName}
                                <span className="ml-2 text-sm text-gray-500">
                                  ({projectType.groups.length} group{projectType.groups.length !== 1 ? 's' : ''})
                                </span>
                              </h4>
                              
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {projectType.groups.map((group) => (
                                  <GroupCard key={group.id} group={group} />
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No groups awaiting allocation</h3>
                <p className="text-gray-500">There are currently no groups waiting for your decision.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyDashboard;
