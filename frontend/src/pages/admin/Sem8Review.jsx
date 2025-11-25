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

const Sem8Review = () => {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'type1', 'type2', 'major2-group', 'major2-solo', 'internship2-faculty', 'internship2-company', '6month'
  
  // State
  const [sem8Students, setSem8Students] = useState([]);
  const [trackChoices, setTrackChoices] = useState([]);
  const [majorProject2Projects, setMajorProject2Projects] = useState([]);
  const [internship2Projects, setInternship2Projects] = useState([]);
  const [sixMonthApplications, setSixMonthApplications] = useState([]);
  const [summerApplications, setSummerApplications] = useState([]); // Summer internship applications for Sem 8
  const [facultyPreferences, setFacultyPreferences] = useState([]); // FacultyPreference documents for group projects
  const [facultyPreferenceLimit, setFacultyPreferenceLimit] = useState(5); // Default from config (will be overridden by calculated max)
  const [maxFacultyPreferences, setMaxFacultyPreferences] = useState(5); // Dynamic max calculated from actual project data
  
  // Common State
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: 'submitted',
    remarks: ''
  });
  
  // State for inline remarks editing
  const [editingRemarks, setEditingRemarks] = useState({ id: null, type: null, value: '' });
  const [savingRemarks, setSavingRemarks] = useState(false);

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

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [
        studentsResponse,
        trackChoicesResponse,
        majorProjectsResponse,
        internship2Response,
        applicationsResponse,
        systemConfigResponse
      ] = await Promise.all([
        adminAPI.getStudentsBySemester({ semester: 8 }),
        adminAPI.listSem8TrackChoices(),
        adminAPI.getProjects({ semester: 8, projectType: 'major2' }),
        adminAPI.getProjects({ semester: 8, projectType: 'internship2' }),
        adminAPI.listInternshipApplications({ semester: 8 }),
        adminAPI.getSystemConfigByKey('sem8.majorProject2.facultyPreferenceLimit').catch(() => ({ success: false, data: null })) // Optional, don't fail if not available
      ]);
      
      if (studentsResponse.success) {
        setSem8Students(studentsResponse.data || []);
      }

      if (trackChoicesResponse.success) {
        setTrackChoices(trackChoicesResponse.data || []);
      }

      const major2Data = majorProjectsResponse.success ? (majorProjectsResponse.data || []) : [];
      const internship2Data = internship2Response.success ? (internship2Response.data || []) : [];
      
      setMajorProject2Projects(major2Data);
      setInternship2Projects(internship2Data);
      
      // Calculate maximum number of faculty preferences actually present in all projects
      let maxPrefs = 0;
      [...major2Data, ...internship2Data].forEach(project => {
        const prefs = project.facultyPreferences || [];
        if (prefs.length > maxPrefs) {
          maxPrefs = prefs.length;
        }
      });
      
      // Use the maximum found in data, or config limit (whichever is higher)
      // This ensures we show all preferences even if some projects have more than the current config limit
      const configLimit = (systemConfigResponse.success && systemConfigResponse.data?.value) 
        ? parseInt(systemConfigResponse.data.value, 10) || 5 
        : 5;
      setFacultyPreferenceLimit(configLimit);
      setMaxFacultyPreferences(Math.max(maxPrefs || 0, configLimit, 5)); // At least 5, or max found in data
      
      if (majorProjectsResponse.success === false) {
        console.warn('Failed to load Major Project 2:', majorProjectsResponse.message);
      }

      if (applicationsResponse.success) {
        const allApps = applicationsResponse.data || [];
        // Separate 6-month and summer applications
        setSixMonthApplications(allApps.filter(app => app.type === '6month'));
        setSummerApplications(allApps.filter(app => app.type === 'summer'));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
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

  // Handle inline remarks editing
  const handleStartEditRemarks = (id, type, currentValue) => {
    setEditingRemarks({ id, type, value: currentValue || '' });
  };

  const handleCancelEditRemarks = () => {
    setEditingRemarks({ id: null, type: null, value: '' });
  };

  const handleSaveProjectRemarks = async (projectId, remarks) => {
    try {
      setSavingRemarks(true);
      const response = await adminAPI.updateProjectStatus(projectId, { feedback: remarks });
      if (response.success) {
        toast.success('Remarks saved successfully');
        await loadAllData();
        setEditingRemarks({ id: null, type: null, value: '' });
      } else {
        throw new Error(response.message || 'Failed to save remarks');
      }
    } catch (error) {
      console.error('Failed to save remarks:', error);
      toast.error(`Failed to save remarks: ${error.message}`);
    } finally {
      setSavingRemarks(false);
    }
  };

  const handleSaveInternshipRemarks = async (applicationId, remarks, currentStatus) => {
    try {
      setSavingRemarks(true);
      // Pass current status to avoid validation error, but only update remarks
      const response = await adminAPI.reviewInternshipApplication(applicationId, { 
        status: currentStatus || 'submitted', // Pass current status to avoid validation error
        adminRemarks: remarks 
      });
      if (response.success) {
        toast.success('Remarks saved successfully');
        await loadAllData();
        setEditingRemarks({ id: null, type: null, value: '' });
      } else {
        throw new Error(response.message || 'Failed to save remarks');
      }
    } catch (error) {
      console.error('Failed to save remarks:', error);
      toast.error(`Failed to save remarks: ${error.message}`);
    } finally {
      setSavingRemarks(false);
    }
  };

  // Render editable remarks cell
  const renderRemarksCell = (id, type, currentValue) => {
    const isEditing = editingRemarks.id === id && editingRemarks.type === type;
    const canEdit = !!id; // Only allow editing if ID exists
    
    if (isEditing) {
      return (
        <td className="px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editingRemarks.value}
              onChange={(e) => setEditingRemarks({ ...editingRemarks, value: e.target.value })}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
              disabled={!canEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canEdit) {
                  if (type === 'project') {
                    handleSaveProjectRemarks(id, editingRemarks.value);
                  } else if (type === 'internship') {
                    // Get current status from the application
                    const app = sixMonthApplications.find(a => a._id === id) || summerApplications.find(a => a._id === id);
                    handleSaveInternshipRemarks(id, editingRemarks.value, app?.status);
                  }
                } else if (e.key === 'Escape') {
                  handleCancelEditRemarks();
                }
              }}
            />
            <button
              onClick={() => {
                if (canEdit) {
                  if (type === 'project') {
                    handleSaveProjectRemarks(id, editingRemarks.value);
                  } else if (type === 'internship') {
                    // Get current status from the application
                    const app = sixMonthApplications.find(a => a._id === id) || summerApplications.find(a => a._id === id);
                    handleSaveInternshipRemarks(id, editingRemarks.value, app?.status);
                  }
                }
              }}
              disabled={savingRemarks || !canEdit}
              className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              title={!canEdit ? (type === 'project' ? 'Project not found. Cannot save remarks.' : 'Application not found. Cannot save remarks.') : ''}
            >
              {savingRemarks ? '...' : '✓'}
            </button>
            <button
              onClick={handleCancelEditRemarks}
              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              ✕
            </button>
          </div>
          {!canEdit && (
            <div className="mt-1 text-xs text-red-600">
              {type === 'project' ? 'Project not found. Cannot save remarks.' : 'Application not found. Cannot save remarks.'}
            </div>
          )}
        </td>
      );
    }
    
    return (
      <td 
        className={`px-3 py-2 text-sm text-gray-900 min-w-[150px] ${
          canEdit ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-60'
        }`}
        onClick={() => {
          if (canEdit) {
            handleStartEditRemarks(id, type, currentValue);
          } else {
            toast.error(type === 'project' ? 'Project not found. Cannot edit remarks.' : 'Application not found. Cannot edit remarks.');
          }
        }}
        title={canEdit ? 'Click to edit remarks' : (type === 'project' ? 'Project not found. Cannot edit remarks.' : 'Application not found. Cannot edit remarks.')}
      >
        {currentValue || (
          <span className={canEdit ? 'text-gray-400 italic' : 'text-gray-300 italic'}>
            {canEdit ? 'Click to add remarks' : (type === 'project' ? 'Project not found' : 'Application not found')}
          </span>
        )}
      </td>
    );
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

  const getStudentType = (student) => {
    // Match backend logic: Type 1 = completed 6-month internship in Sem 7
    // Type 2 = did coursework in Sem 7
    const sem7Selection = student.semesterSelections?.find(s => s.semester === 7);
    if (!sem7Selection) {
      return null; // Cannot determine type without Sem 7 selection
    }
    
    // Type 1: Completed 6-month internship in Sem 7
    if (sem7Selection.finalizedTrack === 'internship' && 
        sem7Selection.internshipOutcome === 'verified_pass') {
      return 'type1';
    }
    
    // Type 2: Did coursework in Sem 7
    if (sem7Selection.finalizedTrack === 'coursework') {
      return 'type2';
    }
    
    return null; // Unknown type
  };

  const getStudentTypeLabel = (studentType) => {
    if (studentType === 'type1') {
      return 'Type 1';
    }
    if (studentType === 'type2') {
      return 'Type 2';
    }
    return 'Unknown';
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
      active: { status: 'success', text: 'Active' },
      faculty_allocated: { status: 'success', text: 'Allocated' },
      completed: { status: 'success', text: 'Completed' },
      registered: { status: 'warning', text: 'Registered' },
      cancelled: { status: 'error', text: 'Cancelled' }
    };
    const config = statusMap[status] || { status: 'warning', text: toTitleCase(status || 'Unknown') };
    return <StatusBadge status={config.status} text={config.text} />;
  };

  const renderTrackLabel = (track, studentType, majorProject2 = [], internship2 = []) => {
    if (!track) {
      if (studentType === 'type1') {
        return <span className="text-sm text-gray-500">Auto-enrolled (Coursework)</span>;
      }
      return <span className="text-sm text-gray-500">Not submitted</span>;
    }

    // For Type 1 students with coursework track, always show "Coursework"
    if (studentType === 'type1' && (track === 'coursework' || track === 'major2')) {
      return (
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500/70" />
          <span className="text-sm font-medium text-gray-900">Coursework</span>
        </div>
      );
    }

    // For Type 2, convert 'coursework' to 'major2' for display
    const displayTrack = (track === 'coursework' && studentType === 'type2') ? 'major2' : track;

    // Determine if Major Project 2 is solo or group
    const major2Project = majorProject2 && majorProject2.length > 0 ? majorProject2[0] : null;
    const isMajor2Group = major2Project?.group ? true : false;
    const isMajor2Solo = major2Project && !major2Project.group;

    // Determine if Internship 2 exists (always solo)
    const hasInternship2 = internship2 && internship2.length > 0;

    let config;
    if (displayTrack === 'major2' || displayTrack === 'coursework') {
      // For Major Project 2, show different labels and colors for solo vs group
      if (isMajor2Group) {
        config = { color: 'bg-indigo-500/70', label: 'Major Project 1 (Group)' };
      } else if (isMajor2Solo) {
        config = { color: 'bg-purple-500/70', label: 'Major Project 2 (Solo)' };
      } else {
        // No project registered yet, show default
        config = { color: 'bg-indigo-500/70', label: 'Major Project 2 Track' };
      }
    } else {
      // For Internship track, show Internship 1 (Solo) if project exists
      if (hasInternship2) {
        config = { color: 'bg-emerald-500/70', label: 'Internship 1 (Solo)' };
      } else {
        config = { color: 'bg-emerald-500/70', label: '6-Month Internship Track' };
      }
    }

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

  const renderApplicationStatus = (application, emptyLabel) => {
    if (!application) {
      // If it's an expected field (can be chosen by student), show "Not started" in red
      if (emptyLabel === 'No submission yet' || emptyLabel === 'Not submitted') {
        return <StatusBadge status="error" text="Not Started" />;
      }
      return <span className="text-sm text-gray-500">{emptyLabel}</span>;
    }

    const statusMap = {
      verified_pass: { status: 'success', text: 'Verified (Pass)' },
      submitted: { status: 'warning', text: 'Submitted' },
      pending_verification: { status: 'warning', text: 'Pending Verification' },
      needs_info: { status: 'warning', text: 'Needs Info' },
      verified_fail: { status: 'error', text: 'Verified (Fail)' },
      absent: { status: 'error', text: 'Absent' }
    };

    const statusConfig = statusMap[application.status] || {
      status: 'warning',
      text: toTitleCase(application.status || 'Unknown')
    };

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
      if (emptyLabel === 'Not applicable') {
        return <span className="text-sm text-gray-500">Not applicable</span>;
      }
      if (emptyLabel === 'Track pending') {
        return <span className="text-sm text-gray-500">Track pending</span>;
      }
      // If it's an expected field (can be chosen by student), show "Not started" in red
      if (emptyLabel === 'Not registered') {
        return <StatusBadge status="error" text="Not Started" />;
      }
      return <span className="text-sm text-gray-500">{emptyLabel}</span>;
    }

    const project = projects[0];
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

  // Group 6-month applications by student
  const applicationsByStudent = useMemo(() => {
    const map = new Map();
    sixMonthApplications.forEach(app => {
      const studentId = (app.student?._id || app.student || '').toString();
      if (!studentId) return;
      if (!map.has(studentId)) {
        map.set(studentId, []);
      }
      map.get(studentId).push(app);
    });
    return map;
  }, [sixMonthApplications]);

  // Group summer applications by student
  const summerApplicationsByStudent = useMemo(() => {
    const map = new Map();
    summerApplications.forEach(app => {
      const studentId = (app.student?._id || app.student || '').toString();
      if (!studentId) return;
      if (!map.has(studentId)) {
        map.set(studentId, []);
      }
      map.get(studentId).push(app);
    });
    return map;
  }, [summerApplications]);

  // Group Major Project 2 by student
  const majorProject2ByStudent = useMemo(() => {
    const map = new Map();
    const addStudentProject = (studentRef, project) => {
      const studentId = (studentRef?._id || studentRef || '').toString();
      if (!studentId) return;
      if (!map.has(studentId)) {
        map.set(studentId, []);
      }
      map.get(studentId).push(project);
    };

    majorProject2Projects.forEach(project => {
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
  }, [majorProject2Projects]);

  // Group Internship 2 by student
  const internship2ByStudent = useMemo(() => {
    const map = new Map();
    internship2Projects.forEach(project => {
      const studentId = (project.student?._id || project.student || '').toString();
      if (!studentId) return;
      if (!map.has(studentId)) {
        map.set(studentId, []);
      }
      map.get(studentId).push(project);
    });
    return map;
  }, [internship2Projects]);

  const getLatestApplication = (studentId, type = '6month') => {
    if (!studentId) return null;
    const apps = type === '6month'
      ? (applicationsByStudent.get(studentId.toString()) || [])
      : (summerApplicationsByStudent.get(studentId.toString()) || []);
    if (!apps.length) return null;
    apps.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    return apps[0];
  };

  // Filter students based on active tab
  const filteredStudents = useMemo(() => {
    let students = [...sem8Students];
    
    if (activeTab === 'type1') {
      students = students.filter(s => getStudentType(s) === 'type1');
    } else if (activeTab === 'type2') {
      students = students.filter(s => getStudentType(s) === 'type2');
    }
    
    // Filter out students with unknown types for type1/type2 tabs
    if (activeTab === 'type1' || activeTab === 'type2') {
      students = students.filter(s => getStudentType(s) !== null);
    }
    
    // Sort by email
    students.sort((a, b) => {
      const emailA = (a.collegeEmail || '').toLowerCase();
      const emailB = (b.collegeEmail || '').toLowerCase();
      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }
      const misA = a.misNumber || '';
      const misB = b.misNumber || '';
      return misA.localeCompare(misB);
    });
    
    return students;
  }, [sem8Students, activeTab]);

  // Filter Major Project 2 (Group) projects
  const filteredMajorProject2Group = useMemo(() => {
    if (activeTab === 'major2-group') {
      const groupProjects = majorProject2Projects.filter(p => p.group);
      return groupProjects.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    }
    return [];
  }, [majorProject2Projects, activeTab]);

  // Filter Major Project 2 (Solo) projects
  const filteredMajorProject2Solo = useMemo(() => {
    if (activeTab === 'major2-solo') {
      const soloProjects = majorProject2Projects.filter(p => !p.group);
      return soloProjects.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    }
    return [];
  }, [majorProject2Projects, activeTab]);

  // Filter Internship 2 (Project under Faculty) projects
  const filteredInternship2Faculty = useMemo(() => {
    if (activeTab === 'internship2-faculty') {
      return [...internship2Projects].sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    }
    return [];
  }, [internship2Projects, activeTab]);

  // Filter Internship 2 (Under Company) - Summer Applications
  const filteredInternship2Company = useMemo(() => {
    if (activeTab === 'internship2-company') {
      return [...summerApplications].sort((a, b) => {
        const emailA = (a.student?.collegeEmail || '').toLowerCase();
        const emailB = (b.student?.collegeEmail || '').toLowerCase();
        return emailA.localeCompare(emailB);
      });
    }
    return [];
  }, [summerApplications, activeTab]);

  // Filter 6-month applications
  const filtered6MonthApps = useMemo(() => {
    if (activeTab === '6month') {
      return [...sixMonthApplications].sort((a, b) => {
        const emailA = (a.student?.collegeEmail || '').toLowerCase();
        const emailB = (b.student?.collegeEmail || '').toLowerCase();
        return emailA.localeCompare(emailB);
      });
    }
    return [];
  }, [sixMonthApplications, activeTab]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Semester 8 Review & Management</h1>
          <p className="text-gray-600 mb-4">
            Comprehensive review and management of Type 1 and Type 2 students, track choices, Major Project 2, Internship 2, and 6-month internship applications
          </p>
          {/* Note explaining Type 1 and Type 2 */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Student Types</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p><strong>Type 1:</strong> Students who completed a 6-month internship in Semester 7</p>
                  <p className="mt-1"><strong>Type 2:</strong> Students who did coursework in Semester 7</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Organized by Categories */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Student Views Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Student Views</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'all'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All Students ({sem8Students.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('type1')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'type1'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Type 1 ({sem8Students.filter(s => getStudentType(s) === 'type1').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('type2')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'type2'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Type 2 ({sem8Students.filter(s => getStudentType(s) === 'type2').length})
                  </button>
                </div>
              </div>

              {/* Projects Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Projects</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('major2-group')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'major2-group'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Major Project 2 (Group) ({majorProject2Projects.filter(p => p.group).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('major2-solo')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'major2-solo'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Major Project 2 (Solo) ({majorProject2Projects.filter(p => !p.group).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('internship2-faculty')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'internship2-faculty'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Internship 2 (Project under Faculty) ({internship2Projects.length})
                  </button>
                </div>
              </div>

              {/* Internships Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Internships</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('internship2-company')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'internship2-company'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Internship 2 (Under Company) ({summerApplications.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('6month')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === '6month'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    6-Month Internship ({sixMonthApplications.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading data...</span>
          </div>
        ) : (
          <>
            {/* All Students / Type 1 / Type 2 Tab */}
            {(activeTab === 'all' || activeTab === 'type1' || activeTab === 'type2') && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sem 7 Background</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sem 8 Track</th>
                        {activeTab !== 'type1' && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track Status</th>
                        )}
                        {activeTab !== 'type2' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2 Month Internship (Company)</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship 2 (Project under Faculty)</th>
                          </>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {activeTab === 'type1' 
                            ? 'Major Project 2 (Group)' 
                            : activeTab === 'type2' 
                            ? 'Major Project 2 (Solo)' 
                            : 'Major Project 2 (Solo/Group)'}
                        </th>
                        {activeTab !== 'type1' && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">6-Month App (Type 2)</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={
                            activeTab === 'type1' ? 6 : 
                            activeTab === 'type2' ? 5 : 
                            8
                          } className="px-4 py-8 text-center text-gray-500">
                            No students found
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => {
                          const studentId = student._id?.toString() || student.id?.toString();
                          const studentType = getStudentType(student);
                          const trackChoice = trackChoiceByStudent.get(studentId);
                          const majorProject2 = majorProject2ByStudent.get(studentId) || [];
                          const internship2 = internship2ByStudent.get(studentId) || [];
                          const sixMonthApp = getLatestApplication(studentId, '6month');
                          const summerApp = getLatestApplication(studentId, 'summer');

                          // Determine track display
                          const finalizedTrack = trackChoice?.finalizedTrack || trackChoice?.chosenTrack;
                          const displayTrack = (finalizedTrack === 'coursework' && studentType === 'type2') ? 'major2' : finalizedTrack;

                          return (
                            <tr key={studentId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                                <div className="text-sm text-gray-500">{student.misNumber} • {student.collegeEmail}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {studentType ? (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    studentType === 'type1' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {getStudentTypeLabel(studentType)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500">Unknown</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {renderTrackLabel(displayTrack, studentType, majorProject2, internship2)}
                              </td>
                              {activeTab !== 'type1' && (
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {trackChoice ? renderVerificationCell(trackChoice) : <StatusBadge status="error" text="Not Started" />}
                                </td>
                              )}
                              {activeTab !== 'type2' && (
                                <>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {studentType === 'type2' ? (
                                      <span className="text-sm text-gray-500">Not applicable</span>
                                    ) : (
                                      // For Type 1: If Internship 2 project exists, summer internship is not applicable (mutually exclusive)
                                      (internship2 && internship2.length > 0) ? (
                                        <span className="text-sm text-gray-500">Not applicable</span>
                                      ) : (
                                        <>
                                          {/* For Type 1, 2 Month Internship is always applicable (can be chosen) - show "Not Started" if not submitted */}
                                          {renderApplicationStatus(summerApp, 'Not submitted')}
                                          {summerApp && summerApp.status === 'verified_pass' && (
                                            <div className="text-xs text-gray-500 mt-1">Internship 2 not required</div>
                                          )}
                                          {summerApp && ['verified_fail', 'absent'].includes(summerApp.status) && (
                                            <div className="text-xs text-orange-600 mt-1">Internship 2 required</div>
                                          )}
                                        </>
                                      )
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {studentType === 'type2' ? (
                                      <span className="text-sm text-gray-500">Not applicable</span>
                                    ) : (
                                      // For Type 1: If summer internship application exists (has _id), Internship 2 is not applicable (mutually exclusive)
                                      (summerApp && summerApp._id) ? (
                                        <span className="text-sm text-gray-500">Not applicable</span>
                                      ) : (
                                        // For Type 1 without summer app, Internship 2 is applicable (can be chosen) - show "Not Started" if not registered
                                        renderProjectCell(
                                          internship2,
                                          'Not registered',
                                          { showFaculty: true }
                                        )
                                      )
                                    )}
                                  </td>
                                </>
                              )}
                              <td className="px-4 py-3 whitespace-nowrap">
                                {(() => {
                                  // For Type 2: If 6-month internship application exists, Major Project 2 is not applicable
                                  if (studentType === 'type2' && sixMonthApp) {
                                    return <span className="text-sm text-gray-500">Not applicable</span>;
                                  }
                                  
                                  // Determine if Major Project 2 is applicable
                                  // For Type 1: Always applicable (they do coursework/Major Project 2)
                                  // For Type 2: Always applicable as a potential choice (unless they chose 6-month internship)
                                  const isApplicable = studentType === 'type1' || studentType === 'type2';
                                  
                                  const emptyLabel = isApplicable ? 'Not registered' : 'Not applicable';
                                  return renderProjectCell(
                                    majorProject2,
                                    emptyLabel,
                                    { showFaculty: true }
                                  );
                                })()}
                              </td>
                              {activeTab !== 'type1' && (
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {studentType === 'type2' ? (
                                    // For Type 2: If Major Project 2 project exists, 6-month internship is not applicable
                                    (majorProject2 && majorProject2.length > 0) ? (
                                      <span className="text-sm text-gray-500">Not applicable</span>
                                    ) : (
                                      // For Type 2 without Major Project 2, 6-month internship is applicable (can be chosen)
                                      renderApplicationStatus(sixMonthApp, 'No submission yet')
                                    )
                                  ) : (
                                    <span className="text-sm text-gray-500">Not applicable</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Major Project 2 (Group) Tab */}
            {activeTab === 'major2-group' && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Timestamp</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated Faculty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                        {/* Dynamic columns for up to 5 members */}
                        {[1, 2, 3, 4, 5].map((num) => (
                          <React.Fragment key={num}>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Member {num}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              MIS {num}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contact {num}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Branch {num}
                            </th>
                          </React.Fragment>
                        ))}
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        {/* Dynamic columns for faculty preferences */}
                        {Array.from({ length: maxFacultyPreferences }, (_, i) => i + 1).map((num) => (
                          <th key={num} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supervisor {num}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMajorProject2Group.length === 0 ? (
                        <tr>
                          <td colSpan={6 + (5 * 4) + maxFacultyPreferences} className="px-4 py-8 text-center text-gray-500">
                            No Major Project 2 (Group) projects found
                          </td>
                        </tr>
                      ) : (
                        filteredMajorProject2Group.map((project) => {
                          const members = project.group?.members || [];
                          const timestamp = project.createdAt ? formatDateTime(project.createdAt) : '-';
                          
                          // Get faculty preferences from project
                          // For group projects, preferences are stored in project.facultyPreferences
                          const facultyPrefs = project.facultyPreferences || [];
                          
                          // Sort preferences by priority (priority is 1-indexed)
                          const sortedPrefs = [...facultyPrefs].sort((a, b) => {
                            const priorityA = a.priority || (facultyPrefs.indexOf(a) + 1);
                            const priorityB = b.priority || (facultyPrefs.indexOf(b) + 1);
                            return priorityA - priorityB;
                          });

                          return (
                            <tr key={project._id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                                {timestamp}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.faculty?.fullName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.faculty?.department || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                {project.title || '-'}
                              </td>
                              {/* Render up to 5 members */}
                              {[0, 1, 2, 3, 4].map((idx) => {
                                const member = members[idx];
                                
                                return (
                                  <React.Fragment key={idx}>
                                    <td className="px-3 py-2 text-sm text-gray-900">
                                      {member?.student?.fullName || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900">
                                      {member?.student?.misNumber || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900">
                                      {member?.student?.contactNumber || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-900">
                                      {member?.student?.branch || '-'}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {getProjectStatusBadge(project.status)}
                              </td>
                              {/* Render faculty preferences - use calculated max to show all available columns */}
                              {Array.from({ length: maxFacultyPreferences }, (_, i) => i + 1).map((num) => {
                                const pref = sortedPrefs[num - 1];
                                return (
                                  <td key={num} className="px-3 py-2 text-sm text-gray-900">
                                    {pref?.faculty?.fullName || '-'}
                                  </td>
                                );
                              })}
                              {renderRemarksCell(project._id, 'project', project.feedback)}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Major Project 2 (Solo) Tab */}
            {activeTab === 'major2-solo' && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Timestamp</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated Faculty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MIS</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        {/* Dynamic columns for faculty preferences */}
                        {Array.from({ length: maxFacultyPreferences }, (_, i) => i + 1).map((num) => (
                          <th key={num} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supervisor {num}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMajorProject2Solo.length === 0 ? (
                        <tr>
                          <td colSpan={11 + maxFacultyPreferences} className="px-4 py-8 text-center text-gray-500">
                            No Major Project 2 (Solo) projects found
                          </td>
                        </tr>
                      ) : (
                        filteredMajorProject2Solo.map((project) => {
                          const timestamp = project.createdAt ? formatDateTime(project.createdAt) : '-';
                          
                          // Get faculty preferences from project
                          const facultyPrefs = project.facultyPreferences || [];
                          
                          // Sort preferences by priority (priority is 1-indexed)
                          const sortedPrefs = [...facultyPrefs].sort((a, b) => {
                            const priorityA = a.priority || (facultyPrefs.indexOf(a) + 1);
                            const priorityB = b.priority || (facultyPrefs.indexOf(b) + 1);
                            return priorityA - priorityB;
                          });

                          return (
                            <tr key={project._id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                                {timestamp}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.faculty?.fullName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.faculty?.department || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                {project.title || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.fullName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.misNumber || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.collegeEmail || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.contactNumber || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.branch || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {getProjectStatusBadge(project.status)}
                              </td>
                              {/* Render faculty preferences - use calculated max to show all available columns */}
                              {Array.from({ length: maxFacultyPreferences }, (_, i) => i + 1).map((num) => {
                                const pref = sortedPrefs[num - 1];
                                return (
                                  <td key={num} className="px-3 py-2 text-sm text-gray-900">
                                    {pref?.faculty?.fullName || '-'}
                                  </td>
                                );
                              })}
                              {renderRemarksCell(project._id, 'project', project.feedback)}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Internship 2 (Project under Faculty) Tab */}
            {activeTab === 'internship2-faculty' && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Timestamp</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated Faculty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MIS</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        {/* Dynamic columns for faculty preferences */}
                        {Array.from({ length: maxFacultyPreferences }, (_, i) => i + 1).map((num) => (
                          <th key={num} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supervisor {num}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredInternship2Faculty.length === 0 ? (
                        <tr>
                          <td colSpan={10 + maxFacultyPreferences} className="px-4 py-8 text-center text-gray-500">
                            No Internship 2 (Project under Faculty) found
                          </td>
                        </tr>
                      ) : (
                        filteredInternship2Faculty.map((project) => {
                          const timestamp = project.createdAt ? formatDateTime(project.createdAt) : '-';
                          
                          // Get faculty preferences from project
                          const facultyPrefs = project.facultyPreferences || [];
                          
                          // Sort preferences by priority (priority is 1-indexed)
                          const sortedPrefs = [...facultyPrefs].sort((a, b) => {
                            const priorityA = a.priority || (facultyPrefs.indexOf(a) + 1);
                            const priorityB = b.priority || (facultyPrefs.indexOf(b) + 1);
                            return priorityA - priorityB;
                          });

                          return (
                            <tr key={project._id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                                {timestamp}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.faculty?.fullName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.faculty?.department || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                {project.title || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.fullName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.misNumber || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.collegeEmail || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.contactNumber || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {project.student?.branch || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {getProjectStatusBadge(project.status)}
                              </td>
                              {/* Render faculty preferences - use calculated max to show all available columns */}
                              {Array.from({ length: maxFacultyPreferences }, (_, i) => i + 1).map((num) => {
                                const pref = sortedPrefs[num - 1];
                                return (
                                  <td key={num} className="px-3 py-2 text-sm text-gray-900">
                                    {pref?.faculty?.fullName || '-'}
                                  </td>
                                );
                              })}
                              {renderRemarksCell(project._id, 'project', project.feedback)}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Internship 2 (Under Company) Tab */}
            {activeTab === 'internship2-company' && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">S.No.</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MIS No.</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact No.</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship-I Details</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Contact</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nature of Work</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stipend/Salary?</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Stipend (Rs.)</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredInternship2Company.length === 0 ? (
                        <tr>
                          <td colSpan="20" className="px-4 py-8 text-center text-gray-500">
                            No Internship 2 (Under Company) applications found
                          </td>
                        </tr>
                      ) : (
                        filteredInternship2Company.map((app, index) => {
                          const formatDate = (date) => {
                            if (!date) return '-';
                            try {
                              return new Date(date).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              });
                            } catch {
                              return '-';
                            }
                          };

                          const internship1Details = app.previousInternship1Track 
                            ? app.previousInternship1Track === 'project' 
                              ? 'Project under Faculty' 
                              : 'Application (Company)'
                            : '-';

                          return (
                            <tr key={app._id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {app.student?.collegeEmail || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.student?.fullName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.student?.misNumber || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.student?.contactNumber || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.student?.branch || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {internship1Details}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.companyName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {formatDate(app.details?.startDate)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {formatDate(app.details?.endDate)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.completionCertificateLink ? (
                                  <a 
                                    href={app.details.completionCertificateLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    View Certificate
                                  </a>
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.mentorName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.mentorPhone || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.mentorEmail || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.roleOrNatureOfWork || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.hasStipend === 'yes' ? 'Yes' : app.details?.hasStipend === 'no' ? 'No' : '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.stipendRs || app.details?.stipendRs === 0 ? `₹${app.details.stipendRs}` : '-'}
                              </td>
                              {renderRemarksCell(app._id, 'internship', app.adminRemarks)}
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {getStatusBadge(app.status)}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium sticky right-0 bg-white z-10">
                                <button
                                  onClick={() => handleReview(app)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Review
                                </button>
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

            {/* 6-Month Applications Tab */}
            {activeTab === '6month' && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Timestamp</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MIS No.</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact No.</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internship-I Details</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Letter</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Contact</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nature of Work</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stipend/Salary?</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Stipend (Rs.)</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Remarks</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filtered6MonthApps.length === 0 ? (
                        <tr>
                          <td colSpan="20" className="px-4 py-8 text-center text-gray-500">
                            No 6-month internship applications found
                          </td>
                        </tr>
                      ) : (
                        filtered6MonthApps.map((app) => {
                          const formatDate = (date) => {
                            if (!date) return '-';
                            try {
                              return new Date(date).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              });
                            } catch {
                              return '-';
                            }
                          };

                          const internship1Details = app.previousInternship1Track 
                            ? app.previousInternship1Track === 'project' 
                              ? 'Project under Faculty' 
                              : 'Application (Company)'
                            : '6-Month Internship';

                          return (
                            <tr key={app._id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                                {app.createdAt ? formatDateTime(app.createdAt) : '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {app.student?.collegeEmail || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.student?.fullName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.student?.misNumber || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.student?.contactNumber || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.student?.branch || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {internship1Details}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.companyName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {formatDate(app.details?.startDate)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {formatDate(app.details?.endDate)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.offerLetterLink ? (
                                  <a 
                                    href={app.details.offerLetterLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    View Offer Letter
                                  </a>
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.mentorName || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.mentorPhone || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.mentorEmail || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.roleOrNatureOfWork || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.hasStipend === 'yes' ? 'Yes' : app.details?.hasStipend === 'no' ? 'No' : '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {app.details?.stipendRs !== undefined && app.details?.stipendRs !== null ? `₹${app.details.stipendRs}` : '-'}
                              </td>
                              {renderRemarksCell(app._id, 'internship', app.adminRemarks)}
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {getStatusBadge(app.status)}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium sticky right-0 bg-white z-10">
                                <button
                                  onClick={() => handleReview(app)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Review
                                </button>
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
          </>
        )}

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
                          {selectedItem.type === '6month' ? '6-Month Internship' : selectedItem.type === 'summer' ? 'Summer Internship' : 'Internship Application'}
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
                          {selectedItem.details?.startDate ? new Date(selectedItem.details.startDate).toLocaleDateString('en-IN') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">End Date</p>
                        <p className="text-sm text-gray-900">
                          {selectedItem.details?.endDate ? new Date(selectedItem.details.endDate).toLocaleDateString('en-IN') : 'N/A'}
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
                            ? (selectedItem.details.stipendRs?.toLocaleString('en-IN') || '0') 
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

export default Sem8Review;

