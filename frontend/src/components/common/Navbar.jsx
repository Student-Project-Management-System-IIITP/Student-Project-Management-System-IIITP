import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ userRole: propUserRole = null, user: propUser = null, roleData: propRoleData = null }) => {
  // Use props if provided, otherwise get from AuthContext
  const auth = useAuth();
  const userRole = propUserRole || auth.userRole;
  const user = propUser || auth.user;
  const roleData = propRoleData || auth.roleData;
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const projectMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target)) {
        setIsProjectMenuOpen(false);
      }
    };

    if (isUserMenuOpen || isProjectMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen, isProjectMenuOpen]);

  // Get project dashboard items based on student semester and history
  const getProjectDashboardItems = () => {
    if (userRole !== 'student') {
      console.log('🔍 Navbar Debug: Not a student', { userRole });
      return [];
    }

    // Student data is in roleData, not user
    const studentData = roleData;
    
    if (!studentData) {
      console.log('🔍 Navbar Debug: No roleData available', { user, roleData });
      return [];
    }

    console.log('🔍 Navbar Debug: Student data:', {
      semester: studentData.semester,
      currentProjects: studentData.currentProjects,
      fullName: studentData.fullName
    });

    const items = [];
    const currentSemester = studentData.semester || 0;
    const projectHistory = studentData.currentProjects || [];

    // Helper to get project by semester
    const getProjectBySemester = (semester) => {
      return projectHistory.find(p => p.semester === semester);
    };

    // Only show projects that the student has registered for or is currently enrolled in

    // Semester 4: Minor Project 1 (solo)
    const sem4Project = getProjectBySemester(4);
    if (sem4Project || currentSemester === 4) {
      const projectId = sem4Project?.project;
      items.push({
        name: 'Minor Project 1',
        path: projectId ? `/projects/${projectId}` : '/student/projects/register',
        semester: 4,
        type: 'minor1',
        hasProject: !!sem4Project,
        projectId: projectId
      });
    }

    // Semester 5: Minor Project 2 (group)
    const sem5Project = getProjectBySemester(5);
    if (sem5Project || currentSemester === 5) {
      const projectId = sem5Project?.project;
      items.push({
        name: 'Minor Project 2',
        path: projectId ? `/projects/${projectId}` : '/student/sem5/register',
        semester: 5,
        type: 'minor2',
        hasProject: !!sem5Project,
        projectId: projectId
      });
    }

    // Semester 6: Minor Project 3 (continuation)
    const sem6Project = getProjectBySemester(6);
    if (sem6Project || currentSemester === 6) {
      const projectId = sem6Project?.project;
      items.push({
        name: 'Minor Project 3',
        path: projectId ? `/projects/${projectId}` : '/student/sem6/register',
        semester: 6,
        type: 'minor3',
        hasProject: !!sem6Project,
        projectId: projectId
      });
    }

    // Semester 7: Major Project 1 or Internship
    const sem7Project = getProjectBySemester(7);
    if (sem7Project || currentSemester === 7) {
      const projectId = sem7Project?.project;
      items.push({
        name: 'Major Project 1',
        path: projectId ? `/projects/${projectId}` : '/student/sem7/register',
        semester: 7,
        type: 'major1',
        hasProject: !!sem7Project,
        projectId: projectId
      });
    }

    // Semester 8: Major Project 2
    const sem8Project = getProjectBySemester(8);
    if (sem8Project || currentSemester === 8) {
      const projectId = sem8Project?.project;
      items.push({
        name: 'Major Project 2',
        path: projectId ? `/projects/${projectId}` : '/student/sem8/register',
        semester: 8,
        type: 'major2',
        hasProject: !!sem8Project,
        projectId: projectId
      });
    }

    console.log('🔍 Navbar Debug: Project Dashboard Items:', items);
    return items;
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    if (!userRole) {
      return [];
    }

    const items = [];

    // Student Navigation
    if (userRole === 'student') {
      items.push(
        { name: 'Dashboard', path: '/dashboard/student' },
        { name: 'Groups', path: '/student/groups', showFor: 'student' }
      );
    }

    // Faculty Navigation
    if (userRole === 'faculty') {
      items.push(
        { name: 'Dashboard', path: '/dashboard/faculty' },
        { name: 'Projects', path: '/faculty/projects' },
        { name: 'Evaluations', path: '/faculty/evaluations' }
      );
    }

    // Admin Navigation
    if (userRole === 'admin') {
      items.push(
        { name: 'Dashboard', path: '/dashboard/admin' },
        { name: 'Users', path: '/admin/users' },
        { name: 'Projects', path: '/admin/projects' },
        { name: 'Groups', path: '/admin/groups' },
        { name: 'Settings', path: '/admin/settings' }
      );
    }

    return items;
  };

  const navigationItems = getNavigationItems();
  const projectDashboardItems = getProjectDashboardItems();

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    await auth.logout();
    navigate('/login');
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      student: 'Student',
      faculty: 'Faculty',
      admin: 'Administrator'
    };
    return roleNames[role] || role;
  };

  return (
    <nav className="bg-slate-800 border-b border-slate-700 shadow-md sticky top-0 z-50">
      <div className="w-full px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo and Brand - Compact */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <img 
                src="/IIIT Pune Logo New.png" 
                alt="IIIT Pune" 
                className="h-9 w-auto"
              />
              <div className="border-l border-slate-600 pl-2">
                <h1 className="text-base font-semibold text-white leading-tight">SPMS</h1>
                <p className="text-[10px] text-slate-400 leading-tight">IIIT Pune</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          {navigationItems.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    isActivePath(item.path)
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}

              {/* Project Dashboard Dropdown - Only for Students */}
              {userRole === 'student' && projectDashboardItems.length > 0 && (
                <div className="relative" ref={projectMenuRef}>
                  <button
                    onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1 ${
                      location.pathname.includes('/student/project/')
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    Project Dashboard
                    <svg className={`w-3 h-3 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isProjectMenuOpen && (
                    <div className="absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-slate-200 py-1">
                      {projectDashboardItems.map((project) => (
                        <Link
                          key={project.type}
                          to={project.path}
                          onClick={() => setIsProjectMenuOpen(false)}
                          className={`block px-3 py-2 text-sm transition-colors ${
                            location.pathname === project.path
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{project.name}</span>
                            <span className="text-xs text-slate-500">Sem {project.semester}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {userRole ? (
              // Logged in user menu
              <>
                {/* User Profile Dropdown - Compact */}
                <div className="relative hidden md:block" ref={userMenuRef}>
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">
                        {user?.name?.charAt(0)?.toUpperCase() || userRole.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-white leading-tight">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {getRoleDisplayName(userRole)}
                      </p>
                    </div>
                    <svg className={`w-3 h-3 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1">
                      <Link
                        to={`/${userRole}/profile`}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          My Profile
                        </div>
                      </Link>
                      <div className="border-t border-slate-200 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Public menu (not logged in)
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-700 py-2">
            {/* Navigation Items */}
            {navigationItems.length > 0 && (
              <div className="space-y-1 mb-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`block px-3 py-2 text-sm font-medium rounded transition-colors ${
                      isActivePath(item.path)
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}

                {/* Project Dashboard - Mobile */}
                {userRole === 'student' && projectDashboardItems.length > 0 && (
                  <div className="pt-2 border-t border-slate-700">
                    <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Project Dashboard
                    </div>
                    {projectDashboardItems.map((project) => (
                      <Link
                        key={project.type}
                        to={project.path}
                        className={`block px-3 py-2 text-sm font-medium rounded transition-colors ${
                          location.pathname === project.path
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{project.name}</span>
                          <span className="text-xs opacity-75">Sem {project.semester}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* User Menu for Mobile */}
            {userRole ? (
              <div className="border-t border-slate-700 pt-2">
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {user?.name?.charAt(0)?.toUpperCase() || userRole.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-slate-400">{getRoleDisplayName(userRole)}</p>
                  </div>
                </div>
                <Link
                  to={`/${userRole}/profile`}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              // Mobile Public Menu
              <div className="border-t border-slate-700 pt-2 space-y-1">
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
