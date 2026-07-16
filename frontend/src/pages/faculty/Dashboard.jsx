import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../../context/AuthContext';
import { useSem5 } from '../../context/Sem5Context';
import { facultyAPI } from '../../utils/api';

// Draggable individual item component
const SortableRankItem = ({ id, group, index, disabled }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white border ${isDragging ? 'border-indigo-500 shadow-md' : 'border-gray-200 shadow-sm'} ${disabled ? 'opacity-80' : 'hover:border-indigo-300 cursor-grab active:cursor-grabbing'} rounded-lg transition-colors`}
    >
      <div
        {...attributes}
        {...listeners}
        className={`flex-shrink-0 p-2 ${disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-indigo-500'}`}
        title={disabled ? "Deadline passed" : "Drag to reorder"}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </div>

      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 flex-shrink-0 text-lg">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{group.groupName}</h4>
          <p className="text-sm text-gray-600 truncate">{group.projectTitle}</p>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center justify-between w-full sm:w-auto">
        <span className="text-xs font-medium text-gray-500 hidden sm:inline-block mr-2">
          Sem {group.semester}
        </span>
        {group.groupRank === index + 1 ? (
          <span className="text-xs font-medium px-2.5 py-1.5 bg-green-100 text-green-800 rounded-full flex items-center gap-1.5 w-full sm:w-auto justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saved
          </span>
        ) : (
          <span className="text-xs font-medium px-2.5 py-1.5 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1.5 w-full sm:w-auto justify-center border border-amber-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Unsaved Change
          </span>
        )}
      </div>
    </div>
  );
};

const FacultyDashboard = () => {
  const { user, roleData, isLoading: authLoading } = useAuth();
  const { allocationStatus, respondToGroup, loading } = useSem5();
  const [activeTab, setActiveTab] = useState(() => {
    // Get saved tab from localStorage, default to 'allocated' for new users
    return localStorage.getItem('facultyDashboardTab') || 'allocated';
  });
  const [actionLoading, setActionLoading] = useState({});
  const [sem3Requests, setSem3Requests] = useState([]);
  const [sem3Loading, setSem3Loading] = useState(true);
  const [sem3ActionLoading, setSem3ActionLoading] = useState({});
  const [sem4Requests, setSem4Requests] = useState([]);
  const [sem4Loading, setSem4Loading] = useState(true);
  const [sem4ActionLoading, setSem4ActionLoading] = useState({});
  const [savingRank, setSavingRank] = useState(false);

  // Define groups early so hooks can access them before the early return
  const unallocatedGroups = allocationStatus?.unallocatedGroups || [];
  const allocatedGroups = allocationStatus?.allocatedGroups || [];
  const statistics = allocationStatus?.statistics || {};

  // Derived state: groups marked 'interested' and not yet allocated (still pending)
  // Dashboard uses context, so we read unallocatedGroups directly
  const interestedGroups = useMemo(() => {
    return (unallocatedGroups || [])
      .filter(g => g.myResponse === 'interested')
      .sort((a, b) => {
        if (a.groupRank !== null && b.groupRank !== null) return a.groupRank - b.groupRank;
        if (a.groupRank !== null) return -1;
        if (b.groupRank !== null) return 1;
        return 0;
      });
  }, [unallocatedGroups]);

  const [localRankings, setLocalRankings] = useState([]);

  // Sync local rankings when interested groups change
  useEffect(() => {
    setLocalRankings(prevRankings => {
      const newIds = interestedGroups.map(g => g.id);
      if (prevRankings.length === newIds.length && prevRankings.every(id => newIds.includes(id))) {
        return prevRankings;
      }
      const existing = prevRankings.filter(id => newIds.includes(id));
      const added = newIds.filter(id => !existing.includes(id));
      return [...existing, ...added];
    });
  }, [interestedGroups.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalRankings((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const saveRankings = async () => {
    try {
      setSavingRank(true);
      await facultyAPI.rankInterestedGroups(localRankings);
      toast.success('Group rankings saved successfully');

      // Update local state by forcing a refresh of the context
      if (typeof allocationStatus?.refresh === 'function') {
        allocationStatus.refresh();
      } else {
        // Fallback if no explicit refresh: just reload the window for simplicity since dashboard uses context wrapper
        window.location.reload();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save rankings');
    } finally {
      setSavingRank(false);
    }
  };

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

  // Get data from context (moved to top of component)

  const loadSem3Requests = async () => {
    try {
      setSem3Loading(true);
      const response = await facultyAPI.getSem3MajorProjectRequests();
      setSem3Requests(response.data || []);
    } catch (error) {
      console.error('Failed to load Sem 3 requests:', error);
      toast.error(error.message || 'Failed to load M.Tech Sem 3 requests');
    } finally {
      setSem3Loading(false);
    }
  };

  const loadSem4Requests = async () => {
    try {
      setSem4Loading(true);
      const response = await facultyAPI.getSem4MajorProjectRequests();
      setSem4Requests(response.data || []);
    } catch (error) {
      console.error('Failed to load Sem 4 requests:', error);
      setSem4Requests([]);
    } finally {
      setSem4Loading(false);
    }
  };

  useEffect(() => {
    loadSem3Requests();
    loadSem4Requests();
  }, []);

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
            displayName = 'Minor Project I';
            break;
          case 'minor2':
            displayName = 'Minor Project II';
            break;
          case 'minor3':
            displayName = 'Minor Project III';
            break;
          case 'major1':
            displayName = 'Major Project I';
            break;
          case 'major2':
            displayName = 'Major Project II';
            break;
          case 'internship1':
            displayName = 'Internship I Project (2 Month)';
            break;
          case 'internship2':
            displayName = 'Internship II Project (2 Month)';
            break;
          default:
            displayName = projectType || 'Unknown';
        }

        // For Major Project 2, create subsections for group and solo
        if (projectType === 'major2') {
          // Use a composite key to separate group and solo
          const subType = group.isMajor2Solo ? 'major2-solo' : 'major2-group';
          const subDisplayName = group.isMajor2Solo ? 'Solo Major Project II' : 'Group Major Project II';

          if (!acc[subType]) {
            acc[subType] = {
              displayName: subDisplayName,
              projectType: 'major2', // Keep original project type for reference
              isSubsection: true, // Mark as subsection
              groups: []
            };
          }
          acc[subType].groups.push(group);
        } else {
          // For other project types, use normal grouping
          if (!acc[projectType]) {
            acc[projectType] = {
              displayName,
              projectType,
              isSubsection: false,
              groups: []
            };
          }
          acc[projectType].groups.push(group);
        }
        return acc;
      }, {});

      // Group Major Project 2 subsections together
      const projectTypesArray = Object.values(byProjectType);
      const major2Subsections = projectTypesArray.filter(pt => pt.projectType === 'major2' && pt.isSubsection);
      const otherProjectTypes = projectTypesArray.filter(pt => pt.projectType !== 'major2' || !pt.isSubsection);

      // If we have Major Project 2 subsections, create a parent section
      if (major2Subsections.length > 0) {
        const major2Parent = {
          displayName: 'Major Project II',
          projectType: 'major2',
          isSubsection: false,
          isParent: true,
          subsections: major2Subsections,
          groups: [] // Parent doesn't have direct groups
        };
        return {
          semester,
          projectTypes: [major2Parent, ...otherProjectTypes]
        };
      }

      return {
        semester,
        projectTypes: projectTypesArray
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

  const handleSem3Choose = async (projectId) => {
    const confirm = window.confirm('Are you sure you want to take this project?');
    if (!confirm) return;
    setSem3ActionLoading(prev => ({ ...prev, [projectId]: 'choose' }));
    try {
      await facultyAPI.chooseSem3MajorProject(projectId);
      toast.success('Project allocated successfully');
      setSem3Requests(prev => prev.filter(request => request._id !== projectId));
    } catch (error) {
      toast.error(error.message || 'Failed to allocate project');
    } finally {
      setSem3ActionLoading(prev => ({ ...prev, [projectId]: null }));
    }
  };

  const handleSem3Pass = async (projectId) => {
    const confirm = window.confirm('Pass this project to the next preference?');
    if (!confirm) return;
    setSem3ActionLoading(prev => ({ ...prev, [projectId]: 'pass' }));
    try {
      await facultyAPI.passSem3MajorProject(projectId);
      toast.success('Project moved to next preference');
      setSem3Requests(prev => prev.filter(request => request._id !== projectId));
    } catch (error) {
      toast.error(error.message || 'Failed to pass project');
    } finally {
      setSem3ActionLoading(prev => ({ ...prev, [projectId]: null }));
    }
  };

  const handleSem4Choose = async (projectId) => {
    try {
      setSem4ActionLoading(prev => ({ ...prev, [projectId]: 'choose' }));
      await facultyAPI.chooseSem4MajorProject(projectId);
      toast.success('Project allocated successfully');
      setSem4Requests(prev => prev.filter(request => request._id !== projectId));
    } catch (error) {
      toast.error(error.message || 'Failed to allocate project');
    } finally {
      setSem4ActionLoading(prev => ({ ...prev, [projectId]: null }));
    }
  };

  const handleSem4Pass = async (projectId) => {
    try {
      setSem4ActionLoading(prev => ({ ...prev, [projectId]: 'pass' }));
      await facultyAPI.passSem4MajorProject(projectId);
      toast.success('Project passed successfully');
      setSem4Requests(prev => prev.filter(request => request._id !== projectId));
    } catch (error) {
      toast.error(error.message || 'Failed to pass project');
    } finally {
      setSem4ActionLoading(prev => ({ ...prev, [projectId]: null }));
    }
  };

  const handleChooseGroup = async (groupId) => {
    // No confirmation needed — marking interested does not allocate immediately.
    // Faculty can change their response before the deadline.
    setActionLoading(prev => ({ ...prev, [`choose-${groupId}`]: true }));
    try {
      await respondToGroup(groupId, 'interested');
      // The context will automatically refresh the data
    } catch (error) {
      console.error('Error responding to group:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`choose-${groupId}`]: false }));
    }
  };

  const handlePassGroup = async (groupId) => {
    // No confirmation needed — marking not interested is reversible
    // before the deadline.
    setActionLoading(prev => ({ ...prev, [`pass-${groupId}`]: true }));
    try {
      await respondToGroup(groupId, 'not_interested');
      // The context will automatically refresh the data
    } catch (error) {
      console.error('Error responding to group:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [`pass-${groupId}`]: false }));
    }
  };

  const GroupCard = ({ group, isAllocated = false }) => {
    const cardContent = (
      <div className={`rounded-lg shadow-md p-6 transition-all ${group.myResponse === 'interested'
        ? 'bg-green-50/30 border-2 border-green-400 shadow-sm'
        : group.myResponse === 'not_interested'
          ? 'bg-red-50/20 border-2 border-red-300 shadow-sm'
          : 'bg-white border border-gray-200 hover:shadow-lg'
        }`}>
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
            {group.members?.filter(m => m.isActive !== false).map((member, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-900">{member.name || member.student?.fullName}</span>
                <span className="text-gray-500">{member.misNumber || member.student?.misNumber} • {member.role}</span>
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
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${index === group.currentPreference - 1
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

        {/* Deadline display for unallocated groups */}
        {!isAllocated && group.allocationDeadline && (() => {
          const deadline = new Date(group.allocationDeadline);
          const now = new Date();
          const hoursLeft = (deadline - now) / (1000 * 60 * 60);
          const isPast = hoursLeft < 0;
          const isUrgent = !isPast && hoursLeft < 24;
          return (
            <div className={`mb-3 flex items-center gap-1.5 text-xs px-2 py-1 rounded ${isPast ? 'bg-red-50 text-red-600' : isUrgent ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-500'
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isPast
                ? 'Response deadline passed'
                : `Respond by ${deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${deadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
            </div>
          );
        })()}

        {/* Action Buttons with deadline awareness */}
        {(() => {
          const isDeadlinePassed = !isAllocated && group.allocationDeadline && new Date(group.allocationDeadline) < new Date();

          if (isAllocated) return null;

          if (isDeadlinePassed) {
            return (
              <div className="space-y-2">
                {group.myResponse && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${group.myResponse === 'interested'
                    ? 'bg-green-100 border border-green-300'
                    : 'bg-red-100 border border-red-300'
                    }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${group.myResponse === 'interested' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                      {group.myResponse === 'interested' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${group.myResponse === 'interested' ? 'text-green-800' : 'text-red-800'
                      }`}>
                      {group.myResponse === 'interested' ? 'You marked Interested' : 'You marked Not Interested'}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border border-gray-300">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Deadline passed — awaiting admin allocation
                  </span>
                </div>
              </div>
            );
          }

          if (group.myResponse) {
            return (
              <div className="space-y-3">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${group.myResponse === 'interested'
                  ? 'bg-green-100 border border-green-300'
                  : 'bg-red-100 border border-red-300'
                  }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${group.myResponse === 'interested'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                    }`}>
                    {group.myResponse === 'interested' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${group.myResponse === 'interested' ? 'text-green-800' : 'text-red-800'}`}>
                      {group.myResponse === 'interested' ? 'You are interested in this group' : 'You declined this group'}
                    </p>
                    <p className={`text-xs mt-0.5 ${group.myResponse === 'interested' ? 'text-green-600' : 'text-red-600'}`}>
                      {group.myResponse === 'interested'
                        ? 'You will be considered during allocation.'
                        : 'This group will not be allocated to you.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => group.myResponse === 'interested'
                    ? handlePassGroup(group.id)
                    : handleChooseGroup(group.id)
                  }
                  disabled={actionLoading[`choose-${group.id}`] || actionLoading[`pass-${group.id}`]}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors border ${group.myResponse === 'interested'
                    ? 'border-red-300 text-red-700 bg-white hover:bg-red-50'
                    : 'border-green-300 text-green-700 bg-white hover:bg-green-50'
                    } disabled:opacity-50`}
                >
                  {(actionLoading[`choose-${group.id}`] || actionLoading[`pass-${group.id}`])
                    ? 'Updating...'
                    : group.myResponse === 'interested'
                      ? 'Change to Not Interested'
                      : 'Change to Interested'}
                </button>
              </div>
            );
          }

          return (
            <div className="flex gap-3">
              <button
                onClick={() => handleChooseGroup(group.id)}
                disabled={actionLoading[`choose-${group.id}`] || actionLoading[`pass-${group.id}`]}
                className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {actionLoading[`choose-${group.id}`] ? 'Processing...' : 'Interested'}
              </button>
              <button
                onClick={() => handlePassGroup(group.id)}
                disabled={actionLoading[`choose-${group.id}`] || actionLoading[`pass-${group.id}`]}
                className="flex-1 bg-white text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium border-2 border-red-300 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {actionLoading[`pass-${group.id}`] ? 'Processing...' : 'Not Interested'}
              </button>
            </div>
          );
        })()}
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

      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold">
                M.Tech Semester 3
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">Major Project Requests</h2>
              <p className="text-gray-600">
                Review solo Major Project 1 submissions and choose or pass based on your availability.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm bg-orange-50 text-orange-800 px-4 py-2 rounded-md flex items-center">
                <span className="font-semibold">{sem3Requests.length}</span>
                <span className="ml-2">Pending</span>
              </div>
              <button
                onClick={loadSem3Requests}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {sem3Loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-3"></div>
              Loading requests...
            </div>
          ) : sem3Requests.length === 0 ? (
            <div className="text-sm text-gray-500 py-6 text-center">
              No pending Sem 3 requests at the moment.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {sem3Requests.map(request => (
                <div
                  key={request._id}
                  className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase text-indigo-600 font-semibold">
                        Priority {request.priority} of {request.totalPreferences}
                      </p>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.title || 'Major Project 1'}
                      </h3>
                      <p className="text-sm text-gray-600">{request.domain || 'Domain not specified'}</p>
                    </div>
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold">{request.student?.fullName || 'Student'}</p>
                      <p className="text-gray-500">{request.student?.misNumber || 'MIS'}</p>
                      <p className="text-gray-500">{request.student?.collegeEmail}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-3">
                    {request.summary || 'No summary provided.'}
                  </p>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                    <p className="text-xs text-gray-500">
                      Submitted on {request.submittedAt ? new Date(request.submittedAt).toLocaleDateString() : '—'}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSem3Choose(request._id)}
                        disabled={sem3ActionLoading[request._id]}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sem3ActionLoading[request._id] === 'choose' ? 'Processing...' : 'Interested'}
                      </button>
                      <button
                        onClick={() => handleSem3Pass(request._id)}
                        disabled={sem3ActionLoading[request._id]}
                        className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sem3ActionLoading[request._id] === 'pass' ? 'Processing...' : 'Not Interested'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm uppercase tracking-wide text-indigo-600 font-semibold">
              M.Tech Semester 4
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">Major Project 2 Requests</h2>
            <p className="text-gray-600">
              Review solo Major Project 2 submissions and choose or pass based on your availability.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm bg-orange-50 text-orange-800 px-4 py-2 rounded-md flex items-center">
              <span className="font-semibold">{sem4Requests.length}</span>
              <span className="ml-2">Pending</span>
            </div>
            <button
              onClick={loadSem4Requests}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {sem4Loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-3"></div>
            Loading requests...
          </div>
        ) : sem4Requests.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            No pending Sem 4 requests at the moment.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {sem4Requests.map(request => (
              <div
                key={request._id}
                className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-indigo-600 font-semibold">
                      Priority {request.priority} of {request.totalPreferences}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.title || 'Major Project 2'}
                    </h3>
                    <p className="text-sm text-gray-600">{request.domain || 'Domain not specified'}</p>
                  </div>
                  <div className="text-sm text-gray-700">
                    <p className="font-semibold">{request.student?.fullName || 'Student'}</p>
                    <p className="text-gray-500">{request.student?.misNumber || 'MIS'}</p>
                    <p className="text-gray-500">{request.student?.collegeEmail}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-3">
                  {request.summary || 'No summary provided.'}
                </p>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                  <p className="text-xs text-gray-500">
                    Submitted on {request.submittedAt ? new Date(request.submittedAt).toLocaleDateString() : '—'}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSem4Choose(request._id)}
                      disabled={sem4ActionLoading[request._id]}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sem4ActionLoading[request._id] === 'choose' ? 'Processing...' : 'Interested'}
                    </button>
                    <button
                      onClick={() => handleSem4Pass(request._id)}
                      disabled={sem4ActionLoading[request._id]}
                      className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sem4ActionLoading[request._id] === 'pass' ? 'Processing...' : 'Not Interested'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('allocated')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'allocated'
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
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'unallocated'
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
                        {semesterData.projectTypes.map((projectType) => {
                          // Handle Major Project 2 parent with subsections
                          if (projectType.isParent && projectType.subsections) {
                            const totalGroups = projectType.subsections.reduce((sum, sub) => sum + sub.groups.length, 0);
                            return (
                              <div key={`${semesterData.semester}-${projectType.displayName}`} className="mb-6">
                                <h4 className="text-lg font-medium text-gray-800 mb-4 pl-4 border-l-4 border-green-500">
                                  {projectType.displayName}
                                  <span className="ml-2 text-sm text-gray-500">
                                    ({totalGroups} {totalGroups === 1 ? 'project' : 'projects'})
                                  </span>
                                </h4>

                                {/* Render subsections */}
                                <div className="space-y-6 ml-6">
                                  {projectType.subsections.map((subsection) => (
                                    subsection.groups.length > 0 && (
                                      <div key={`${semesterData.semester}-${subsection.displayName}`} className="mb-4">
                                        <h5 className="text-md font-medium text-gray-700 mb-3 pl-3 border-l-2 border-green-400">
                                          {subsection.displayName}
                                          <span className="ml-2 text-sm text-gray-500">
                                            ({subsection.groups.length} {subsection.groups.length === 1 ? 'project' : 'projects'})
                                          </span>
                                        </h5>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ml-4">
                                          {subsection.groups.map((group) => (
                                            <GroupCard key={group.id} group={group} isAllocated={true} />
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          // Regular project type rendering
                          return (
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
                          );
                        })}
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

            {/* Ranking UI (Only show if there are multiple interested groups) */}
            {interestedGroups.length > 1 && (() => {
              const isRankingDisabled = interestedGroups.some(g => g.allocationDeadline && new Date(g.allocationDeadline) < new Date());
              return (
                <div className="bg-white rounded-lg shadow-sm border-2 border-indigo-100 mb-8">
                  <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-indigo-900">Rank Your Preferred Groups</h2>
                      <p className="text-indigo-700 mt-1 text-sm">
                        {isRankingDisabled
                          ? 'The response deadline has passed. You can no longer change your group preferences.'
                          : 'You are interested in multiple groups. Order them by preference to influence the stable matching algorithm. Rank 1 is your most preferred group.'}
                      </p>
                    </div>
                    <button
                      onClick={saveRankings}
                      disabled={savingRank || isRankingDisabled}
                      className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingRank ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : 'Save Rankings'}
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={localRankings}
                          strategy={verticalListSortingStrategy}
                        >
                          {localRankings.map((groupId, index) => {
                            const group = interestedGroups.find(g => g.id === groupId);
                            if (!group) return null;
                            return <SortableRankItem key={groupId} id={groupId} group={group} index={index} disabled={isRankingDisabled} />;
                          })}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                        {semesterData.projectTypes.map((projectType) => {
                          // Handle Major Project 2 parent with subsections
                          if (projectType.isParent && projectType.subsections) {
                            const totalGroups = projectType.subsections.reduce((sum, sub) => sum + sub.groups.length, 0);
                            return (
                              <div key={`${semesterData.semester}-${projectType.displayName}`} className="mb-6">
                                <h4 className="text-lg font-medium text-gray-800 mb-4 pl-4 border-l-4 border-blue-500">
                                  {projectType.displayName}
                                  <span className="ml-2 text-sm text-gray-500">
                                    ({totalGroups} {totalGroups === 1 ? 'project' : 'projects'})
                                  </span>
                                </h4>

                                {/* Render subsections */}
                                <div className="space-y-6 ml-6">
                                  {projectType.subsections.map((subsection) => (
                                    subsection.groups.length > 0 && (
                                      <div key={`${semesterData.semester}-${subsection.displayName}`} className="mb-4">
                                        <h5 className="text-md font-medium text-gray-700 mb-3 pl-3 border-l-2 border-blue-400">
                                          {subsection.displayName}
                                          <span className="ml-2 text-sm text-gray-500">
                                            ({subsection.groups.length} {subsection.groups.length === 1 ? 'project' : 'projects'})
                                          </span>
                                        </h5>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ml-4">
                                          {subsection.groups.map((group) => (
                                            <GroupCard key={group.id} group={group} />
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          // Regular project type rendering
                          return (
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
                          );
                        })}
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
