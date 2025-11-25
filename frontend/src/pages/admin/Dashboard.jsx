import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, adminAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';

// Helper to compute default password from a name: alpha-only, capitalize first letter, append @iiitp
const computeDefaultPassword = (name) => {
  const onlyAlpha = (name || '').replace(/[^a-zA-Z]/g, '');
  const lower = onlyAlpha.toLowerCase();
  const capitalized = lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : '';
  return `${capitalized}@iiitp`;
};

const AdminDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
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

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);

      const projectsResponse = await adminAPI.getSem4Projects();
      const projects = projectsResponse.data || [];
      const minorProject1Projects = projects.filter(p => p.projectType === 'minor1');

      const unregisteredResponse = await adminAPI.getUnregisteredSem4Students();
      const unregisteredStudents = unregisteredResponse.data?.length || 0;

      setSem4Stats({
        totalProjects: minorProject1Projects.length,
        registeredProjects: minorProject1Projects.length,
        unregisteredStudents,
        registrationRate: minorProject1Projects.length > 0
          ? (minorProject1Projects.length / (minorProject1Projects.length + unregisteredStudents) * 100).toFixed(1)
          : 0
      });

      try {
        setLoading(true);
        
        // Load Sem 4 projects and statistics
        const projectsResponse = await adminAPI.getSem4Projects();
        
        // Calculate Sem 4 stats for Minor Project 1 only
        const projects = projectsResponse.data || [];
        const minorProject1Projects = projects.filter(p => p.projectType === 'minor1');
        
        // Get unregistered students count
        const unregisteredResponse = await adminAPI.getUnregisteredSem4Students();
        const unregisteredStudents = unregisteredResponse.data?.length || 0;
        
        const sem4Stats = {
          totalProjects: minorProject1Projects.length,
          registeredProjects: minorProject1Projects.length,
          unregisteredStudents: unregisteredStudents,
          registrationRate: minorProject1Projects.length > 0 ? 
            (minorProject1Projects.length / (minorProject1Projects.length + unregisteredStudents) * 100).toFixed(1) : 0
        };
        
        setSem4Stats(sem4Stats);

          // Load Sem 5 statistics
        try {
          const sem5StatsResponse = await adminAPI.getSem5Statistics();
          
          // Calculate Sem 5 stats
          const sem5Stats = {
            totalGroups: sem5StatsResponse.data?.totalGroups || 0,
            formedGroups: sem5StatsResponse.data?.formedGroups || 0,
            allocatedGroups: sem5StatsResponse.data?.allocatedGroups || 0,
            unallocatedGroups: sem5StatsResponse.data?.unallocatedGroups || 0,
            totalStudents: sem5StatsResponse.data?.totalStudents || 0,
            registeredProjects: sem5StatsResponse.data?.registeredProjects || 0
          };
          
          setSem5Stats(sem5Stats);
        } catch (sem5Error) {
          console.warn('Sem 5 data not available:', sem5Error);
          // Set default Sem 5 stats if not available
          setSem5Stats({
            totalGroups: 0,
            formedGroups: 0,
            allocatedGroups: 0,
            unallocatedGroups: 0,
            totalStudents: 0,
            registeredProjects: 0
          });
        }

        // Load Sem 6 statistics
        try {
          const sem6StatsResponse = await adminAPI.getSem6Statistics();
          
          // Calculate Sem 6 stats
          const sem6Stats = {
            totalSem5Groups: sem6StatsResponse.data?.totalSem5Groups || 0,
            totalProjects: sem6StatsResponse.data?.totalProjects || 0,
            registeredProjects: sem6StatsResponse.data?.registeredProjects || 0,
            notRegistered: sem6StatsResponse.data?.notRegistered || 0,
            continuationProjects: sem6StatsResponse.data?.continuationProjects || 0,
            newProjects: sem6StatsResponse.data?.newProjects || 0,
            registrationRate: sem6StatsResponse.data?.registrationRate || 0
          };
          
          setSem6Stats(sem6Stats);
        } catch (sem6Error) {
          console.warn('Sem 6 data not available:', sem6Error);
          // Set default Sem 6 stats if not available
          setSem6Stats({
            totalSem5Groups: 0,
            totalProjects: 0,
            registeredProjects: 0,
            notRegistered: 0,
            continuationProjects: 0,
            newProjects: 0,
            registrationRate: 0
          });
        }

        // Load Sem 7 statistics
        try {
          const [trackChoicesResponse, internshipAppsResponse] = await Promise.all([
            adminAPI.listSem7TrackChoices(),
            adminAPI.listInternshipApplications()
          ]);

          const trackChoices = trackChoicesResponse.data || [];
          const applications = internshipAppsResponse.data || [];

          const sem7Stats = {
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
          };

          setSem7Stats(sem7Stats);
        } catch (sem7Error) {
          console.warn('Sem 7 data not available:', sem7Error);
          // Set default Sem 7 stats if not available
          setSem7Stats({
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
        }

        // Load Sem 8 statistics
        try {
          const [
            studentsResponse,
            trackChoicesResponse,
            majorProject2Response,
            internship2Response,
            applicationsResponse
          ] = await Promise.all([
            adminAPI.getStudentsBySemester({ semester: 8 }),
            adminAPI.listSem8TrackChoices(),
            adminAPI.getProjects({ semester: 8, projectType: 'major2' }),
            adminAPI.getProjects({ semester: 8, projectType: 'internship2' }),
            adminAPI.listInternshipApplications({ semester: 8 })
          ]);

          const students = studentsResponse.success ? (studentsResponse.data || []) : [];
          const trackChoices = trackChoicesResponse.success ? (trackChoicesResponse.data || []) : [];
          const majorProject2Projects = majorProject2Response.success ? (majorProject2Response.data || []) : [];
          const internship2Projects = internship2Response.success ? (internship2Response.data || []) : [];
          const allApplications = applicationsResponse.success ? (applicationsResponse.data || []) : [];
          const sixMonthApps = allApplications.filter(app => app.type === '6month');


          // Calculate student types (matching backend logic)
          const type1Count = students.filter(s => {
            const sem7Selection = s.semesterSelections?.find(sel => sel.semester === 7);
            return sem7Selection?.finalizedTrack === 'internship' && 
                   sem7Selection?.internshipOutcome === 'verified_pass';
          }).length;
          const type2Count = students.filter(s => {
            const sem7Selection = s.semesterSelections?.find(sel => sel.semester === 7);
            return sem7Selection?.finalizedTrack === 'coursework';
          }).length;

          // Calculate track choices (Type 2 only)
          const major2Choices = trackChoices.filter(tc => {
            const track = tc.finalizedTrack || tc.chosenTrack;
            return (track === 'coursework' && tc.studentType === 'type2') || track === 'major2';
          }).length;
          const internshipChoices = trackChoices.filter(tc => {
            const track = tc.finalizedTrack || tc.chosenTrack;
            return track === 'internship';
          }).length;

          // Calculate Major Project 2 types
          const groupMajor2 = majorProject2Projects.filter(p => !!p.group).length;
          const soloMajor2 = majorProject2Projects.filter(p => !p.group).length;

          const sem8Stats = {
            totalStudents: students.length,
            type1Students: type1Count,
            type2Students: type2Count,
            totalTrackChoices: trackChoices.length,
            pendingTrackChoices: trackChoices.filter(tc => !tc.finalizedTrack || tc.verificationStatus === 'pending').length,
            approvedTrackChoices: trackChoices.filter(tc => tc.verificationStatus === 'approved').length,
            major2TrackChoices: major2Choices,
            internshipTrackChoices: internshipChoices,
            totalMajorProject2: majorProject2Projects.length,
            groupMajorProject2: groupMajor2,
            soloMajorProject2: soloMajor2,
            totalInternship2: internship2Projects.length,
            total6MonthApplications: sixMonthApps.length,
            pending6MonthApplications: sixMonthApps.filter(app => ['submitted', 'pending_verification', 'needs_info'].includes(app.status)).length,
            verifiedPass6Month: sixMonthApps.filter(app => app.status === 'verified_pass').length
          };

          setSem8Stats(sem8Stats);
        } catch (sem8Error) {
          console.warn('Sem 8 data not available:', sem8Error);
          // Set default Sem 8 stats if not available
          setSem8Stats({
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
        }
      } catch (error) {
        console.error('Failed to load admin data:', error);
      } finally {
        setLoading(false);
      }

      // Load M.Tech Sem 1 statistics
      try {
        const statsData = (await adminAPI.getMTechSem1Statistics()).data || {};
        setMtechSem1Stats({
          totalStudents: statsData.totalStudents || 0,
          registeredProjects: statsData.registeredProjects || 0,
          facultyAllocated: statsData.facultyAllocated || 0,
          pendingAllocations: statsData.pendingAllocations || 0,
          unregisteredStudents: statsData.unregisteredStudents || 0,
          registrationRate: statsData.registrationRate || 0
        });
      } catch (mtechError) {
        console.warn('M.Tech Sem 1 data not available:', mtechError);
        setMtechSem1Stats({
          totalStudents: 0,
          registeredProjects: 0,
          facultyAllocated: 0,
          pendingAllocations: 0,
          unregisteredStudents: 0,
          registrationRate: 0
        });
      }

      try {
        const statsData = (await adminAPI.getMTechSem2Statistics()).data || {};
        setMtechSem2Stats({
          totalStudents: statsData.totalStudents || 0,
          registeredProjects: statsData.registeredProjects || 0,
          facultyAllocated: statsData.facultyAllocated || 0,
          pendingAllocations: statsData.pendingAllocations || 0,
          unregisteredStudents: statsData.unregisteredStudents || 0,
          registrationRate: statsData.registrationRate || 0
        });
      } catch (mtechSem2Error) {
        console.warn('M.Tech Sem 2 data not available:', mtechSem2Error);
        setMtechSem2Stats({
          totalStudents: 0,
          registeredProjects: 0,
          facultyAllocated: 0,
          pendingAllocations: 0,
          unregisteredStudents: 0,
          registrationRate: 0
        });
      }

      try {
        const sem5StatsResponse = await adminAPI.getSem5Statistics();
        setSem5Stats({
          totalGroups: sem5StatsResponse.data?.totalGroups || 0,
          formedGroups: sem5StatsResponse.data?.formedGroups || 0,
          allocatedGroups: sem5StatsResponse.data?.allocatedGroups || 0,
          unallocatedGroups: sem5StatsResponse.data?.unallocatedGroups || 0,
          totalStudents: sem5StatsResponse.data?.totalStudents || 0,
          registeredProjects: sem5StatsResponse.data?.registeredProjects || 0
        });
      } catch (sem5Error) {
        console.warn('Sem 5 data not available:', sem5Error);
        setSem5Stats({
          totalGroups: 0,
          formedGroups: 0,
          allocatedGroups: 0,
          unallocatedGroups: 0,
          totalStudents: 0,
          registeredProjects: 0
        });
      }

      try {
        const sem6StatsResponse = await adminAPI.getSem6Statistics();
        setSem6Stats({
          totalSem5Groups: sem6StatsResponse.data?.totalSem5Groups || 0,
          totalProjects: sem6StatsResponse.data?.totalProjects || 0,
          registeredProjects: sem6StatsResponse.data?.registeredProjects || 0,
          notRegistered: sem6StatsResponse.data?.notRegistered || 0,
          continuationProjects: sem6StatsResponse.data?.continuationProjects || 0,
          newProjects: sem6StatsResponse.data?.newProjects || 0,
          registrationRate: sem6StatsResponse.data?.registrationRate || 0
        });
      } catch (sem6Error) {
        console.warn('Sem 6 data not available:', sem6Error);
        setSem6Stats({
          totalSem5Groups: 0,
          totalProjects: 0,
          registeredProjects: 0,
          notRegistered: 0,
          continuationProjects: 0,
          newProjects: 0,
          registrationRate: 0
        });
      }

      try {
        const [trackChoicesResponse, internshipAppsResponse] = await Promise.all([
          adminAPI.listSem7TrackChoices(),
          adminAPI.listInternshipApplications()
        ]);

        const trackChoices = trackChoicesResponse.data || [];
        const applications = internshipAppsResponse.data || [];

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
      } catch (sem7Error) {
        console.warn('Sem 7 data not available:', sem7Error);
        setSem7Stats({
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
      }

      try {
        const [sem3TrackChoicesResponse, sem3ApplicationsResponse] = await Promise.all([
          adminAPI.listMTechSem3TrackChoices(),
          adminAPI.listInternshipApplications({ semester: 3 })
        ]);

        const sem3TrackChoices = sem3TrackChoicesResponse.data || [];
        const sem3Apps = (sem3ApplicationsResponse.data || []).filter(app => app.type === '6month');

        const internshipTrack = sem3TrackChoices.filter(choice =>
          (choice.finalizedTrack || choice.chosenTrack) === 'internship'
        ).length;
        const majorProjectTrack = sem3TrackChoices.filter(choice =>
          (choice.finalizedTrack || choice.chosenTrack) === 'coursework'
        ).length;

        setMtechSem3Stats({
          totalStudents: sem3TrackChoices.length,
          internshipTrack,
          majorProjectTrack,
          totalApplications: sem3Apps.length,
          pendingApplications: sem3Apps.filter(app => ['submitted', 'pending_verification'].includes(app.status)).length,
          approvedApplications: sem3Apps.filter(app => app.status === 'verified_pass').length,
          needsInfo: sem3Apps.filter(app => app.status === 'needs_info').length
        });
      } catch (sem3Error) {
        console.warn('M.Tech Sem 3 data not available:', sem3Error);
        setMtechSem3Stats({
          totalStudents: 0,
          internshipTrack: 0,
          majorProjectTrack: 0,
          totalApplications: 0,
          pendingApplications: 0,
          approvedApplications: 0,
          needsInfo: 0
        });
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

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
        setFacultyForm({ name: '', email: '', phone: '', department: 'CSE', mode: 'Regular', designation: 'Assistant Professor' });
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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome, {user?.name || 'Administrator'}! Manage the SPMS system
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/admin/system-config"
            className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            ⚙️ System Config
          </Link>
          <Link
            to="/admin/semester-management"
            className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            🔄 Semester Management
          </Link>
          <Link
            to="/admin/manage-faculty"
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            👩‍🏫 Manage Faculty Profiles
          </Link>
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            + Add Admin
          </button>
          <button
            onClick={() => setIsAddFacultyOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add Faculty
          </button>
        </div>
      </div>

      {/* Sem 4 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">B.Tech Semester 4 - Minor Project 1</h2>
              <p className="text-purple-200 mb-6">Overview of current semester Minor Project 1 projects and evaluation status</p>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/admin/sem4/registrations"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📊</span>
                <span>View Registrations</span>
              </Link>
              <Link
                to="/admin/sem4/unregistered"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Unregistered Students</span>
              </Link>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem4Stats.registeredProjects}</div>
                <div className="text-purple-200 text-sm">Registered Projects</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem4Stats.unregisteredStudents}</div>
                <div className="text-purple-200 text-sm">Unregistered Students</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem4Stats.registrationRate}%</div>
                <div className="text-purple-200 text-sm">Registration Rate</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem4Stats.registeredProjects + sem4Stats.unregisteredStudents}</div>
                <div className="text-purple-200 text-sm">Total Students</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sem 5 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">B.Tech Semester 5 - Minor Project 2</h2>
              <p className="text-blue-200 mb-6">Group formation and faculty allocation overview</p>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/admin/sem5/allocated-faculty"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>👥</span>
                <span>View Faculty Allocation & Registrations</span>
              </Link>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.totalGroups}</div>
                <div className="text-blue-200 text-sm">Total Groups</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.registeredProjects}</div>
                <div className="text-blue-200 text-sm">Registered Projects</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.allocatedGroups}</div>
                <div className="text-blue-200 text-sm">Faculty Allocated</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.unallocatedGroups}</div>
                <div className="text-blue-200 text-sm">Groups Pending Allocation</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sem 6 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">B.Tech Semester 6 - Major Project</h2>
              <p className="text-green-200 mb-6">Major project registration and continuation tracking</p>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/admin/sem6/registrations"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📊</span>
                <span>View Registrations</span>
              </Link>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem6Stats.totalProjects}</div>
                <div className="text-green-200 text-sm">Registered Projects</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem6Stats.notRegistered}</div>
                <div className="text-green-200 text-sm">Not Registered</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem6Stats.continuationProjects}</div>
                <div className="text-green-200 text-sm">Continuation Projects</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem6Stats.registrationRate}%</div>
                <div className="text-green-200 text-sm">Registration Rate</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sem 7 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">B.Tech Semester 7 - Track & Internship Management</h2>
              <p className="text-orange-200 mb-6">Track selection, internship applications, and coursework management</p>
            </div>
            <div className="flex space-x-4 flex-wrap gap-2">
              <Link
                to="/admin/sem7/review"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Review & Manage</span>
              </Link>
              <Link
                to="/admin/sem7/track-choices"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>🎯</span>
                <span>Track Choices</span>
              </Link>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Track Choices Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-100">Track Choices</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.totalTrackChoices}</div>
                    <div className="text-orange-200 text-sm">Total Choices</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.pendingTrackChoices}</div>
                    <div className="text-orange-200 text-sm">Pending Review</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.approvedTrackChoices}</div>
                    <div className="text-orange-200 text-sm">Approved</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.internshipTrackChoices}</div>
                    <div className="text-orange-200 text-sm">Internship Track</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.courseworkTrackChoices}</div>
                    <div className="text-orange-200 text-sm">Coursework Track</div>
                  </div>
                </div>
              </div>
              
              {/* Internship Applications Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-100">Internship Applications</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.totalInternshipApplications}</div>
                    <div className="text-orange-200 text-sm">Total Applications</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.pendingApplications}</div>
                    <div className="text-orange-200 text-sm">Pending Review</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.approvedApplications}</div>
                    <div className="text-orange-200 text-sm">Approved</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.sixMonthApplications}</div>
                    <div className="text-orange-200 text-sm">6-Month Internships</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem7Stats.summerApplications}</div>
                    <div className="text-orange-200 text-sm">Summer Internships</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sem 8 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">B.Tech Semester 8 - Comprehensive Management</h2>
              <p className="text-purple-200 mb-6">Type 1 & Type 2 students, Major Project 2, Internship 2, and 6-month internship management</p>
            </div>
            <div className="flex space-x-4 flex-wrap gap-2">
              <Link
                to="/admin/sem8/review"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Review & Manage</span>
              </Link>
              <Link
                to="/admin/sem8/track-choices"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>🎯</span>
                <span>Track Choices</span>
              </Link>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Student Types Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-purple-100">Student Types</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.totalStudents}</div>
                    <div className="text-purple-200 text-sm">Total Students</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.type1Students}</div>
                    <div className="text-purple-200 text-sm">Type 1</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.type2Students}</div>
                    <div className="text-purple-200 text-sm">Type 2</div>
                  </div>
                </div>
              </div>
              
              {/* Track Choices Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-purple-100">Track Choices (Type 2)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.totalTrackChoices}</div>
                    <div className="text-purple-200 text-sm">Total Choices</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.pendingTrackChoices}</div>
                    <div className="text-purple-200 text-sm">Pending Review</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.approvedTrackChoices}</div>
                    <div className="text-purple-200 text-sm">Approved</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.major2TrackChoices}</div>
                    <div className="text-purple-200 text-sm">Major Project 2</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.internshipTrackChoices}</div>
                    <div className="text-purple-200 text-sm">6-Month Internship</div>
                  </div>
                </div>
              </div>
              
              {/* Major Project 2 Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-purple-100">Major Project 2</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.totalMajorProject2}</div>
                    <div className="text-purple-200 text-sm">Total Projects</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.groupMajorProject2}</div>
                    <div className="text-purple-200 text-sm">Group Projects</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.soloMajorProject2}</div>
                    <div className="text-purple-200 text-sm">Solo Projects</div>
                  </div>
                </div>
              </div>
              
              {/* Internship 2 Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-purple-100">Internship 2</h3>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.totalInternship2}</div>
                    <div className="text-purple-200 text-sm">Total Projects</div>
                  </div>
                </div>
              </div>
              
              {/* 6-Month Applications Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-purple-100">6-Month Internship Applications (Type 2)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.total6MonthApplications}</div>
                    <div className="text-purple-200 text-sm">Total Applications</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.pending6MonthApplications}</div>
                    <div className="text-purple-200 text-sm">Pending Review</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                    <div className="text-2xl font-bold">{sem8Stats.verifiedPass6Month}</div>
                    <div className="text-purple-200 text-sm">Verified (Pass)</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* M.Tech Sem 1 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">M.Tech Semester 1 - Minor Project 1</h2>
              <p className="text-rose-200 mb-4">Solo project registration and faculty allocation overview</p>
              {!loading && (
                <p className="text-sm text-rose-100">
                  Registration Rate: {mtechSem1Stats.registrationRate}% • Unregistered Students: {mtechSem1Stats.unregisteredStudents}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <Link
                to="/admin/mtech/sem1/registrations"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📊</span>
                <span>View Registrations</span>
              </Link>
              <Link
                to="/admin/mtech/sem1/unregistered"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Unregistered Students</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem1Stats.totalStudents}</div>
                <div className="text-rose-200 text-sm">Total Students</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem1Stats.registeredProjects}</div>
                <div className="text-rose-200 text-sm">Registered Projects</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem1Stats.facultyAllocated}</div>
                <div className="text-rose-200 text-sm">Faculty Allocated</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem1Stats.pendingAllocations}</div>
                <div className="text-rose-200 text-sm">Pending Allocation</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* M.Tech Sem 2 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">M.Tech Semester 2 - Minor Project 2</h2>
              <p className="text-purple-200 mb-4">Solo project registration and faculty allocation overview</p>
              {!loading && (
                <p className="text-sm text-purple-100">
                  Registration Rate: {mtechSem2Stats.registrationRate}% • Unregistered Students: {mtechSem2Stats.unregisteredStudents}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <Link
                to="/admin/mtech/sem2/registrations"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📊</span>
                <span>View Registrations</span>
              </Link>
              <Link
                to="/admin/mtech/sem2/unregistered"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Unregistered Students</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem2Stats.totalStudents}</div>
                <div className="text-purple-200 text-sm">Total Students</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem2Stats.registeredProjects}</div>
                <div className="text-purple-200 text-sm">Registered Projects</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem2Stats.facultyAllocated}</div>
                <div className="text-purple-200 text-sm">Faculty Allocated</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem2Stats.pendingAllocations}</div>
                <div className="text-purple-200 text-sm">Pending Allocation</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* M.Tech Sem 3 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-4">M.Tech Semester 3 - Track & Internship Management</h2>
              <p className="text-white/80 mb-6">Track selections and 6-month internship verification for promoted students</p>
            </div>
            <div>
              <Link
                to="/admin/mtech/sem3/review"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Review Applications</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem3Stats.totalStudents || 0}</div>
                <div className="text-white/80 text-sm">Track Submissions</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem3Stats.internshipTrack || 0}</div>
                <div className="text-white/80 text-sm">Internship Track</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem3Stats.totalApplications || 0}</div>
                <div className="text-white/80 text-sm">Internship Applications</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{mtechSem3Stats.pendingApplications || 0}</div>
                <div className="text-white/80 text-sm">Pending Reviews</div>
              </div>
            </div>
          )}
        </div>
      </div>

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
