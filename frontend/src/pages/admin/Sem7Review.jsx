import React, { useState, useEffect, useMemo } from 'react';
import { adminAPI, internshipAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';

const INTERNSHIP_STATUS_MAP = {
  submitted: { status: 'info', text: 'Submitted' },
  needs_info: { status: 'error', text: 'Needs Info' },
  pending_verification: { status: 'info', text: 'Pending Verification' },
  verified_pass: { status: 'success', text: 'Verified (Pass)' },
  verified_fail: { status: 'error', text: 'Verified (Fail)' },
  absent: { status: 'error', text: 'Absent' }
};

const Sem7Review = () => {
  const [activeTab, setActiveTab] = useState('all'); // 'all', '6month', 'summer', 'major1'
  
  // Internship Applications State
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [appFilterStatus, setAppFilterStatus] = useState('all');
  
  const [sem7Students, setSem7Students] = useState([]);

  // Track & Project Registrations State
  const [trackChoices, setTrackChoices] = useState([]);
  const [majorProjectProjects, setMajorProjectProjects] = useState([]);
  const [internship1Projects, setInternship1Projects] = useState([]);
  
  // Common State
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: 'submitted',
    remarks: ''
  });

  const trackChoiceByStudent = useMemo(() => {
    const map = new Map();
    trackChoices.forEach(choice => {
      if (choice?.studentId) {
        map.set(choice.studentId.toString(), choice);
      }
    });
    return map;
  }, [trackChoices]);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    applyApplicationFilters();
  }, [applications, appFilterStatus, activeTab]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        studentsResponse,
        appResponse,
        majorProjectsResponse,
        internshipProjectsResponse,
        trackChoicesResponse
      ] = await Promise.all([
        adminAPI.getStudentsBySemester({ semester: 7 }),
        adminAPI.listInternshipApplications({ semester: 7 }),
        adminAPI.getProjects({ semester: 7, projectType: 'major1' }),
        adminAPI.getProjects({ semester: 7, projectType: 'internship1' }),
        adminAPI.listSem7TrackChoices()
      ]);
      
      if (appResponse.success) {
        setApplications(appResponse.data || []);
      }

      if (studentsResponse.success) {
        setSem7Students(studentsResponse.data || []);
      }

      if (trackChoicesResponse.success) {
        setTrackChoices(trackChoicesResponse.data || []);
      }

      if (majorProjectsResponse.success) {
        setMajorProjectProjects(majorProjectsResponse.data || []);
      }

      if (internshipProjectsResponse.success) {
        setInternship1Projects(internshipProjectsResponse.data || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const applyApplicationFilters = () => {
    let filtered = [...applications];

    // Filter by tab (student type)
    if (activeTab === '6month') {
      filtered = filtered.filter(app => app.type === '6month');
    } else if (activeTab === 'summer') {
      filtered = filtered.filter(app => app.type === 'summer');
    }
    // 'all' tab shows all applications

    // Filter by status
    if (appFilterStatus !== 'all') {
      filtered = filtered.filter(app => app.status === appFilterStatus);
    }

    // Sort by email address (primary) or MIS number (fallback)
    filtered.sort((a, b) => {
      const emailA = (a.student?.collegeEmail || '').toLowerCase();
      const emailB = (b.student?.collegeEmail || '').toLowerCase();
      
      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }
      
      // If email is missing, sort by MIS number
      const misA = a.student?.misNumber || '';
      const misB = b.student?.misNumber || '';
      
      if (misA && misB) {
        return misA.localeCompare(misB);
      }
      
      // If both missing, maintain original order
      return 0;
    });

    setFilteredApplications(filtered);
  };

  const handleReview = (item) => {
    setSelectedItem({ ...item, reviewType: 'application' });
    setReviewData({
      status: item.status || 'submitted',
      remarks: item.adminRemarks || ''
    });
    setShowModal(true);
  };

  const handleSubmitReview = async () => {
    try {
      setIsSubmitting(true);
      
      const response = await adminAPI.reviewInternshipApplication(selectedItem._id, {
        status: reviewData.status,
        adminRemarks: reviewData.remarks
      });
      
      if (response.success) {
        toast.success('Internship application reviewed successfully');
        setShowModal(false);
        setSelectedItem(null);
        await loadAllData();
      } else {
        throw new Error(response.message || 'Failed to review application');
      }
    } catch (error) {
      console.error('Failed to review:', error);
      toast.error(`Failed to review: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = INTERNSHIP_STATUS_MAP[status] || { status: 'warning', text: status || 'Unknown' };
    return <StatusBadge status={config.status} text={config.text} />;
  };

  const toTitleCase = (value = '') =>
    value
      .toString()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim();

  const formatDateTime = (value) => {
    if (!value) {
      return '-';
    }
    try {
      return new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (error) {
      return '-';
    }
  };

  const renderVerificationBadge = (status) => {
    const statusMap = {
      approved: { status: 'success', text: 'Approved' },
      pending: { status: 'warning', text: 'Pending' },
      needs_info: { status: 'error', text: 'Needs Info' },
      rejected: { status: 'error', text: 'Rejected' }
    };
    const config = statusMap[status] || { status: 'info', text: status || 'Unknown' };
    return <StatusBadge status={config.status} text={config.text} />;
  };

  const getProjectStatusBadge = (status) => {
    const statusMap = {
      // Completed states (green)
      active: { status: 'success', text: 'Active' },
      faculty_allocated: { status: 'success', text: 'Allocated' },
      completed: { status: 'success', text: 'Completed' },
      // In-progress states (yellow)
      registered: { status: 'warning', text: 'Registered' },
      // Not started / Error states (red)
      cancelled: { status: 'error', text: 'Cancelled' }
    };
    const config = statusMap[status] || { status: 'warning', text: toTitleCase(status || 'Unknown') };
    return <StatusBadge status={config.status} text={config.text} />;
  };

  const renderTrackLabel = (track) => {
    if (!track) {
      return <span className="text-sm text-gray-500">Not submitted</span>;
    }

    const config = track === 'coursework'
      ? { color: 'bg-indigo-500/70', label: 'Coursework Track' }
      : { color: 'bg-emerald-500/70', label: '6-Month Internship Track' };

    return (
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
        <span className="text-sm font-medium text-gray-900">{config.label}</span>
      </div>
    );
  };

  const renderVerificationCell = (choice) => {
    if (!choice) {
      return <StatusBadge status="error" text="Not Started" />;
    }
    // Map verification status to color scheme
    const verificationMap = {
      approved: { status: 'success', text: 'Approved' },
      pending: { status: 'warning', text: 'Pending' },
      needs_info: { status: 'warning', text: 'Needs Info' },
      rejected: { status: 'error', text: 'Rejected' }
    };
    const config = verificationMap[choice.verificationStatus] || { 
      status: 'warning', 
      text: choice.verificationStatus || 'Unknown' 
    };
    return <StatusBadge status={config.status} text={config.text} />;
  };

  const renderTrackChangeCell = (choice) => {
    if (!choice) {
      return <span className="text-sm text-gray-500 whitespace-nowrap">No submission yet</span>;
    }

    if (choice.trackChangedByAdminAt && choice.previousTrack) {
      // Use a single line with tooltip for date to keep rows compact
      const changeDate = formatDateTime(choice.trackChangedByAdminAt);
      return (
        <span 
          className="text-sm text-gray-700 whitespace-nowrap" 
          title={`Changed from ${toTitleCase(choice.previousTrack)} on ${changeDate}`}
        >
          Changed from <span className="font-medium">{toTitleCase(choice.previousTrack)}</span>
        </span>
      );
    }

    return <span className="text-sm text-gray-500 whitespace-nowrap">No changes</span>;
  };

  const renderInternship1TrackChangeCell = (application) => {
    if (!application) {
      return <span className="text-sm text-gray-500 whitespace-nowrap">—</span>;
    }

    if (application.internship1TrackChangedByAdminAt && application.previousInternship1Track) {
      const changeDate = formatDateTime(application.internship1TrackChangedByAdminAt);
      const previousTrack = application.previousInternship1Track === 'project' 
        ? 'Project' 
        : 'Application';
      return (
        <span 
          className="text-sm text-gray-700 whitespace-nowrap" 
          title={`Changed from ${previousTrack} on ${changeDate}`}
        >
          Changed from <span className="font-medium">{previousTrack}</span>
        </span>
      );
    }

    return <span className="text-sm text-gray-500 whitespace-nowrap">No changes</span>;
  };

  const getLatestApplicationByType = (studentId, type) => {
    if (!studentId) return null;
    const apps = applicationsByStudent.get(studentId) || [];
    const matching = apps.filter(app => app.type === type);
    if (!matching.length) return null;
    matching.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    return matching[0];
  };

  const renderApplicationStatus = (application, emptyLabel) => {
    if (!application) {
      // Show red for "No submission yet" when it's expected
      const isExpected = emptyLabel === 'No submission yet';
      if (isExpected) {
        return <StatusBadge status="error" text="Not Started" />;
      }
      return <span className="text-sm text-gray-500">{emptyLabel}</span>;
    }

    // Map application statuses to color scheme
    const statusMap = {
      // Completed states (green)
      verified_pass: { status: 'success', text: 'Verified (Pass)' },
      // In-progress states (yellow)
      submitted: { status: 'warning', text: 'Submitted' },
      pending_verification: { status: 'warning', text: 'Pending Verification' },
      needs_info: { status: 'warning', text: 'Needs Info' },
      // Error states (red)
      verified_fail: { status: 'error', text: 'Verified (Fail)' },
      absent: { status: 'error', text: 'Absent' }
    };

    const statusConfig = statusMap[application.status] || {
      status: 'warning',
      text: toTitleCase(application.status || 'Unknown')
    };

    // Build tooltip with remarks if available
    const tooltip = application.adminRemarks 
      ? `Remarks: ${application.adminRemarks}` 
      : undefined;

    return (
      <div title={tooltip} className="inline-block">
        <StatusBadge status={statusConfig.status} text={statusConfig.text} />
      </div>
    );
  };

  const renderProjectCell = (projects, emptyLabel, options = {}) => {
    if (!projects || projects.length === 0) {
      // Show red for "Not registered" when it's expected (coursework track)
      // Show gray for "Not applicable" (when track doesn't require it or summer internship is approved)
      // Show gray for "Track pending" (when track is not yet selected)
      if (emptyLabel === 'Not applicable') {
        return <span className="text-sm text-gray-500">Not applicable</span>;
      }
      if (emptyLabel === 'Track pending') {
        return <span className="text-sm text-gray-500">Track pending</span>;
      }
      // For "Not registered", show red badge
      if (emptyLabel === 'Not registered') {
        return <StatusBadge status="error" text="Not Started" />;
      }
      return <span className="text-sm text-gray-500">{emptyLabel}</span>;
    }

    const project = projects[0];
    // Build tooltip with project title and optionally faculty name
    const tooltipParts = [];
    if (project.title) {
      tooltipParts.push(`Project: ${project.title}`);
    }
    if (options.showFaculty && project.faculty?.fullName) {
      tooltipParts.push(`Mentor: ${project.faculty.fullName}`);
    }
    const tooltip = tooltipParts.length > 0 ? tooltipParts.join('\n') : undefined;

    return (
      <div title={tooltip} className="inline-block">
        {getProjectStatusBadge(project.status)}
      </div>
    );
  };

  const applicationsByStudent = useMemo(() => {
    const map = new Map();
    applications.forEach(app => {
      const studentId = (app.student?._id || app.student || '').toString();
      if (!studentId) {
        return;
      }
      if (!map.has(studentId)) {
        map.set(studentId, []);
      }
      map.get(studentId).push(app);
    });
    return map;
  }, [applications]);

  const majorProjectByStudent = useMemo(() => {
    const map = new Map();
    const addStudentProject = (studentRef, project) => {
      const studentId = (studentRef?._id || studentRef || '').toString();
      if (!studentId) {
        return;
      }
      if (!map.has(studentId)) {
        map.set(studentId, []);
      }
      map.get(studentId).push(project);
    };

    majorProjectProjects.forEach(project => {
      if (project.student) {
        addStudentProject(project.student, project);
      }
      if (project.group?.members?.length) {
        project.group.members.forEach(member => {
          if (member.student) {
            addStudentProject(member.student, project);
          }
        });
      }
    });

    return map;
  }, [majorProjectProjects]);

  // Transform Major Project 1 projects into groups format
  const majorProject1Groups = useMemo(() => {
    // First, calculate the maximum number of supervisors across all projects
    let maxSupervisors = 7; // Default to 7
    majorProjectProjects.forEach(project => {
      if (project.group && project.group._id) {
        const facultyPrefs = project.facultyPreferences || [];
        const actualSupervisors = facultyPrefs.length;
        if (actualSupervisors > maxSupervisors) {
          maxSupervisors = Math.min(actualSupervisors, 10); // Cap at 10
        }
      }
    });
    
    // Create a map to store unique groups by group._id
    const groupsMap = new Map();
    
    majorProjectProjects.forEach(project => {
      // Skip if project doesn't have a group
      if (!project.group || !project.group._id) {
        return;
      }
      
      const groupId = project.group._id.toString();
      
      // If group already exists, skip (we only want one row per group)
      if (groupsMap.has(groupId)) {
        return;
      }
      
      const group = project.group;
      const faculty = project.faculty || group.allocatedFaculty || {};
      const members = (group.members || []).filter(m => m.isActive !== false);
      
      // Extract member information (up to 5 members)
      const memberData = [];
      for (let i = 0; i < 5; i++) {
        if (i < members.length && members[i].student) {
          const student = members[i].student;
          memberData.push({
            name: student.fullName || '-',
            mis: student.misNumber || '-',
            contact: student.contactNumber || '-',
            branch: student.branch || '-'
          });
        } else {
          memberData.push({
            name: '-',
            mis: '-',
            contact: '-',
            branch: '-'
          });
        }
      }
      
      // Extract faculty preferences (supervisors)
      const facultyPrefs = project.facultyPreferences || [];
      const supervisorData = [];
      for (let i = 0; i < 10; i++) {
        const pref = facultyPrefs.find(p => p.priority === i + 1);
        if (pref && pref.faculty) {
          supervisorData.push(pref.faculty.fullName || '-');
        } else {
          supervisorData.push('-');
        }
      }
      
      // Create group data object
      const groupData = {
        _id: groupId,
        groupName: group.name || '-',
        allocatedFaculty: faculty.fullName || '-',
        department: faculty.department || '-',
        projectTitle: project.title || '-',
        projectStatus: project.status || '-',
        member1Name: memberData[0].name,
        member1MIS: memberData[0].mis,
        member1Contact: memberData[0].contact,
        member1Branch: memberData[0].branch,
        member2Name: memberData[1].name,
        member2MIS: memberData[1].mis,
        member2Contact: memberData[1].contact,
        member2Branch: memberData[1].branch,
        member3Name: memberData[2].name,
        member3MIS: memberData[2].mis,
        member3Contact: memberData[2].contact,
        member3Branch: memberData[2].branch,
        member4Name: memberData[3].name,
        member4MIS: memberData[3].mis,
        member4Contact: memberData[3].contact,
        member4Branch: memberData[3].branch,
        member5Name: memberData[4].name,
        member5MIS: memberData[4].mis,
        member5Contact: memberData[4].contact,
        member5Branch: memberData[4].branch
      };
      
      // Add supervisor preferences (up to 10)
      for (let i = 0; i < 10; i++) {
        groupData[`supervisor${i + 1}`] = supervisorData[i] || '-';
      }
      
      groupsMap.set(groupId, groupData);
    });
    
    // Convert map to array and sort by group name
    const groupsArray = Array.from(groupsMap.values()).sort((a, b) => 
      (a.groupName || '').localeCompare(b.groupName || '')
    );
    
    // Store maxSupervisors as a property on the array
    groupsArray.maxSupervisors = maxSupervisors;
    
    return groupsArray;
  }, [majorProjectProjects]);
  
  // Calculate max supervisors for dynamic column rendering
  const maxSupervisors = useMemo(() => {
    if (majorProject1Groups.length === 0) return 7;
    // Access maxSupervisors property from the array
    return majorProject1Groups.maxSupervisors || 7;
  }, [majorProject1Groups]);

  const internship1ByStudent = useMemo(() => {
    const map = new Map();
    const addStudentProject = (studentRef, project) => {
      const studentId = (studentRef?._id || studentRef || '').toString();
      if (!studentId) {
        return;
      }
      if (!map.has(studentId)) {
        map.set(studentId, []);
      }
      map.get(studentId).push(project);
    };

    internship1Projects.forEach(project => {
      if (project.student) {
        addStudentProject(project.student, project);
      }
      if (project.group?.members?.length) {
        project.group.members.forEach(member => {
          if (member.student) {
            addStudentProject(member.student, project);
          }
        });
      }
    });

    return map;
  }, [internship1Projects]);

  const sortedSem7Students = useMemo(() => {
    const list = [...sem7Students];
    list.sort((a, b) => {
      const emailA = (a.collegeEmail || '').toLowerCase();
      const emailB = (b.collegeEmail || '').toLowerCase();

      if (emailA && emailB && emailA !== emailB) {
        return emailA.localeCompare(emailB);
      }

      const misA = a.misNumber || '';
      const misB = b.misNumber || '';
      return misA.localeCompare(misB);
    });
    return list;
  }, [sem7Students]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Semester 7 Review & Management</h1>
          <p className="text-gray-600">Review and finalize track choices and internship applications</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Semester 7 Students ({sem7Students.length})
            </button>
            <button
              onClick={() => setActiveTab('6month')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === '6month'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              6-Month Internship ({applications.filter(app => app.type === '6month').length})
            </button>
            <button
              onClick={() => setActiveTab('summer')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summer'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Summer Internship ({applications.filter(app => app.type === 'summer').length})
            </button>
            <button
              onClick={() => setActiveTab('major1')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'major1'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Major Project 1 ({majorProject1Groups.length})
            </button>
            <button
              onClick={() => setActiveTab('internship1')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'internship1'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Internship 1 Projects ({internship1Projects.length})
            </button>
          </nav>
        </div>

        {/* Review Tables */}
        <div>
          {['6month', 'summer'].includes(activeTab) && (
            <div className="mb-6 flex gap-4 flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={appFilterStatus}
                  onChange={(e) => setAppFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="needs_info">Needs Info</option>
                  <option value="pending_verification">Pending Verification</option>
                  <option value="verified_pass">Verified (Pass)</option>
                  <option value="verified_fail">Verified (Fail)</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'all' && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  {/* Color Legend */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Color Guide</h3>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-green-100 text-green-800 font-medium text-xs">
                          Completed
                        </span>
                        <span className="text-gray-600">Step completed successfully</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-yellow-100 text-yellow-800 font-medium text-xs">
                          In Progress
                        </span>
                        <span className="text-gray-600">Process started but not completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-full bg-red-100 text-red-800 font-medium text-xs">
                          Not Started
                        </span>
                        <span className="text-gray-600">Required step not started yet</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">N/A</span>
                        <span className="text-gray-600">Not applicable for this track</span>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">S.No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MIS No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track Choice</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track Change</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship 1 Track Change</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">6-Month Internship</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summer Internship</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship 1 Project</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Major Project 1</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track Remarks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedSem7Students.length === 0 ? (
                          <tr>
                            <td colSpan="16" className="px-6 py-8 text-center text-gray-500">
                              No Semester 7 students found
                            </td>
                          </tr>
                        ) : (
                          sortedSem7Students.map((student, index) => {
                            const studentId = (student._id || '').toString();
                            const choice = trackChoiceByStudent.get(studentId);
                            const resolvedTrack = choice ? (choice.finalizedTrack || choice.chosenTrack) : null;
                            const sixMonthApplication = getLatestApplicationByType(studentId, '6month');
                            const summerApplication = getLatestApplicationByType(studentId, 'summer');
                            const internshipProjects = internship1ByStudent.get(studentId) || [];
                            const majorProjects = majorProjectByStudent.get(studentId) || [];

                            const fullName = student.fullName || choice?.fullName || 'N/A';
                            const misNumber = student.misNumber || choice?.misNumber || 'N/A';
                            const email = student.collegeEmail || choice?.email || 'N/A';
                            const contact = student.contactNumber || choice?.contactNumber || 'N/A';
                            const branch = student.branch || choice?.branch || 'N/A';

                            // Check if summer internship is approved/passed (makes Internship 1 not applicable)
                            const hasApprovedSummer = summerApplication && 
                              ['approved', 'verified_pass'].includes(summerApplication.status);

                            // Summer Internship: Applicable for coursework track, not applicable for internship track
                            const summerEmptyLabel = resolvedTrack === 'internship'
                              ? 'Not applicable'
                              : resolvedTrack === 'coursework'
                                ? 'No submission yet'
                                : 'Track pending';

                            // 6-Month Internship: Applicable for internship track, not applicable for coursework track
                            const sixMonthEmptyLabel = resolvedTrack === 'internship'
                              ? 'No submission yet'
                              : resolvedTrack === 'coursework'
                                ? 'Not applicable'
                                : 'Track pending';

                            // Internship 1 Project: 
                            // - Not applicable for internship track
                            // - Not applicable for coursework track if summer internship is approved/passed
                            // - Applicable for coursework track if summer internship is not approved/passed or not submitted
                            const internshipProjectLabel = resolvedTrack === 'internship'
                              ? 'Not applicable'
                              : resolvedTrack === 'coursework'
                                ? (hasApprovedSummer ? 'Not applicable' : 'Not registered')
                                : 'Track pending';

                            // Major Project 1: Applicable for coursework track, not applicable for internship track
                            const majorProjectLabel = resolvedTrack === 'coursework'
                              ? 'Not registered'
                              : resolvedTrack === 'internship'
                                ? 'Not applicable'
                                : 'Track pending';

                            return (
                              <tr key={student._id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 sticky left-0 bg-white z-10 font-medium">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {fullName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {misNumber}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {email}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {contact}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {branch}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {renderTrackLabel(resolvedTrack)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {renderVerificationCell(choice)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {renderTrackChangeCell(choice)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {resolvedTrack === 'coursework'
                                    ? renderInternship1TrackChangeCell(summerApplication)
                                    : <span className="text-sm text-gray-500">—</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {resolvedTrack === 'coursework'
                                    ? <span className="text-sm text-gray-500">{sixMonthEmptyLabel}</span>
                                    : renderApplicationStatus(sixMonthApplication, sixMonthEmptyLabel)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {resolvedTrack === 'internship'
                                    ? <span className="text-sm text-gray-500">{summerEmptyLabel}</span>
                                    : renderApplicationStatus(summerApplication, summerEmptyLabel)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {renderProjectCell(internshipProjects, internshipProjectLabel, { showFaculty: true })}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {renderProjectCell(majorProjects, majorProjectLabel)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {choice?.adminRemarks || '—'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {choice?.updatedAt ? formatDateTime(choice.updatedAt) : '—'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'major1' && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                            Group Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Allocated Faculty
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Project Title
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member 1
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            MIS 1
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact 1
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Branch 1
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member 2
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            MIS 2
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact 2
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Branch 2
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member 3
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            MIS 3
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact 3
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Branch 3
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member 4
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            MIS 4
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact 4
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Branch 4
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member 5
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            MIS 5
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact 5
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Branch 5
                          </th>
                          {/* Dynamic Supervisor Headers */}
                          {Array.from({ length: maxSupervisors }, (_, i) => (
                            <th key={`supervisor-header-${i + 1}`} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Supervisor {i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {majorProject1Groups.length === 0 ? (
                          <tr>
                            <td colSpan={24 + maxSupervisors} className="px-6 py-8 text-center text-gray-500">
                              No Major Project 1 groups found
                            </td>
                          </tr>
                        ) : (
                          majorProject1Groups.map((group, index) => (
                            <tr key={group._id || index} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                {group.groupName}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.allocatedFaculty}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.department}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={group.projectTitle}>
                                {group.projectTitle}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member1Name}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member1MIS}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member1Contact}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member1Branch}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member2Name}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member2MIS}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member2Contact}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member2Branch}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member3Name}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member3MIS}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member3Contact}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member3Branch}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member4Name}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member4MIS}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member4Contact}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member4Branch}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member5Name}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member5MIS}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member5Contact}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                {group.member5Branch}
                              </td>
                              {/* Dynamic Supervisor Columns */}
                              {Array.from({ length: maxSupervisors }, (_, i) => (
                                <td key={`supervisor-${index}-${i + 1}`} className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {group[`supervisor${i + 1}`] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'internship1' && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MIS No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty Mentor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered On</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {internship1Projects.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                              No Internship 1 project registrations found
                            </td>
                          </tr>
                        ) : (
                          internship1Projects.map((project, index) => {
                            const student = project.student || {};
                            const faculty = project.faculty || {};

                            return (
                              <tr key={project._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {student.fullName || 'N/A'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {student.misNumber || 'N/A'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {student.collegeEmail || 'N/A'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {student.branch || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {project.title || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {faculty.fullName ? (
                                    <div>
                                      <p className="font-medium">{faculty.fullName}</p>
                                      {faculty.department && (
                                        <p className="text-xs text-gray-500">{faculty.department}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">Not allocated</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {getProjectStatusBadge(project.status)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {formatDateTime(project.createdAt)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {['6month', 'summer'].includes(activeTab) && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">S.No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MIS No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship-I Details</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Certificate</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Contact</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nature of Work</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stipend/Salary?</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Amount (Rs.)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredApplications.length === 0 ? (
                          <tr>
                            <td colSpan="20" className="px-6 py-4 text-center text-gray-500">
                              {activeTab === '6month' && 'No 6-month internship applications found'}
                              {activeTab === 'summer' && 'No summer internship applications found'}
                            </td>
                          </tr>
                        ) : (
                          filteredApplications.map((app, index) => (
                            <tr key={app._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 sticky left-0 bg-white z-10 font-medium">
                                {index + 1}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.student?.collegeEmail || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {app.student?.fullName || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.student?.misNumber || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.student?.contactNumber || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.student?.branch || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.type === 'summer' ? 'Completed the Summer Internship' : '6-Month Internship'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {app.details?.companyName || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.details?.startDate ? new Date(app.details.startDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.details?.endDate ? new Date(app.details.endDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {app.type === '6month' && app.details?.offerLetterLink ? (
                                  <a
                                    href={app.details.offerLetterLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-900 underline break-all"
                                  >
                                    View Link
                                  </a>
                                ) : app.type === 'summer' && (app.details?.completionCertificateLink || app.uploads?.completionCertificateFile) ? (
                                  <a
                                    href={app.details?.completionCertificateLink || internshipAPI.downloadFile(app._id, 'completionCertificate')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-900 underline break-all"
                                  >
                                    {app.details?.completionCertificateLink ? 'View Link' : 'View File'}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.details?.mentorName || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.details?.mentorPhone || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.details?.mentorEmail || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={app.details?.roleOrNatureOfWork || ''}>
                                {app.details?.roleOrNatureOfWork || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.details?.hasStipend === 'yes' ? 'Yes' : app.details?.hasStipend === 'no' ? 'No' : (app.details?.stipendRs > 0 ? 'Yes' : 'No')}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {app.details?.hasStipend === 'yes' || app.details?.stipendRs > 0 
                                  ? (app.details?.stipendRs?.toLocaleString('en-IN') || '0') 
                                  : '0'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                                {app.adminRemarks || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {getStatusBadge(app.status)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium sticky right-0 bg-white z-10">
                                <button
                                  onClick={() => handleReview(app)}
                                  className="text-orange-600 hover:text-orange-900 hover:underline"
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Review Modal */}
        {showModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Review Internship Application
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4">
                <>
                    {/* Student Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Student Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Full Name</p>
                          <p className="text-sm font-medium text-gray-900">{selectedItem.student?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">MIS Number</p>
                          <p className="text-sm font-medium text-gray-900">{selectedItem.student?.misNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Email Address</p>
                          <p className="text-sm text-gray-900">{selectedItem.student?.collegeEmail || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Contact Number</p>
                          <p className="text-sm text-gray-900">{selectedItem.student?.contactNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Branch</p>
                          <p className="text-sm text-gray-900">{selectedItem.student?.branch || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Application Type</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedItem.type === '6month' ? '6-Month Internship' : 'Summer Internship'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Company Details */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Company Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Company Name</p>
                          <p className="text-sm font-medium text-gray-900">{selectedItem.details?.companyName || 'N/A'}</p>
                        </div>
                        {selectedItem.details?.location && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Location</p>
                            <p className="text-sm text-gray-900">{selectedItem.details.location}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Start Date</p>
                          <p className="text-sm text-gray-900">
                            {selectedItem.details?.startDate ? new Date(selectedItem.details.startDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">End Date</p>
                          <p className="text-sm text-gray-900">
                            {selectedItem.details?.endDate ? new Date(selectedItem.details.endDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        {selectedItem.details?.mode && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Mode</p>
                            <p className="text-sm text-gray-900 capitalize">{selectedItem.details.mode}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Manager/Contact Details */}
                    {(selectedItem.details?.mentorName || selectedItem.details?.mentorEmail || selectedItem.details?.mentorPhone) && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Manager/Contact Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedItem.details?.mentorName && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Manager Name</p>
                              <p className="text-sm text-gray-900">{selectedItem.details.mentorName}</p>
                            </div>
                          )}
                          {selectedItem.details?.mentorPhone && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Contact Number</p>
                              <p className="text-sm text-gray-900">{selectedItem.details.mentorPhone}</p>
                            </div>
                          )}
                          {selectedItem.details?.mentorEmail && (
                            <div className="md:col-span-2">
                              <p className="text-xs text-gray-500 mb-1">Official Email Address</p>
                              <p className="text-sm text-gray-900">{selectedItem.details.mentorEmail}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Nature of Work */}
                    {selectedItem.details?.roleOrNatureOfWork && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Nature of Work</h4>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedItem.details.roleOrNatureOfWork}</p>
                      </div>
                    )}

                    {/* Stipend Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Stipend/Salary Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Are you getting Stipend/Salary?</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedItem.details?.hasStipend === 'yes' ? 'Yes' : selectedItem.details?.hasStipend === 'no' ? 'No' : (selectedItem.details?.stipendRs > 0 ? 'Yes' : 'No')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Monthly Amount (Rs.)</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedItem.details?.hasStipend === 'yes' || selectedItem.details?.stipendRs > 0 
                              ? selectedItem.details.stipendRs.toLocaleString('en-IN') 
                              : '0'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Documents</h4>
                      <div className="space-y-2">
                        {selectedItem.type === '6month' && selectedItem.details?.offerLetterLink && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Offer Letter Link</p>
                            <a 
                              href={selectedItem.details.offerLetterLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all inline-block"
                            >
                              {selectedItem.details.offerLetterLink}
                            </a>
                          </div>
                        )}
                        {selectedItem.type === 'summer' && (selectedItem.details?.completionCertificateLink || selectedItem.uploads?.completionCertificateFile) && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Completion Certificate {selectedItem.details?.completionCertificateLink ? 'Link (Google Drive)' : '(File Upload - Legacy)'}</p>
                            <a 
                              href={selectedItem.details?.completionCertificateLink || internshipAPI.downloadFile(selectedItem._id, 'completionCertificate')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all inline-block"
                            >
                              {selectedItem.details?.completionCertificateLink || 'View Completion Certificate'}
                            </a>
                          </div>
                        )}
                        {((selectedItem.type === '6month' && !selectedItem.details?.offerLetterLink) ||
                          (selectedItem.type === 'summer' && !selectedItem.details?.completionCertificateLink && !selectedItem.uploads?.completionCertificateFile)) && (
                          <p className="text-sm text-gray-500 italic">No documents uploaded</p>
                        )}
                      </div>
                    </div>

                    {/* Application Status Review */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Application Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={reviewData.status}
                        onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="needs_info">Needs More Information</option>
                        <option value="pending_verification">Pending Verification</option>
                        <option value="verified_pass">Verified (Pass)</option>
                        <option value="verified_fail">Verified (Fail)</option>
                        <option value="absent">Absent</option>
                      </select>
                    </div>
                </>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Remarks
                  </label>
                  <textarea
                    value={reviewData.remarks}
                    onChange={(e) => setReviewData({ ...reviewData, remarks: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Add remarks or feedback for the student..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sem7Review;

