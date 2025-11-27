import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import { toast } from 'react-hot-toast';
import StatusBadge from '../../components/common/StatusBadge';

const ManageProjects = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const semester = parseInt(searchParams.get('semester')) || 5;
  const groupIdFromUrl = searchParams.get('group');
  
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [showChangeLeaderModal, setShowChangeLeaderModal] = useState(false);
  const [showDisbandModal, setShowDisbandModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [disbandReason, setDisbandReason] = useState('');
  
  // Loading states for actions
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState(false);
  const [changingLeader, setChangingLeader] = useState(false);
  const [disbandingGroup, setDisbandingGroup] = useState(false);
  const [allocatingFaculty, setAllocatingFaculty] = useState(false);
  const [deallocatingFaculty, setDeallocatingFaculty] = useState(false);
  const [showAllocateFacultyModal, setShowAllocateFacultyModal] = useState(false);
  const [availableFaculty, setAvailableFaculty] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [facultySearchTerm, setFacultySearchTerm] = useState('');
  const [facultySortBy, setFacultySortBy] = useState('name'); // name, department, designation
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const searchTimeoutRef = useRef(null);
  
  // Form states
  const [addMemberForm, setAddMemberForm] = useState({
    role: 'member',
    reason: 'You have been added to this group by admin.'
  });
  const [selectedStudentsForAdd, setSelectedStudentsForAdd] = useState([]);
  const [addStep, setAddStep] = useState(1);

  // Load groups (debounced search)
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      loadGroups();
    }, searchTerm ? 500 : 0); // No delay for initial load, 500ms debounce for search
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [semester, searchTerm]);

  // Auto-select group from URL parameter
  useEffect(() => {
    if (groupIdFromUrl && groups.length > 0 && !selectedGroup) {
      const group = groups.find(g => g._id === groupIdFromUrl);
      if (group && (!selectedGroup || selectedGroup._id !== groupIdFromUrl)) {
        loadGroupDetails(groupIdFromUrl);
      }
    }
  }, [groupIdFromUrl, groups]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const params = { 
        semester: semester.toString()
      };
      
      // Add search term if provided
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response = await adminAPI.getGroups(params);
      setGroups(response.data || []);
    } catch (error) {
      handleApiError(error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  // Load group details
  const loadGroupDetails = async (groupId) => {
    try {
      const response = await adminAPI.getGroupDetails(groupId);
      setSelectedGroup(response.data.group);
    } catch (error) {
      handleApiError(error);
      toast.error('Failed to load group details');
    }
  };

  // Load students for adding (all Sem N students; availability is shown via status in the UI)
  const loadAvailableStudents = async () => {
    try {
      setStudentsLoading(true);
      const studentsResponse = await adminAPI.getStudentsBySemester({ semester });
      const allStudents = studentsResponse.data || [];
      // Do not filter out students in groups here; we want to show them as unavailable in the UI
      setStudents(allStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
      setStudentsLoaded(true);
    }
  };

  // Add member to group
  const handleAddMember = async () => {
    if (!selectedGroup || selectedStudentsForAdd.length === 0) {
      toast.error('Please select at least one student to add');
      return;
    }

    setAddingMember(true);
    try {
      let successCount = 0;
      let failCount = 0;
      const failedNames = [];

      for (const student of selectedStudentsForAdd) {
        try {
          await adminAPI.addMemberToGroup(selectedGroup._id, {
            studentId: student._id,
            role: addMemberForm.role,
            reason: addMemberForm.reason,
            force: false
          });
          successCount += 1;
        } catch (err) {
          failCount += 1;
          failedNames.push(student.fullName);
          console.error('Error adding member to group:', student._id, err);
        }
      }

      if (successCount > 0) {
        const roleText = addMemberForm.role === 'leader' ? 'as leader' : 'as member';
        toast.success(`Successfully added ${successCount} student(s) ${roleText} to the group`);
      }
      if (failCount > 0) {
        toast.error(`Failed to add ${failCount} student(s): ${failedNames.join(', ')}`);
      }

      setShowAddMemberModal(false);
      setSelectedStudentsForAdd([]);
      setStudentSearchTerm('');
      setAddStep(1);
      await loadGroupDetails(selectedGroup._id);
      await loadGroups();
    } catch (error) {
      handleApiError(error);
      toast.error('Failed to add members to the group');
    } finally {
      setAddingMember(false);
    }
  };

  // Remove member from group
  const handleRemoveMember = async () => {
    if (!selectedGroup || !memberToRemove) {
      return;
    }

    setRemovingMember(true);
    try {
      await adminAPI.removeMemberFromGroup(selectedGroup._id, memberToRemove.student._id, {
        reason: '',
        handleProject: true,
        force: false
      });
      toast.success(`Successfully removed ${memberToRemove.student?.fullName || 'member'} from the group`);
      setShowRemoveMemberModal(false);
      setMemberToRemove(null);
      await loadGroupDetails(selectedGroup._id);
      await loadGroups();
    } catch (error) {
      const errorMessage = handleApiError(error, false);
      toast.error(errorMessage || 'Failed to remove member from group');
    } finally {
      setRemovingMember(false);
    }
  };

  // Disband group
  const handleDisbandGroup = async () => {
    if (!selectedGroup) {
      return;
    }

    setDisbandingGroup(true);
    try {
      await adminAPI.disbandGroup(selectedGroup._id, {
        reason: disbandReason || 'Disbanded by admin'
      });
      toast.success(`Group "${selectedGroup.name || 'Unnamed Group'}" has been disbanded successfully. All members, projects, and faculty preferences have been removed.`);
      setShowDisbandModal(false);
      setDisbandReason('');
      setSelectedGroup(null);
      await loadGroups();
    } catch (error) {
      const errorMessage = handleApiError(error, false);
      toast.error(errorMessage || 'Failed to disband group');
    } finally {
      setDisbandingGroup(false);
    }
  };

  // Load available faculty for allocation
  const loadAvailableFaculty = async (searchTerm = '', sortBy = 'name') => {
    setLoadingFaculty(true);
    try {
      const response = await adminAPI.searchFaculties({
        search: searchTerm,
        sort: sortBy
      });
      setAvailableFaculty(response.data || []);
    } catch (error) {
      // Fallback to getFaculty if searchFaculties fails
      try {
        const fallbackResponse = await adminAPI.getFaculty();
        let faculty = fallbackResponse.data || [];
        
        // Apply client-side filtering if searchFaculties failed
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          faculty = faculty.filter(fac =>
            fac.fullName?.toLowerCase().includes(searchLower) ||
            fac.email?.toLowerCase().includes(searchLower) ||
            fac.phone?.includes(searchTerm) ||
            fac.department?.toLowerCase().includes(searchLower) ||
            fac.designation?.toLowerCase().includes(searchLower)
          );
        }
        
        // Apply client-side sorting
        faculty.sort((a, b) => {
          const field = sortBy === 'department' ? 'department' : sortBy === 'designation' ? 'designation' : 'fullName';
          const aVal = (a[field] || '').toString();
          const bVal = (b[field] || '').toString();
          return aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
        });
        
        setAvailableFaculty(faculty);
      } catch (fallbackError) {
        handleApiError(error);
        toast.error('Failed to load faculty list');
      }
    } finally {
      setLoadingFaculty(false);
    }
  };

  // Load faculty when modal opens
  useEffect(() => {
    if (showAllocateFacultyModal) {
      loadAvailableFaculty('', 'name');
    } else {
      // Reset when modal closes
      setFacultySearchTerm('');
      setFacultySortBy('name');
    }
  }, [showAllocateFacultyModal]);

  // Debounced faculty search
  const facultySearchTimeoutRef = useRef(null);
  useEffect(() => {
    if (showAllocateFacultyModal && (facultySearchTerm || facultySortBy !== 'name')) {
      if (facultySearchTimeoutRef.current) {
        clearTimeout(facultySearchTimeoutRef.current);
      }
      facultySearchTimeoutRef.current = setTimeout(() => {
        loadAvailableFaculty(facultySearchTerm, facultySortBy);
      }, 300);
    }
    return () => {
      if (facultySearchTimeoutRef.current) {
        clearTimeout(facultySearchTimeoutRef.current);
      }
    };
  }, [facultySearchTerm, facultySortBy, showAllocateFacultyModal]);

  // Allocate faculty to group
  const handleAllocateFaculty = async (facultyId) => {
    if (!selectedGroup || !facultyId) {
      return;
    }

    setAllocatingFaculty(true);
    try {
      await adminAPI.allocateFacultyToGroup(selectedGroup._id, { facultyId });
      toast.success('Faculty allocated to group successfully');
      setShowAllocateFacultyModal(false);
      setFacultySearchTerm('');
      await loadGroupDetails(selectedGroup._id);
      await loadGroups();
    } catch (error) {
      handleApiError(error);
      toast.error('Failed to allocate faculty to group');
    } finally {
      setAllocatingFaculty(false);
    }
  };

  // Deallocate faculty from group
  const handleDeallocateFaculty = async () => {
    if (!selectedGroup || !selectedGroup.allocatedFaculty) {
      return;
    }

    if (!window.confirm(`Are you sure you want to deallocate ${selectedGroup.allocatedFaculty.fullName} from this group? This will revert the project status and all related changes.`)) {
      return;
    }

    setDeallocatingFaculty(true);
    try {
      await adminAPI.deallocateFacultyFromGroup(selectedGroup._id);
      toast.success('Faculty deallocated from group successfully');
      await loadGroupDetails(selectedGroup._id);
      await loadGroups();
    } catch (error) {
      handleApiError(error);
      toast.error('Failed to deallocate faculty from group');
    } finally {
      setDeallocatingFaculty(false);
    }
  };

  // Change group leader
  const handleChangeLeader = async (newLeaderId) => {
    if (!selectedGroup || !newLeaderId) {
      return;
    }

    setChangingLeader(true);
    try {
      const newLeader = selectedGroup.members?.find(m => 
        m.isActive && (m.student?._id === newLeaderId || m.student === newLeaderId)
      );
      const newLeaderName = newLeader?.student?.fullName || 'the selected member';
      
      await adminAPI.changeGroupLeader(selectedGroup._id, {
        newLeaderId: newLeaderId,
        reason: ''
      });
      toast.success(`Leadership transferred successfully. ${newLeaderName} is now the group leader.`);
      setShowChangeLeaderModal(false);
      setMemberToRemove(null); // Clear any pre-selected member
      await loadGroupDetails(selectedGroup._id);
      await loadGroups();
    } catch (error) {
      handleApiError(error);
      toast.error('Failed to change group leader');
    } finally {
      setChangingLeader(false);
    }
  };

  // Filtered students for add member (sorted: available first)
  const filteredStudents = students
    .filter(student => {
      if (!studentSearchTerm) return true;
      const searchLower = studentSearchTerm.toLowerCase();
      return (
        student.fullName?.toLowerCase().includes(searchLower) ||
        student.misNumber?.includes(studentSearchTerm) ||
        student.collegeEmail?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Helper to determine availability status
      const getAvailabilityStatus = (student) => {
        if (!selectedGroup) return 2; // No group selected, treat as unavailable
        const inThisGroup = selectedGroup.members?.some(
          m => m.isActive && (m.student?._id === student._id || m.student === student._id)
        );
        const inOtherGroup = groups.some(
          g =>
            g._id !== selectedGroup._id &&
            g.semester === semester &&
            g.members?.some(
              m => m.isActive && (m.student?._id === student._id || m.student === student._id)
            )
        );
        // 0 = available, 1 = in this group, 2 = in other group
        if (inThisGroup) return 1;
        if (inOtherGroup) return 2;
        return 0;
      };

      const statusA = getAvailabilityStatus(a);
      const statusB = getAvailabilityStatus(b);
      
      // Sort by availability status (0 first, then 1, then 2)
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      
      // If same status, sort alphabetically by name
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

  // Groups are already filtered by backend, so use them directly
  const filteredGroups = groups;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Projects & Groups</h1>
            <p className="text-gray-600 mt-2">
              Manage groups and projects for Semester {semester}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Semester Selector */}
        <div className="flex gap-2 mb-4">
          {[5, 6, 7, 8].map(sem => (
            <button
              key={sem}
              onClick={() => navigate(`/admin/manage-projects?semester=${sem}`)}
              className={`px-4 py-2 rounded-md font-medium ${
                semester === sem
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Semester {sem}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search groups or members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Search by group name, member/leader name, MIS number, email, phone number, or allocated faculty
          </p>
        </div>
      </div>

      {/* Groups List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Groups List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Projects/Groups ({filteredGroups.length})</h2>
              </div>
              <div className="p-4 grid grid-cols-1 gap-3">
                {filteredGroups.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No groups found
                  </div>
                ) : (
                  filteredGroups.map(group => {
                    const activeMembers = group.members?.filter(m => m.isActive) || [];
                    const hasProject = !!group.project;
                    const hasFaculty = !!group.allocatedFaculty;
                    const leader = activeMembers.find(m => m.role === 'leader')?.student || group.leader;
                    
                    return (
                      <div
                        key={group._id}
                        onClick={() => loadGroupDetails(group._id)}
                        className={`bg-white border rounded-lg shadow-sm hover:shadow transition-all cursor-pointer ${
                          selectedGroup?._id === group._id 
                            ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="p-3">
                          {/* Compact Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 text-sm truncate">
                                  {group.name || `Group ${group._id.slice(-6)}`}
                                </h3>
                                <StatusBadge status={group.status} />
                                <span className="text-xs text-gray-500">
                                  {activeMembers.length}/{group.maxMembers}
                                </span>
                              </div>
                            </div>
                            {hasFaculty ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 ml-2 flex-shrink-0">
                                ✓ Allocated
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 ml-2 flex-shrink-0">
                                Not Allocated
                              </span>
                            )}
                          </div>

                          {/* Compact Info Row */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {/* Project */}
                            {hasProject ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-blue-700 font-medium truncate" title={group.project.title}>
                                  {group.project.title || 'Project'}
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic">No project</div>
                            )}

                            {/* Faculty */}
                            {hasFaculty ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-green-700 font-medium truncate" title={group.allocatedFaculty.fullName}>
                                  {group.allocatedFaculty.fullName}
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic">No faculty</div>
                            )}
                          </div>

                          {/* Compact Members Grid */}
                          <div className="border-t border-gray-100 pt-2">
                            <div className="text-xs font-medium text-gray-600 mb-1.5">
                              Members ({activeMembers.length})
                            </div>
                            <div className="grid grid-cols-1 gap-1">
                              {activeMembers.length > 0 ? (
                                activeMembers.map((member, idx) => {
                                  const student = member.student;
                                  const isLeader = member.role === 'leader';
                                  return (
                                    <div 
                                      key={member._id || idx} 
                                      className={`flex items-center py-1.5 px-2 rounded text-xs ${
                                        isLeader 
                                          ? 'bg-yellow-50' 
                                          : 'bg-gray-50'
                                      }`}
                                    >
                                      {/* Name with fixed width */}
                                      <div className="flex items-center gap-1.5 flex-shrink-0" style={{ minWidth: '140px', maxWidth: '180px' }}>
                                        <span className={`font-medium truncate ${
                                          isLeader ? 'text-yellow-900' : 'text-gray-900'
                                        }`} title={student?.fullName || 'Unknown'}>
                                          {student?.fullName || 'Unknown'}
                                        </span>
                                        {isLeader && (
                                          <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded flex-shrink-0" title="Leader">
                                            Leader
                                          </span>
                                        )}
                                      </div>
                                      {/* Details - MIS, Branch, Email - Centered */}
                                      <div className="flex items-center gap-1.5 text-gray-600 flex-1 justify-center min-w-0">
                                        <span className="text-xs whitespace-nowrap">{student?.misNumber || 'N/A'}</span>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-xs whitespace-nowrap">{student?.branch || 'N/A'}</span>
                                        {student?.collegeEmail && (
                                          <>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-xs truncate min-w-0" title={student.collegeEmail}>
                                              {student.collegeEmail}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-xs text-gray-400 italic py-1">
                                  No active members
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Group Details Sidebar */}
          <div className="lg:col-span-1">
            {selectedGroup ? (
              <div className="bg-white rounded-lg shadow sticky top-4">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold">Details</h2>
                </div>

                <div className="p-4 space-y-4">
                  {/* Group Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {selectedGroup.name || `Group ${selectedGroup._id.slice(-6)}`}
                    </h3>
                      {selectedGroup.description && (
                        <p className="text-sm text-gray-600">{selectedGroup.description}</p>
                      )}
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge status={selectedGroup.status} />
                      <span className="text-sm text-gray-600">
                        {selectedGroup.members?.filter(m => m.isActive).length || 0} / {selectedGroup.maxMembers} members
                      </span>
                    </div>
                  </div>

                  {/* Members List */}
                  <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Members</h4>
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      + Add Member
                    </button>
                  </div>
                    <div className="space-y-2">
                      {selectedGroup.members?.filter(m => m.isActive).map(member => (
                        <div
                          key={member._id || member.student?._id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {member.student?.fullName || 'Unknown'}
                              {member.role === 'leader' && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                                  Leader
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {member.student?.misNumber} • {member.student?.branch}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {member.role !== 'leader' && (
                              <button
                                onClick={() => {
                                  // Pre-select this member in the change leader modal
                                  setMemberToRemove(member);
                                  setShowChangeLeaderModal(true);
                                }}
                                className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                                title="Transfer Leadership to this member"
                              >
                                Transfer Leadership
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setMemberToRemove(member);
                                setShowRemoveMemberModal(true);
                              }}
                              className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                              title="Remove Member"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Project Info */}
                  {selectedGroup.project && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Project</h4>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="font-medium text-sm">{selectedGroup.project.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Type: {selectedGroup.project.projectType} • Status: {selectedGroup.project.status}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Faculty Info - Only show if group has a project registered */}
                  {selectedGroup.project ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Faculty</h4>
                        {selectedGroup.allocatedFaculty ? (
                          <button
                            onClick={handleDeallocateFaculty}
                            disabled={deallocatingFaculty}
                            className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {deallocatingFaculty && (
                              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            {deallocatingFaculty ? 'Deallocating...' : 'Deallocate Faculty'}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              loadAvailableFaculty();
                              setShowAllocateFacultyModal(true);
                            }}
                            disabled={allocatingFaculty}
                            className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Allocate Faculty
                          </button>
                        )}
                      </div>
                      {selectedGroup.allocatedFaculty ? (
                        <div className="p-2 bg-gray-50 rounded">
                          <div className="font-medium text-sm">{selectedGroup.allocatedFaculty.fullName}</div>
                          <div className="text-xs text-gray-500">
                            {selectedGroup.allocatedFaculty.department} • {selectedGroup.allocatedFaculty.designation}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-50 rounded text-xs text-gray-500 italic">
                          No faculty allocated
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Faculty</h4>
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <div className="font-medium mb-1">Project registration required</div>
                            <div>Faculty allocation is only available after the group has registered a project.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Validation Status */}
                  {selectedGroup.validation && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Validation</h4>
                      {selectedGroup.validation.valid ? (
                        <div className="p-2 bg-green-50 rounded text-sm text-green-800">
                          ✓ Group status is valid
                        </div>
                      ) : (
                        <div className="p-2 bg-red-50 rounded">
                          <div className="text-sm font-medium text-red-800 mb-1">Issues Found:</div>
                          <ul className="text-xs text-red-700 list-disc list-inside">
                            {selectedGroup.validation.issues.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Danger Zone - Disband Group */}
                  {semester === 5 && selectedGroup.status !== 'disbanded' && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-red-900 mb-2">Danger Zone</h4>
                      <button
                        onClick={() => setShowDisbandModal(true)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Disband Group
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        This will permanently disband the group, remove all members, delete the project, and clear all faculty preferences.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Select a group to view details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {addStep === 1 ? 'Add Members - Select Students' : 'Add Members - Confirm & Message'}
            </h2>
            
            {addStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Students
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name, MIS, or email..."
                    value={studentSearchTerm}
                    onChange={(e) => {
                      setStudentSearchTerm(e.target.value);
                      if (e.target.value && !studentsLoaded && !studentsLoading) {
                        loadAvailableStudents();
                      }
                    }}
                    onFocus={() => {
                      if (!studentsLoaded && !studentsLoading) {
                        loadAvailableStudents();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Students
                  </label>
                  <div className="border border-gray-200 rounded-md max-h-80 overflow-y-auto">
                    {studentsLoading && (
                      <div className="p-3 text-sm text-gray-500 flex items-center justify-center">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2" />
                        Loading students...
                      </div>
                    )}
                    {!studentsLoading && !studentSearchTerm && (
                      <div className="p-3 text-sm text-gray-500">
                        Start typing (name / MIS / email) to search students.
                      </div>
                    )}
                    {!studentsLoading && studentSearchTerm && filteredStudents.length === 0 && (
                      <div className="p-3 text-sm text-gray-500">
                        No students found matching your search.
                      </div>
                    )}
                    {!studentsLoading && filteredStudents.length > 0 && (
                      <>
                        {filteredStudents.map(student => {
                          const inThisGroup = selectedGroup.members?.some(
                            m => m.isActive && (m.student?._id === student._id || m.student === student._id)
                          );
                          const inOtherGroup = groups.some(
                            g =>
                              g._id !== selectedGroup._id &&
                              g.semester === semester &&
                              g.members?.some(
                                m => m.isActive && (m.student?._id === student._id || m.student === student._id)
                              )
                          );
                          const isSelected = selectedStudentsForAdd.some(s => s._id === student._id);
                          // Block selection for any student already in a Sem N group; show them as unavailable
                          const disabled = inThisGroup || inOtherGroup;

                          let statusLabel = 'Available';
                          let statusClass = 'bg-green-100 text-green-800';
                          if (inThisGroup) {
                            statusLabel = 'Already in this group';
                            statusClass = 'bg-gray-100 text-gray-600';
                          } else if (inOtherGroup) {
                            statusLabel = 'In another group';
                            statusClass = 'bg-yellow-100 text-yellow-800';
                          }

                          return (
                            <button
                              key={student._id}
                              type="button"
                              onClick={() => {
                                if (disabled) return;
                                if (isSelected) {
                                  setSelectedStudentsForAdd(prev => prev.filter(s => s._id !== student._id));
                                } else {
                                  setSelectedStudentsForAdd(prev => [...prev, student]);
                                }
                              }}
                              className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 hover:bg-indigo-50 ${
                                isSelected ? 'bg-indigo-50' : ''
                              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                              disabled={disabled}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">{student.fullName}</div>
                                  <div className="text-xs text-gray-500">
                                    {student.misNumber} • {student.branch} • Sem {student.semester}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {student.collegeEmail}
                                  </div>
                                </div>
                                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selected Students
                  </label>
                  {selectedStudentsForAdd.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No students selected yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedStudentsForAdd.map(student => (
                        <span
                          key={student._id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                          {student.fullName} ({student.misNumber})
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedStudentsForAdd(prev =>
                                prev.filter(s => s._id !== student._id)
                              )
                            }
                            className="ml-1 text-indigo-500 hover:text-indigo-700"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {addStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Confirm Members
                  </h3>
                  {selectedStudentsForAdd.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No students selected. Go back and select at least one student.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-sm text-gray-700">
                      {selectedStudentsForAdd.map(student => (
                        <li key={student._id} className="flex items-center justify-between">
                          <span>
                            {student.fullName} ({student.misNumber}) • {student.branch}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role for added members
                  </label>
                  <select
                    value={addMemberForm.role}
                    onChange={(e) => setAddMemberForm({ ...addMemberForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="member">Member</option>
                    <option value="leader">Leader</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message to students (optional)
                  </label>
                  <textarea
                    value={addMemberForm.reason}
                    onChange={(e) => setAddMemberForm({ ...addMemberForm, reason: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    placeholder="You have been added to this group by admin."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This message will be recorded as the reason for adding each student.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedStudentsForAdd([]);
                  setStudentSearchTerm('');
                  setAddStep(1);
                  setAddMemberForm({
                    role: 'member',
                    reason: 'You have been added to this group by admin.'
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              {addStep === 2 && (
                <button
                  onClick={() => setAddStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              {addStep === 1 && (
                <button
                  onClick={() => {
                    if (selectedStudentsForAdd.length === 0) {
                      toast.error('Please select at least one student to continue');
                      return;
                    }
                    setAddStep(2);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Next
                </button>
              )}
              {addStep === 2 && (
                <button
                  onClick={handleAddMember}
                  disabled={addingMember}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {addingMember && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {addingMember ? 'Adding...' : 'Add Members'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Leader Confirmation Modal */}
      {showChangeLeaderModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Change Group Leader</h2>
            <p className="text-gray-600 mb-4">
              Select a new leader from the group members:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {selectedGroup.members?.filter(m => m.isActive && m.student?._id !== selectedGroup.leader?._id).map(member => (
                <button
                  key={member._id || member.student?._id}
                  onClick={() => handleChangeLeader(member.student._id)}
                  disabled={changingLeader}
                  className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{member.student?.fullName}</div>
                    <div className="text-sm text-gray-500">{member.student?.misNumber}</div>
                  </div>
                  {changingLeader && (
                    <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowChangeLeaderModal(false);
                setMemberToRemove(null); // Clear any pre-selected member
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Disband Group Modal */}
      {showDisbandModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Disband Group</h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to disband this group? This action will:
            </p>
            <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
              <li>Remove all members from the group</li>
              <li>Delete the Sem 5 Minor Project 2 project (if registered)</li>
              <li>Remove all faculty preferences</li>
              <li>Clear all invitations</li>
              <li>Mark the group as disbanded</li>
            </ul>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={disbandReason}
                onChange={(e) => setDisbandReason(e.target.value)}
                placeholder="Enter reason for disbanding..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows="3"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDisbandGroup}
                disabled={disbandingGroup}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {disbandingGroup && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {disbandingGroup ? 'Disbanding...' : 'Disband Group'}
              </button>
              <button
                onClick={() => {
                  setShowDisbandModal(false);
                  setDisbandReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Faculty Modal */}
      {showAllocateFacultyModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Allocate Faculty to Group</h2>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search faculty by name, department, or designation..."
                value={facultySearchTerm}
                onChange={(e) => setFacultySearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto mb-4">
              {loadingFaculty ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableFaculty
                    .filter(faculty => {
                      if (!facultySearchTerm) return true;
                      const searchLower = facultySearchTerm.toLowerCase();
                      return (
                        faculty.fullName?.toLowerCase().includes(searchLower) ||
                        faculty.department?.toLowerCase().includes(searchLower) ||
                        faculty.designation?.toLowerCase().includes(searchLower)
                      );
                    })
                    .map(faculty => (
                      <button
                        key={faculty._id}
                        onClick={() => handleAllocateFaculty(faculty._id)}
                        disabled={allocatingFaculty}
                        className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <div className="font-medium text-sm">{faculty.fullName}</div>
                        <div className="text-xs text-gray-500">
                          {faculty.department} • {faculty.designation}
                        </div>
                      </button>
                    ))}
                  {availableFaculty.filter(faculty => {
                    if (!facultySearchTerm) return true;
                    const searchLower = facultySearchTerm.toLowerCase();
                    return (
                      faculty.fullName?.toLowerCase().includes(searchLower) ||
                      faculty.department?.toLowerCase().includes(searchLower) ||
                      faculty.designation?.toLowerCase().includes(searchLower)
                    );
                  }).length === 0 && (
                    <div className="text-center text-gray-500 py-8 text-sm">
                      No faculty found
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAllocateFacultyModal(false);
                  setFacultySearchTerm('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Modal */}
      {showRemoveMemberModal && memberToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Remove Member</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to remove <strong>{memberToRemove.student?.fullName}</strong> from this group?
            </p>
            {memberToRemove.role === 'leader' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ This member is the group leader. A new leader will be automatically assigned.
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRemoveMemberModal(false);
                  setMemberToRemove(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={removingMember}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {removingMember && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {removingMember ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageProjects;

