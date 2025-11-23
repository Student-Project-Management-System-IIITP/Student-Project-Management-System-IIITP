import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const GroupManagement = () => {
  const [groups, setGroups] = useState([]);
  const [registeredGroups, setRegisteredGroups] = useState([]);
  const [unregisteredGroups, setUnregisteredGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (semesterFilter = null) => {
    try {
      setLoading(true);
      
      // Load finalized groups - optionally filter by semester on backend
      const params = semesterFilter ? { semester: semesterFilter } : {};
      const groupsResponse = await adminAPI.getFinalizedGroupsForManagement(params);
      const allGroups = groupsResponse.data || [];
      const registered = groupsResponse.registered || [];
      const unregistered = groupsResponse.unregistered || [];
      setGroups(allGroups);
      setRegisteredGroups(registered);
      setUnregisteredGroups(unregistered);
      
      // Load students for all semesters (5, 6, 7)
      const [sem5Students, sem6Students, sem7Students] = await Promise.all([
        adminAPI.getStudentsBySemester({ semester: 5, degree: 'B.Tech' }),
        adminAPI.getStudentsBySemester({ semester: 6, degree: 'B.Tech' }),
        adminAPI.getStudentsBySemester({ semester: 7, degree: 'B.Tech' })
      ]);
      
      const allStudents = [
        ...(sem5Students.data || []),
        ...(sem6Students.data || []),
        ...(sem7Students.data || [])
      ];
      setStudents(allStudents);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load groups and students');
    } finally {
      setLoading(false);
    }
  };

  // Compute filtered groups for display
  const getFilteredRegisteredGroups = () => {
    let filtered = [...registeredGroups];
    
    // Filter by semester
    if (selectedSemester) {
      const sem = parseInt(selectedSemester);
      filtered = filtered.filter(g => {
        const activeSem = g.currentActiveSemester || g.semester;
        return activeSem === sem;
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g => {
        const groupName = (g.name || '').toLowerCase();
        const facultyName = (g.allocatedFaculty?.fullName || '').toLowerCase();
        const projectTitle = (g.project?.title || '').toLowerCase();
        return groupName.includes(term) || facultyName.includes(term) || projectTitle.includes(term);
      });
    }
    
    return filtered;
  };

  const getFilteredUnregisteredGroups = () => {
    let filtered = [...unregisteredGroups];
    
    // Filter by semester
    if (selectedSemester) {
      const sem = parseInt(selectedSemester);
      filtered = filtered.filter(g => {
        const activeSem = g.currentActiveSemester || g.semester;
        return activeSem === sem;
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g => {
        const groupName = (g.name || '').toLowerCase();
        const facultyName = (g.allocatedFaculty?.fullName || '').toLowerCase();
        const projectTitle = (g.project?.title || '').toLowerCase();
        return groupName.includes(term) || facultyName.includes(term) || projectTitle.includes(term);
      });
    }
    
    return filtered;
  };

  const getActiveMembers = (group) => {
    return group.members?.filter(m => m.isActive) || [];
  };

  const getAvailableStudents = (group) => {
    if (!group) return [];
    
    const activeMemberIds = getActiveMembers(group).map(m => 
      typeof m.student === 'object' ? m.student._id : m.student
    );
    
    // Use currentActiveSemester if available, otherwise fall back to semester
    const groupActiveSemester = group.currentActiveSemester || group.semester;
    
    return students.filter(s => {
      // Must be in the same semester as the group's current active semester
      if (s.semester !== groupActiveSemester) return false;
      
      // Must not already be in this group
      if (activeMemberIds.includes(s._id)) return false;
      
      // Semester-specific eligibility rules
      if (groupActiveSemester === 5) {
        // Sem 5: only block students who are already in a finalized/locked group
        if (s.hasGroup && (s.groupStatus === 'finalized' || s.groupStatus === 'locked')) {
          return false;
        }
      } else if (groupActiveSemester === 6 || groupActiveSemester === 7) {
        // Sem 6/7: block any student who already has an active group in this semester
        if (s.hasGroup) {
          return false;
        }
      }
      
      return true;
    });
  };

  const handleAddMember = async (groupId, studentId) => {
    try {
      setActionLoading({ ...actionLoading, [`add-${groupId}-${studentId}`]: true });
      const response = await adminAPI.addMemberToGroup(groupId, studentId);
      
      if (response.success) {
        toast.success('Member added successfully');
        // Refresh groups and students from backend so availability reflects latest memberships
        await loadData(selectedSemester || null);
        setShowAddMemberModal(false);
        setSelectedGroup(null);
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      toast.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setActionLoading({ ...actionLoading, [`add-${groupId}-${studentId}`]: false });
    }
  };

  const handleRemoveMember = async (groupId, studentId) => {
    try {
      setActionLoading({ ...actionLoading, [`remove-${groupId}-${studentId}`]: true });
      const response = await adminAPI.removeMemberFromGroup(groupId, studentId);
      
      if (response.success) {
        toast.success('Member removed successfully. Group remains allocated.');
        // Refresh groups and students from backend so availability reflects latest memberships
        await loadData(selectedSemester || null);
        setShowRemoveMemberModal(false);
        setMemberToRemove(null);
        setSelectedGroup(null);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionLoading({ ...actionLoading, [`remove-${groupId}-${studentId}`]: false });
    }
  };

  const openAddMemberModal = (group) => {
    setSelectedGroup(group);
    setShowAddMemberModal(true);
  };

  const openRemoveMemberModal = (group, member) => {
    setSelectedGroup(group);
    setMemberToRemove(member);
    setShowRemoveMemberModal(true);
  };

  const renderGroupCard = (group, isUnregistered = false) => {
    const activeMembers = getActiveMembers(group);
    const isFull = activeMembers.length >= (group.maxMembers || 5);
    
    return (
      <div key={group._id} className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Semester {group.currentActiveSemester || group.semester} • {group.academicYear}
                {group.currentActiveSemester && group.currentActiveSemester !== group.semester && (
                  <span className="ml-2 text-xs text-blue-600">(Originally Sem {group.semester})</span>
                )}
              </p>
            </div>
            <div className="text-right">
              {(() => {
                const isInactive = group.isActive === false;
                const displayLabel = isUnregistered
                  ? 'Unregistered'
                  : isInactive
                  ? 'Completed'
                  : group.status;

                const badgeClass = isUnregistered
                  ? 'bg-orange-100 text-orange-800'
                  : isInactive
                  ? 'bg-green-100 text-green-800'
                  : group.status === 'finalized'
                  ? 'bg-green-100 text-green-800'
                  : group.status === 'locked'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800';

                return (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                    {displayLabel}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Faculty Info */}
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm font-medium text-gray-700">
              Allocated Faculty: <span className="text-blue-700">{group.allocatedFaculty?.fullName || 'N/A'}</span>
            </p>
            {group.allocatedFaculty?.department && (
              <p className="text-xs text-gray-600 mt-1">
                {group.allocatedFaculty.department} • {group.allocatedFaculty.designation}
              </p>
            )}
          </div>

          {/* Project Info */}
          {group.project && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">
                Project: <span className="text-gray-900">{group.project.title}</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">Status: {group.project.status}</p>
            </div>
          )}

          {/* Members List */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">
                Members ({activeMembers.length}/{group.maxMembers || 5})
              </h4>
              {!isFull && (
                <button
                  onClick={() => openAddMemberModal(group)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add Member
                </button>
              )}
            </div>
            <div className="space-y-2">
              {activeMembers.map((member, idx) => {
                const student = typeof member.student === 'object' ? member.student : 
                  students.find(s => s._id === member.student);
                const isLeader = group.leader && (
                  typeof group.leader === 'object' ? 
                  group.leader._id === student?._id : 
                  group.leader === student?._id
                );
                
                return (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {student?.fullName || 'Unknown'}
                          {isLeader && (
                            <span className="ml-2 text-xs text-blue-600 font-semibold">(Leader)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          MIS: {student?.misNumber || 'N/A'} • {student?.branch || 'N/A'}
                        </p>
                      </div>
                    </div>
                    {activeMembers.length > 1 && (
                      <button
                        onClick={() => openRemoveMemberModal(group, member)}
                        disabled={actionLoading[`remove-${group._id}-${student?._id}`]}
                        className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        {actionLoading[`remove-${group._id}-${student?._id}`] ? 'Removing...' : 'Remove'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading groups...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Group Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage members in finalized groups with allocated faculty (Semesters 5, 6, 7)
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Semesters (5, 6, 7)</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Groups
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by group name, faculty, or project..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Groups List */}
        <div className="space-y-6">
          {/* Registered Groups Section */}
          {(() => {
            const filteredRegistered = getFilteredRegisteredGroups();
            return filteredRegistered.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Registered Groups ({filteredRegistered.length})
                </h2>
                <div className="space-y-4">
                  {filteredRegistered.map((group) => {
                    return renderGroupCard(group);
                  })}
                </div>
              </div>
            );
          })()}

          {/* Unregistered Groups Section */}
          {(() => {
            const filteredUnregistered = getFilteredUnregisteredGroups();
            return filteredUnregistered.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Unregistered Groups ({filteredUnregistered.length})
                </h2>
                <div className="space-y-4">
                  {filteredUnregistered.map((group) => {
                    return renderGroupCard(group, true);
                  })}
                </div>
              </div>
            );
          })()}

          {/* No Groups Found */}
          {getFilteredRegisteredGroups().length === 0 && getFilteredUnregisteredGroups().length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No groups found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Add Member Modal */}
        {showAddMemberModal && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Member to {selectedGroup.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select a student to add to this group
                </p>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-2">
                  {getAvailableStudents(selectedGroup).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No available students found for Semester {selectedGroup.currentActiveSemester || selectedGroup.semester}
                    </p>
                  ) : (
                    getAvailableStudents(selectedGroup).map((student) => (
                      <div
                        key={student._id}
                        className="flex justify-between items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                          <p className="text-xs text-gray-500">
                            MIS: {student.misNumber} • {student.branch} • Sem {student.semester}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddMember(selectedGroup._id, student._id)}
                          disabled={actionLoading[`add-${selectedGroup._id}-${student._id}`]}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {actionLoading[`add-${selectedGroup._id}-${student._id}`] ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setSelectedGroup(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Member Modal */}
        {showRemoveMemberModal && selectedGroup && memberToRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Remove Member</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to remove this member from the group? The group will remain allocated.
                </p>
                <div className="p-3 bg-gray-50 rounded-md mb-4">
                  <p className="text-sm font-medium text-gray-900">
                    {typeof memberToRemove.student === 'object' 
                      ? memberToRemove.student.fullName 
                      : students.find(s => s._id === memberToRemove.student)?.fullName || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Group: {selectedGroup.name}
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowRemoveMemberModal(false);
                      setMemberToRemove(null);
                      setSelectedGroup(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const studentId = typeof memberToRemove.student === 'object' 
                        ? memberToRemove.student._id 
                        : memberToRemove.student;
                      handleRemoveMember(selectedGroup._id, studentId);
                    }}
                    disabled={actionLoading[`remove-${selectedGroup._id}-${typeof memberToRemove.student === 'object' ? memberToRemove.student._id : memberToRemove.student}`]}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading[`remove-${selectedGroup._id}-${typeof memberToRemove.student === 'object' ? memberToRemove.student._id : memberToRemove.student}`] ? 'Removing...' : 'Remove Member'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupManagement;

