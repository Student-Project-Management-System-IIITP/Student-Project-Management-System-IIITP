import React, { useMemo, useState, useEffect } from 'react';
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
  
  const [loading, setLoading] = useState(true);

  const defaultPassword = useMemo(() => computeDefaultPassword(form.name), [form.name]);
  
  const facultyDefaultPassword = useMemo(() => computeDefaultPassword(facultyForm.name), [facultyForm.name]);

  // Load both Sem 4 and Sem 5 data
  useEffect(() => {
    const loadAdminData = async () => {
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

        // Load M.Tech Sem 1 statistics
        try {
          const mtechStatsResponse = await adminAPI.getMTechSem1Statistics();
          const statsData = mtechStatsResponse.data || {};

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

        // Load M.Tech Sem 2 statistics
        try {
          const mtechSem2StatsResponse = await adminAPI.getMTechSem2Statistics();
          const statsData = mtechSem2StatsResponse.data || {};

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
      } catch (error) {
        console.error('Failed to load admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

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
