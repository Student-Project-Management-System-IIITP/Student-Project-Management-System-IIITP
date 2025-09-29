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
  const [sem4Projects, setSem4Projects] = useState([]);
  
  // Sem 5 specific state
  const [sem5Stats, setSem5Stats] = useState({
    totalGroups: 0,
    formedGroups: 0,
    allocatedGroups: 0,
    unallocatedGroups: 0,
    totalStudents: 0,
    registeredProjects: 0
  });
  const [sem5Groups, setSem5Groups] = useState([]);
  
  const [loading, setLoading] = useState(true);

  const defaultPassword = useMemo(() => computeDefaultPassword(form.name), [form.name]);
  
  const facultyDefaultPassword = useMemo(() => computeDefaultPassword(facultyForm.name), [facultyForm.name]);

  // Load both Sem 4 and Sem 5 data
  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true);
        
        // Load Sem 4 projects and statistics
        const [projectsResponse, statsResponse] = await Promise.all([
          adminAPI.getSem4Projects(),
          adminAPI.getSem4Statistics()
        ]);

        setSem4Projects(projectsResponse.data || []);
        
        // Calculate Sem 4 stats for Minor Project 1 only
        const projects = projectsResponse.data || [];
        const minorProject1Projects = projects.filter(p => p.projectType === 'minor1');
        const sem4Stats = {
          totalProjects: minorProject1Projects.length,
          registeredProjects: minorProject1Projects.filter(p => p.status === 'registered').length,
          activeProjects: minorProject1Projects.filter(p => p.status === 'active').length,
          completedProjects: minorProject1Projects.filter(p => p.status === 'completed').length,
          evaluationScheduled: statsResponse.data?.evaluationScheduled || false,
          pendingEvaluations: minorProject1Projects.filter(p => p.status === 'active' && !p.evaluatedAt).length
        };
        
        setSem4Stats(sem4Stats);

        // Load Sem 5 data
        try {
          const [groupsResponse, sem5StatsResponse] = await Promise.all([
            adminAPI.getSem5Groups(),
            adminAPI.getSem5Statistics()
          ]);

          setSem5Groups(groupsResponse.data || []);
          
          // Calculate Sem 5 stats
          const groups = groupsResponse.data || [];
          const sem5Stats = {
            totalGroups: groups.length,
            formedGroups: groups.filter(g => g.status === 'complete').length,
            allocatedGroups: groups.filter(g => g.allocatedFaculty).length,
            unallocatedGroups: groups.filter(g => !g.allocatedFaculty).length,
            totalStudents: groups.reduce((total, group) => total + (group.members?.length || 0), 0),
            registeredProjects: groups.filter(g => g.project).length
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
            to="/admin/evaluations"
            className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            📅 Manage Evaluations
          </Link>
          <Link
            to="/admin/groups/sem5"
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            👥 Sem 5 Groups
          </Link>
          <Link
            to="/admin/groups/unallocated"
            className="inline-flex items-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            ⚠️ Unallocated
          </Link>
          <Link
            to="/admin/system-config"
            className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            ⚙️ System Config
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
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem4Stats.totalProjects}</div>
                <div className="text-purple-200 text-sm">Total Minor Project 1</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem4Stats.activeProjects}</div>
                <div className="text-purple-200 text-sm">Active Projects</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem4Stats.completedProjects}</div>
                <div className="text-purple-200 text-sm">Completed</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4 hover:bg-opacity-30 transition-all cursor-pointer">
                <div className="text-2xl font-bold">{sem4Stats.pendingEvaluations}</div>
                <div className="text-purple-200 text-sm">Pending Evaluation</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sem 5 Statistics */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">B.Tech Semester 5 - Minor Project 2</h2>
          <p className="text-blue-200 mb-6">Group formation and faculty allocation overview</p>
          
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
                <div className="text-2xl font-bold">{sem5Stats.formedGroups}</div>
                <div className="text-blue-200 text-sm">Formed Groups</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.allocatedGroups}</div>
                <div className="text-blue-200 text-sm">Allocated Groups</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <div className="text-2xl font-bold">{sem5Stats.unallocatedGroups}</div>
                <div className="text-blue-200 text-sm">Unallocated Groups</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sem 4 Projects Overview */}
      <div className="bg-white rounded-lg shadow mt-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Sem 4 Projects</h2>
          <Link
            to="/admin/projects/sem4"
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            </div>
          ) : sem4Projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">No Sem 4 projects registered yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sem4Projects.slice(0, 5).map((project) => (
                <div key={project._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{project.title}</h3>
                    <p className="text-sm text-gray-600">
                      {project.student?.fullName || 'Unknown Student'} • 
                      {project.student?.rollNumber || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Registered: {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={project.status} />
                    <Link
                      to={`/admin/projects/${project._id}`}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sem 5 Groups Overview */}
      <div className="bg-white rounded-lg shadow mt-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Sem 5 Groups</h2>
          <Link
            to="/admin/groups/sem5"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : sem5Groups.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No Sem 5 groups formed yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sem5Groups.slice(0, 5).map((group) => (
                <div key={group._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-600">
                      {group.members?.length || 0} members • 
                      {group.project?.domain || 'No domain'} • 
                      {group.project?.title || 'No project'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(group.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      group.allocatedFaculty ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {group.allocatedFaculty ? 'Allocated' : 'Unallocated'}
                    </span>
                    <Link
                      to={`/admin/groups/${group._id}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
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
