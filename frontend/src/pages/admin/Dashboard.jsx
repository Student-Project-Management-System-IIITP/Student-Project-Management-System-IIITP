import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, adminAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
// eslint-disable-next-line no-unused-vars
import { formatFacultyName } from '../../utils/formatUtils';
import { FiSettings, FiCalendar, FiUsers, FiUserCheck, FiFolder, FiUserPlus, FiBarChart2, FiClipboard, FiTarget, FiEye, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';

// Helper to compute default password from a name: alpha-only, capitalize first letter, append @iiitp
const computeDefaultPassword = (name) => {
  const onlyAlpha = (name || '').replace(/[^a-zA-Z]/g, '');
  const lower = onlyAlpha.toLowerCase();
  const capitalized = lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : '';
  return `${capitalized}@iiitp`;
};

const AdminDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [activeProgram, setActiveProgram] = useState('B.Tech');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    department: 'CSE',
    designation: 'Department Admin'
  });

  // Add Faculty modal state
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  const [isSubmittingFaculty, setIsSubmittingFaculty] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    prefix: '',
    email: '',
    phone: '',
    department: 'CSE',
    mode: 'Regular',
    designation: 'Assistant Professor'
  });

  // Sem 4 specific state
  const [sem4Stats, setSem4Stats] = useState({
    totalProjects: 0,
    registeredProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    evaluationScheduled: false,
    pendingEvaluations: 0
  });
  
  // Sem 5 specific state
  const [sem5Stats, setSem5Stats] = useState({
    totalGroups: 0,
    formedGroups: 0,
    allocatedGroups: 0,
    unallocatedGroups: 0,
    totalStudents: 0,
    registeredProjects: 0
  });
  // eslint-disable-next-line no-unused-vars
  const [sem5Groups, setSem5Groups] = useState([]);


  // M.Tech Sem 1 specific state
  const [mtechSem1Stats, setMtechSem1Stats] = useState({
    totalStudents: 0,
    registeredProjects: 0,
    facultyAllocated: 0,
    pendingAllocations: 0,
    unregisteredStudents: 0,
    registrationRate: 0
  });

  // M.Tech Sem 2 specific state
  const [mtechSem2Stats, setMtechSem2Stats] = useState({
    totalStudents: 0,
    registeredProjects: 0,
    facultyAllocated: 0,
    pendingAllocations: 0,
    unregisteredStudents: 0,
    registrationRate: 0
  });

  // Sem 6 specific state
  const [sem6Stats, setSem6Stats] = useState({
    totalSem5Groups: 0,
    totalProjects: 0,
    registeredProjects: 0,
    notRegistered: 0,
    continuationProjects: 0,
    newProjects: 0,
    registrationRate: 0
  });
  // eslint-disable-next-line no-unused-vars
  const [sem6RegisteredGroups, setSem6RegisteredGroups] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [sem6NonRegisteredGroups, setSem6NonRegisteredGroups] = useState([]);

  
  // Sem 7 specific state
  const [sem7Stats, setSem7Stats] = useState({
    totalTrackChoices: 0,
    pendingTrackChoices: 0,
    approvedTrackChoices: 0,
    internshipTrackChoices: 0,
    courseworkTrackChoices: 0,
    totalInternshipApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    sixMonthApplications: 0,
    summerApplications: 0
  });
  const [mtechSem3Stats, setMtechSem3Stats] = useState({
    totalStudents: 0,
    internshipTrack: 0,
    majorProjectTrack: 0,
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    needsInfo: 0
  });
  
  // Sem 8 specific state
  const [sem8Stats, setSem8Stats] = useState({
    totalStudents: 0,
    type1Students: 0,
    type2Students: 0,
    totalTrackChoices: 0,
    pendingTrackChoices: 0,
    approvedTrackChoices: 0,
    major2TrackChoices: 0,
    internshipTrackChoices: 0,
    totalMajorProject2: 0,
    groupMajorProject2: 0,
    soloMajorProject2: 0,
    totalInternship2: 0,
    total6MonthApplications: 0,
    pending6MonthApplications: 0,
    verifiedPass6Month: 0
  });
  
  const [loading, setLoading] = useState(true);

  const defaultPassword = useMemo(() => computeDefaultPassword(form.name), [form.name]);
  
  const facultyDefaultPassword = useMemo(() => computeDefaultPassword(facultyForm.name), [facultyForm.name]);

  const [btechLoading, setBtechLoading] = useState(true);
  const [mtechLoading, setMtechLoading] = useState(true);
  const [btechLoaded, setBtechLoaded] = useState(false);
  const [mtechLoaded, setMtechLoaded] = useState(false);

  const loadBTechData = useCallback(async () => {
    if (btechLoaded) return;
    try {
      setBtechLoading(true);
      const [
        sem4ProjectsResult, sem4UnregResult,
        sem5StatsResult, sem5GroupsResult,
        sem6StatsResult, sem6RegResult, sem6NonRegResult,
        sem7TrackChoicesResult, sem7InternshipAppsResult,
        sem8StudentsResult, sem8TrackChoicesResult, sem8Major2Result, sem8Internship2Result, sem8ApplicationsResult
      ] = await Promise.allSettled([
        adminAPI.getSem4Projects(),
        adminAPI.getUnregisteredSem4Students(),
        adminAPI.getSem5Statistics(),
        adminAPI.getGroups({ semester: 5 }),
        adminAPI.getSem6Statistics(),
        adminAPI.getSem6Registrations({}),
        adminAPI.getSem6NonRegisteredGroups({}),
        adminAPI.listSem7TrackChoices(),
        adminAPI.listInternshipApplications(),
        adminAPI.getStudentsBySemester({ semester: 8 }),
        adminAPI.listSem8TrackChoices(),
        adminAPI.getProjects({ semester: 8, projectType: 'major2' }),
        adminAPI.getProjects({ semester: 8, projectType: 'internship2' }),
        adminAPI.listInternshipApplications({ semester: 8 })
      ]);

      if (sem4ProjectsResult.status === 'fulfilled' && sem4UnregResult.status === 'fulfilled') {
        const projects = sem4ProjectsResult.value.data || [];
        const minorProject1Projects = projects.filter(p => p.projectType === 'minor1');
        const unregisteredStudents = sem4UnregResult.value.data?.length || 0;
        setSem4Stats({
          totalProjects: minorProject1Projects.length,
          registeredProjects: minorProject1Projects.length,
          unregisteredStudents,
          registrationRate: minorProject1Projects.length > 0 ? (minorProject1Projects.length / (minorProject1Projects.length + unregisteredStudents) * 100).toFixed(1) : 0
        });
      }

      if (sem5StatsResult.status === 'fulfilled') {
        const stats = sem5StatsResult.value.data || {};
        setSem5Stats({
          totalGroups: stats.totalGroups || 0, formedGroups: stats.formedGroups || 0, allocatedGroups: stats.allocatedGroups || 0, unallocatedGroups: stats.unallocatedGroups || 0, totalStudents: stats.totalStudents || 0, registeredProjects: stats.registeredProjects || 0
        });
      }

      if (sem5GroupsResult.status === 'fulfilled') setSem5Groups(sem5GroupsResult.value.data || []);

      if (sem6StatsResult.status === 'fulfilled') {
        const stats = sem6StatsResult.value.data || {};
        setSem6Stats({
          totalSem5Groups: stats.totalSem5Groups || 0, totalProjects: stats.totalProjects || 0, registeredProjects: stats.registeredProjects || 0, notRegistered: stats.notRegistered || 0, continuationProjects: stats.continuationProjects || 0, newProjects: stats.newProjects || 0, registrationRate: stats.registrationRate || 0
        });
      }

      if (sem6RegResult.status === 'fulfilled') {
        const registeredProjects = sem6RegResult.value.data || [];
        setSem6RegisteredGroups(registeredProjects.filter(p => p.groupId).map(p => ({
          _id: p.groupId, name: p.groupName || `Group ${p.groupId.slice(-6)}`,
          project: { _id: p._id, title: p.projectTitle, projectType: 'minor3', status: p.status, description: p.description || '', isContinuation: p.isContinuation || false },
          isContinuation: p.isContinuation || false, members: [],
          allocatedFaculty: p.allocatedFaculty && p.allocatedFaculty !== 'Not Allocated' ? { fullName: p.allocatedFaculty, department: p.facultyDepartment || 'N/A' } : null,
          maxMembers: 5
        })));
      }

      if (sem6NonRegResult.status === 'fulfilled') setSem6NonRegisteredGroups(sem6NonRegResult.value.data || []);

      if (sem7TrackChoicesResult.status === 'fulfilled' && sem7InternshipAppsResult.status === 'fulfilled') {
        const trackChoices = sem7TrackChoicesResult.value.data || [];
        const applications = sem7InternshipAppsResult.value.data || [];
        setSem7Stats({
          totalTrackChoices: trackChoices.length,
          pendingTrackChoices: trackChoices.filter(tc => !tc.finalizedTrack || tc.verificationStatus === 'pending').length,
          approvedTrackChoices: trackChoices.filter(tc => tc.verificationStatus === 'approved').length,
          internshipTrackChoices: trackChoices.filter(tc => tc.finalizedTrack === 'internship' || tc.chosenTrack === 'internship').length,
          courseworkTrackChoices: trackChoices.filter(tc => tc.finalizedTrack === 'coursework' || tc.chosenTrack === 'coursework').length,
          totalInternshipApplications: applications.length,
          pendingApplications: applications.filter(app => app.status === 'pending').length,
          approvedApplications: applications.filter(app => app.status === 'approved').length,
          sixMonthApplications: applications.filter(app => app.type === '6month').length,
          summerApplications: applications.filter(app => app.type === 'summer').length
        });
      }

      if (sem8StudentsResult.status === 'fulfilled' && sem8TrackChoicesResult.status === 'fulfilled' && sem8Major2Result.status === 'fulfilled' && sem8Internship2Result.status === 'fulfilled' && sem8ApplicationsResult.status === 'fulfilled') {
        const students = sem8StudentsResult.value.success ? (sem8StudentsResult.value.data || []) : [];
        const trackChoices = sem8TrackChoicesResult.value.success ? (sem8TrackChoicesResult.value.data || []) : [];
        const majorProject2Projects = sem8Major2Result.value.success ? (sem8Major2Result.value.data || []) : [];
        const internship2Projects = sem8Internship2Result.value.success ? (sem8Internship2Result.value.data || []) : [];
        const allApplications = sem8ApplicationsResult.value.success ? (sem8ApplicationsResult.value.data || []) : [];
        const sixMonthApps = allApplications.filter(app => app.type === '6month');

        const type1Count = students.filter(s => {
          const sem7Selection = s.semesterSelections?.find(sel => sel.semester === 7);
          return sem7Selection?.finalizedTrack === 'internship' && sem7Selection?.internshipOutcome === 'verified_pass';
        }).length;
        const type2Count = students.filter(s => {
          const sem7Selection = s.semesterSelections?.find(sel => sel.semester === 7);
          return sem7Selection?.finalizedTrack === 'coursework';
        }).length;

        const major2Choices = trackChoices.filter(tc => {
          const track = tc.finalizedTrack || tc.chosenTrack;
          return (track === 'coursework' && tc.studentType === 'type2') || track === 'major2';
        }).length;
        const internshipChoices = trackChoices.filter(tc => {
          const track = tc.finalizedTrack || tc.chosenTrack;
          return track === 'internship';
        }).length;

        const groupMajor2 = majorProject2Projects.filter(p => !!p.group).length;
        const soloMajor2 = majorProject2Projects.filter(p => !p.group).length;

        setSem8Stats({
          totalStudents: students.length, type1Students: type1Count, type2Students: type2Count,
          totalTrackChoices: trackChoices.length, pendingTrackChoices: trackChoices.filter(tc => !tc.finalizedTrack || tc.verificationStatus === 'pending').length,
          approvedTrackChoices: trackChoices.filter(tc => tc.verificationStatus === 'approved').length, major2TrackChoices: major2Choices, internshipTrackChoices: internshipChoices,
          totalMajorProject2: majorProject2Projects.length, groupMajorProject2: groupMajor2, soloMajorProject2: soloMajor2,
          totalInternship2: internship2Projects.length, total6MonthApplications: sixMonthApps.length,
          pending6MonthApplications: sixMonthApps.filter(app => ['submitted', 'pending_verification', 'needs_info'].includes(app.status)).length,
          verifiedPass6Month: sixMonthApps.filter(app => app.status === 'verified_pass').length
        });
      }
      setBtechLoaded(true);
    } catch (error) {
      console.error('Failed to load BTech data:', error);
    } finally {
      setBtechLoading(false);
    }
  }, [btechLoaded]);

  const loadMTechData = useCallback(async () => {
    if (mtechLoaded) return;
    try {
      setMtechLoading(true);
      const [
        mtechSem1StatsResult, mtechSem2StatsResult, mtechSem3TrackChoicesResult, mtechSem3ApplicationsResult
      ] = await Promise.allSettled([
        adminAPI.getMTechSem1Statistics(),
        adminAPI.getMTechSem2Statistics(),
        adminAPI.listMTechSem3TrackChoices(),
        adminAPI.listInternshipApplications({ semester: 3 })
      ]);

      if (mtechSem1StatsResult.status === 'fulfilled') {
        const statsData = mtechSem1StatsResult.value.data || {};
        setMtechSem1Stats({
          totalStudents: statsData.totalStudents || 0, registeredProjects: statsData.registeredProjects || 0, facultyAllocated: statsData.facultyAllocated || 0, pendingAllocations: statsData.pendingAllocations || 0, unregisteredStudents: statsData.unregisteredStudents || 0, registrationRate: statsData.registrationRate || 0
        });
      }

      if (mtechSem2StatsResult.status === 'fulfilled') {
        const statsData = mtechSem2StatsResult.value.data || {};
        setMtechSem2Stats({
          totalStudents: statsData.totalStudents || 0, registeredProjects: statsData.registeredProjects || 0, facultyAllocated: statsData.facultyAllocated || 0, pendingAllocations: statsData.pendingAllocations || 0, unregisteredStudents: statsData.unregisteredStudents || 0, registrationRate: statsData.registrationRate || 0
        });
      }

      if (mtechSem3TrackChoicesResult.status === 'fulfilled' && mtechSem3ApplicationsResult.status === 'fulfilled') {
        const sem3TrackChoices = mtechSem3TrackChoicesResult.value.data || [];
        const sem3Apps = (mtechSem3ApplicationsResult.value.data || []).filter(app => app.type === '6month');
        const internshipTrack = sem3TrackChoices.filter(choice => (choice.finalizedTrack || choice.chosenTrack) === 'internship').length;
        const majorProjectTrack = sem3TrackChoices.filter(choice => (choice.finalizedTrack || choice.chosenTrack) === 'coursework').length;
        setMtechSem3Stats({
          totalStudents: sem3TrackChoices.length, internshipTrack, majorProjectTrack, totalApplications: sem3Apps.length,
          pendingApplications: sem3Apps.filter(app => ['submitted', 'pending_verification'].includes(app.status)).length,
          approvedApplications: sem3Apps.filter(app => app.status === 'verified_pass').length,
          needsInfo: sem3Apps.filter(app => app.status === 'needs_info').length
        });
      }
      setMtechLoaded(true);
    } catch (error) {
      console.error('Failed to load MTech data:', error);
    } finally {
      setMtechLoading(false);
    }
  }, [mtechLoaded]);

  useEffect(() => {
    if (activeProgram === 'B.Tech') {
      loadBTechData();
    } else if (activeProgram === 'M.Tech') {
      loadMTechData();
    }
  }, [activeProgram, loadBTechData, loadMTechData]);

  // Overall loading logic for the spinner
  useEffect(() => {
    if (activeProgram === 'B.Tech') {
        setLoading(btechLoading);
    } else {
        setLoading(mtechLoading);
    }
  }, [activeProgram, btechLoading, mtechLoading]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFacultyChange = (e) => {
    const { name, value } = e.target;
    setFacultyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const payload = {
        fullName: form.name,
        collegeEmail: form.email,
        contactNumber: form.phone,
        department: form.department,
        designation: form.designation,
        password: defaultPassword,
        confirmPassword: defaultPassword
      };

      const data = await authAPI.registerAdmin(payload);
      if (data.success) {
        alert('Admin created successfully. Default password: ' + defaultPassword);
        setIsAddOpen(false);
        setForm({ name: '', phone: '', email: '', department: 'CSE', designation: 'Department Admin' });
      } else {
        alert(data.message || 'Failed to create admin');
      }
    } catch (err) {
      const errorMessage = handleApiError(err, false);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingFaculty) return;
    try {
      setIsSubmittingFaculty(true);

      const payload = {
        fullName: facultyForm.name,
        prefix: facultyForm.prefix || '',
        department: facultyForm.department,
        mode: facultyForm.mode,
        designation: facultyForm.designation,
        collegeEmail: facultyForm.email,
        contactNumber: facultyForm.phone,
        password: facultyDefaultPassword,
        confirmPassword: facultyDefaultPassword
      };

      const data = await authAPI.registerFaculty(payload);
      if (data.success) {
        alert('Faculty created successfully. Default password: ' + facultyDefaultPassword);
        setIsAddFacultyOpen(false);
        setFacultyForm({ name: '', prefix: '', email: '', phone: '', department: 'CSE', mode: 'Regular', designation: 'Assistant Professor' });
      } else {
        alert(data.message || 'Failed to create faculty');
      }
    } catch (err) {
      const errorMessage = handleApiError(err, false);
      alert(errorMessage);
    } finally {
      setIsSubmittingFaculty(false);
    }
  };

  // Show loading screen if authentication is loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">
          Admin Dashboard
        </h1>
        <p className="text-neutral-600 mt-2">
          Welcome, {user?.name || 'Administrator'}! Manage the SPMS system
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/admin/system-config"
            className="btn-secondary flex items-center gap-2"
          >
            <FiSettings className="w-4 h-4" /> System Config
          </Link>
          <Link
            to="/admin/semester-management"
            className="btn-secondary flex items-center gap-2"
          >
            <FiCalendar className="w-4 h-4" /> Semesters
          </Link>
          <Link
            to="/admin/manage-faculty"
            className="btn-secondary flex items-center gap-2"
          >
            <FiUsers className="w-4 h-4" /> Faculty
          </Link>
          <Link
            to="/admin/manage-projects"
            className="btn-secondary flex items-center gap-2"
          >
            <FiFolder className="w-4 h-4" /> Projects
          </Link>
          <Link
            to="/admin/manage-students"
            className="btn-secondary flex items-center gap-2"
          >
            <FiUserCheck className="w-4 h-4" /> Students
          </Link>
        </div>
        
        <div className="hidden xl:block w-px h-8 bg-neutral-200 mx-1"></div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddOpen(true)}
            className="btn-primary bg-neutral-800 hover:bg-neutral-900 text-white flex items-center gap-2"
          >
            <FiUserPlus className="w-4 h-4" /> Add Admin
          </button>
          <button
            onClick={() => setIsAddFacultyOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <FiUserPlus className="w-4 h-4" /> Add Faculty
          </button>
        </div>
      </div>

      {/* Program Switcher */}
      <div className="mb-8 border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveProgram('B.Tech')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeProgram === 'B.Tech'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            B.Tech Programs
          </button>
          <button
            onClick={() => setActiveProgram('M.Tech')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeProgram === 'M.Tech'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            M.Tech Programs
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* B.TECH SECTIONS */}
          {activeProgram === 'B.Tech' && (
            <div className="space-y-8">
              {/* Sem 4 Statistics */}
              <div className="card-base border-l-4 border-l-primary-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">Semester 4 - Minor Project 1</h2>
                    <p className="text-neutral-500 text-sm mt-1">Overview of current semester Minor Project 1 projects and evaluation status</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to="/admin/sem4/registrations" className="btn-secondary text-sm flex items-center gap-2">
                      <FiBarChart2 className="w-4 h-4" /> Registrations
                    </Link>
                    <Link to="/admin/sem4/unregistered" className="btn-secondary text-sm flex items-center gap-2">
                      <FiClipboard className="w-4 h-4" /> Unregistered
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem4Stats.registeredProjects}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Registered Projects</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem4Stats.unregisteredStudents}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Unregistered</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-neutral-900">{sem4Stats.registrationRate}%</div>
                      {sem4Stats.registrationRate > 80 ? (
                        <span className="badge-success text-xs px-2 py-0.5 rounded-full">Good</span>
                      ) : (
                        <span className="badge-warning text-xs px-2 py-0.5 rounded-full">Low</span>
                      )}
                    </div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Registration Rate</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem4Stats.registeredProjects + sem4Stats.unregisteredStudents}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Total Students</div>
                  </div>
                </div>
              </div>

              {/* Sem 5 Statistics */}
              <div className="card-base border-l-4 border-l-primary-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">Semester 5 - Minor Project 2</h2>
                    <p className="text-neutral-500 text-sm mt-1">Group formation and faculty allocation overview</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to="/admin/sem5/allocated-faculty" className="btn-secondary text-sm flex items-center gap-2">
                      <FiUsers className="w-4 h-4" /> Allocation Info
                    </Link>
                    <Link to="/admin/manage-projects?semester=5" className="btn-secondary text-sm flex items-center gap-2">
                      <FiSettings className="w-4 h-4" /> Manage Groups
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem5Stats.totalGroups}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Total Groups</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem5Stats.registeredProjects}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Registered Projects</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem5Stats.allocatedGroups}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Faculty Allocated</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem5Stats.unallocatedGroups}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Pending Allocation</div>
                  </div>
                </div>
              </div>

              {/* Sem 6 Statistics */}
              <div className="card-base border-l-4 border-l-primary-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">Semester 6 - Major Project</h2>
                    <p className="text-neutral-500 text-sm mt-1">Major project registration and continuation tracking</p>
                  </div>
                  <Link to="/admin/sem6/registrations" className="btn-secondary text-sm flex items-center gap-2">
                    <FiBarChart2 className="w-4 h-4" /> Registrations
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem6Stats.totalProjects}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Registered Projects</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem6Stats.notRegistered}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Not Registered</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{sem6Stats.continuationProjects}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Continuation Projects</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-neutral-900">{sem6Stats.registrationRate}%</div>
                    </div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Registration Rate</div>
                  </div>
                </div>
              </div>

              {/* Sem 7 Statistics */}
              <div className="card-base border-l-4 border-l-primary-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">Semester 7 - Track Management</h2>
                    <p className="text-neutral-500 text-sm mt-1">Track selection, internship applications, and coursework management</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to="/admin/sem7/review" className="btn-secondary text-sm flex items-center gap-2">
                      <FiClipboard className="w-4 h-4" /> Review
                    </Link>
                    <Link to="/admin/sem7/track-choices" className="btn-secondary text-sm flex items-center gap-2">
                      <FiTarget className="w-4 h-4" /> Track Choices
                    </Link>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">Track Choices</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.totalTrackChoices}</div>
                        <div className="text-neutral-600 text-xs mt-1">Total Choices</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.pendingTrackChoices}</div>
                        <div className="text-neutral-600 text-xs mt-1">Pending</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.approvedTrackChoices}</div>
                        <div className="text-neutral-600 text-xs mt-1">Approved</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.internshipTrackChoices}</div>
                        <div className="text-neutral-600 text-xs mt-1">Internship</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.courseworkTrackChoices}</div>
                        <div className="text-neutral-600 text-xs mt-1">Coursework</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">Internship Applications</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.totalInternshipApplications}</div>
                        <div className="text-neutral-600 text-xs mt-1">Total</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.pendingApplications}</div>
                        <div className="text-neutral-600 text-xs mt-1">Pending</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.approvedApplications}</div>
                        <div className="text-neutral-600 text-xs mt-1">Approved</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.sixMonthApplications}</div>
                        <div className="text-neutral-600 text-xs mt-1">6-Month</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem7Stats.summerApplications}</div>
                        <div className="text-neutral-600 text-xs mt-1">Summer</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sem 8 Statistics */}
              <div className="card-base border-l-4 border-l-primary-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">Semester 8 - Comprehensive</h2>
                    <p className="text-neutral-500 text-sm mt-1">Type 1 & Type 2 students, Major Project 2, and internships</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to="/admin/sem8/review" className="btn-secondary text-sm flex items-center gap-2">
                      <FiClipboard className="w-4 h-4" /> Review
                    </Link>
                    <Link to="/admin/sem8/track-choices" className="btn-secondary text-sm flex items-center gap-2">
                      <FiTarget className="w-4 h-4" /> Choices
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">Student Types</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem8Stats.totalStudents}</div>
                        <div className="text-neutral-600 text-xs mt-1">Total</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem8Stats.type1Students}</div>
                        <div className="text-neutral-600 text-xs mt-1">Type 1</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem8Stats.type2Students}</div>
                        <div className="text-neutral-600 text-xs mt-1">Type 2</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">6-Month Apps (Type 2)</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem8Stats.total6MonthApplications}</div>
                        <div className="text-neutral-600 text-xs mt-1">Total</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem8Stats.pending6MonthApplications}</div>
                        <div className="text-neutral-600 text-xs mt-1">Pending</div>
                      </div>
                      <div className="bg-surface-200 rounded-lg p-3 border border-neutral-200">
                        <div className="text-xl font-bold text-neutral-900">{sem8Stats.verifiedPass6Month}</div>
                        <div className="text-neutral-600 text-xs mt-1">Verified</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* M.TECH SECTIONS */}
          {activeProgram === 'M.Tech' && (
            <div className="space-y-8">
              {/* M.Tech Sem 1 */}
              <div className="card-base border-l-4 border-l-purple-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">M.Tech Semester 1 - Minor Project 1</h2>
                    <p className="text-neutral-500 text-sm mt-1">Solo project registration and faculty allocation overview</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to="/admin/mtech/sem1/registrations" className="btn-secondary text-sm flex items-center gap-2">
                      <FiBarChart2 className="w-4 h-4" /> Registrations
                    </Link>
                    <Link to="/admin/mtech/sem1/unregistered" className="btn-secondary text-sm flex items-center gap-2">
                      <FiClipboard className="w-4 h-4" /> Unregistered
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem1Stats.totalStudents}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Total Students</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem1Stats.registeredProjects}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Registered Projects</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem1Stats.facultyAllocated}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Faculty Allocated</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem1Stats.pendingAllocations}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Pending Allocation</div>
                  </div>
                </div>
              </div>

              {/* M.Tech Sem 2 */}
              <div className="card-base border-l-4 border-l-purple-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">M.Tech Semester 2 - Minor Project 2</h2>
                    <p className="text-neutral-500 text-sm mt-1">Solo project registration and faculty allocation overview</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to="/admin/mtech/sem2/registrations" className="btn-secondary text-sm flex items-center gap-2">
                      <FiBarChart2 className="w-4 h-4" /> Registrations
                    </Link>
                    <Link to="/admin/mtech/sem2/unregistered" className="btn-secondary text-sm flex items-center gap-2">
                      <FiClipboard className="w-4 h-4" /> Unregistered
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem2Stats.totalStudents}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Total Students</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem2Stats.registeredProjects}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Registered Projects</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem2Stats.facultyAllocated}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Faculty Allocated</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem2Stats.pendingAllocations}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Pending Allocation</div>
                  </div>
                </div>
              </div>

              {/* M.Tech Sem 3 */}
              <div className="card-base border-l-4 border-l-purple-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">M.Tech Semester 3 - Track Management</h2>
                    <p className="text-neutral-500 text-sm mt-1">Track selections and 6-month internship verification</p>
                  </div>
                  <Link to="/admin/mtech/sem3/review" className="btn-secondary text-sm flex items-center gap-2">
                    <FiCheckCircle className="w-4 h-4" /> Review Applications
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem3Stats.totalStudents || 0}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Track Submissions</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem3Stats.internshipTrack || 0}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Internship Track</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem3Stats.totalApplications || 0}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Applications</div>
                  </div>
                  <div className="bg-surface-200 rounded-lg p-4 border border-neutral-200">
                    <div className="text-2xl font-bold text-neutral-900">{mtechSem3Stats.pendingApplications || 0}</div>
                    <div className="text-neutral-600 text-xs font-medium uppercase tracking-wider mt-1">Pending Reviews</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Admin</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Name</label>
                  <input name="name" value={form.name} onChange={handleChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Phone Number</label>
                  <input name="phone" value={form.phone} onChange={handleChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Department</label>
                  <select name="department" value={form.department} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="ASH">ASH</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Designation</label>
                  <select name="designation" value={form.designation} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Super Admin</option>
                    <option>Department Admin</option>
                    <option>System Admin</option>
                    <option>Academic Admin</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Generated Password</label>
                  <input value={defaultPassword} readOnly className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2" />
                  <p className="text-xs text-gray-500 mt-1">Password is generated from name by removing spaces/special characters and appending @iiitp.</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddFacultyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Faculty</h3>
              <button onClick={() => setIsAddFacultyOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleFacultySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Prefix</label>
                  <select name="prefix" value={facultyForm.prefix} onChange={handleFacultyChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">None</option>
                    <option value="Dr">Dr</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Miss">Miss</option>
                    <option value="Prof">Prof</option>
                    <option value="Ms">Ms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Name</label>
                  <input name="name" value={facultyForm.name} onChange={handleFacultyChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" value={facultyForm.email} onChange={handleFacultyChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Phone Number</label>
                  <input name="phone" value={facultyForm.phone} onChange={handleFacultyChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Department</label>
                  <select name="department" value={facultyForm.department} onChange={handleFacultyChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="ASH">ASH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Mode</label>
                  <select name="mode" value={facultyForm.mode} onChange={handleFacultyChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="Regular">Regular</option>
                    <option value="Adjunct">Adjunct</option>
                    <option value="On Lien">On Lien</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Designation</label>
                  <select name="designation" value={facultyForm.designation} onChange={handleFacultyChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option>HOD</option>
                    <option>Assistant Professor</option>
                    <option>Adjunct Assistant Professor</option>
                    <option>Assistant Registrar</option>
                    <option>TPO</option>
                    <option>Warden</option>
                    <option>Chief Warden</option>
                    <option>Associate Dean</option>
                    <option>Coordinator(PG, PhD)</option>
                    <option>Tenders/Purchase</option>
                  </select>
                </div>
                {/* Faculty ID removed per requirement */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Generated Password</label>
                  <input value={facultyDefaultPassword} readOnly className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2" />
                  <p className="text-xs text-gray-500 mt-1">Password is generated from name by removing spaces/special characters and appending @iiitp.</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddFacultyOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700">Cancel</button>
                <button type="submit" disabled={isSubmittingFaculty} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
                  {isSubmittingFaculty ? 'Creating...' : 'Create Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
