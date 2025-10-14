import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ userRole: propUserRole = null, user: propUser = null, roleData: propRoleData = null }) => {
  // Use props if provided, otherwise get from AuthContext
  const auth = useAuth();
  const userRole = propUserRole || auth.userRole;
  const user = propUser || auth.user;
  const roleData = propRoleData || auth.roleData;
  
  // Get user's actual name based on role
  const getUserName = () => {
    if (!user) return 'User';
    
    // If user has name directly, use it
    if (user.name) return user.name;
    
    // Otherwise, get name from role-specific data
    if (roleData) {
      return roleData.fullName || 'User';
    }
    
    return 'User';
  };
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const projectMenuRef = useRef(null);

  // Create refs for dropdown menus
  const dropdownRefs = useRef({});

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target)) {
        setIsProjectMenuOpen(false);
      }
      
      // Close any open dropdowns if clicking outside
      Object.keys(openDropdowns).forEach(key => {
        if (openDropdowns[key] && dropdownRefs.current[key] && !dropdownRefs.current[key].contains(event.target)) {
          setOpenDropdowns(prev => ({...prev, [key]: false}));
        }
      });
    };

    if (isUserMenuOpen || isProjectMenuOpen || Object.values(openDropdowns).some(Boolean)) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen, isProjectMenuOpen, openDropdowns]);
  
  // Toggle dropdown menu
  const toggleDropdown = (name) => {
    setOpenDropdowns(prev => {
      // Close all other dropdowns
      const newState = Object.keys(prev).reduce((acc, key) => {
        acc[key] = key === name ? !prev[key] : false;
        return acc;
      }, {});
      
      // Toggle the clicked dropdown
      return { ...newState, [name]: !prev[name] };
    });
  };

  // Get project dashboard items based on student semester and history
  const getProjectDashboardItems = () => {
    if (userRole !== 'student') {
      return [];
    }

    // Student data is in roleData, not user
    const studentData = roleData;
    
    if (!studentData) {
      return [];
    }

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
        path: projectId ? `/student/projects/sem4/${projectId}` : '/student/projects/register',
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
      items.push({ name: 'Dashboard', path: '/dashboard/student' });

      // Only show Groups if student is in a group
      const studentData = roleData;
      if (studentData?.groupId) {
        const groupId = studentData.groupId;
        items.push({ 
          name: 'Groups', 
          path: `/student/groups/${groupId}/dashboard` 
        });
      }
    }

    // Faculty Navigation
    if (userRole === 'faculty') {
      items.push(
        { name: 'Dashboard', path: '/dashboard/faculty' }
      );
    }

    // Admin Navigation
    if (userRole === 'admin') {
      items.push(
        { name: 'Dashboard', path: '/dashboard/admin' },
        { 
          name: 'Users', 
          path: '#',
          isDropdown: true,
          items: [
            { name: 'Students', path: '/admin/users/students' },
            { name: 'Faculty', path: '/admin/users/faculty' },
            { name: 'Admins', path: '/admin/users/admins' }
          ]
        },
        { 
          name: 'Projects', 
          path: '#',
          isDropdown: true,
          items: [
            { 
              name: 'B.Tech', 
              isSection: true,
              items: [
                { name: 'Minor Project 1 (Sem 4)', path: '/admin/projects/btech/minor1' },
                { name: 'Minor Project 2 (Sem 5)', path: '/admin/projects/btech/minor2' },
                { name: 'Minor Project 3 (Sem 6)', path: '/admin/projects/btech/minor3' },
                { name: 'Major Project 1 (Sem 7)', path: '/admin/projects/btech/major1' },
                { name: 'Internship 1 (2 Month)', path: '/admin/projects/btech/internship1' },
                { name: 'Major Project 2 (Sem 8)', path: '/admin/projects/btech/major2' },
                { name: 'Internship 2 (6 Month)', path: '/admin/projects/btech/internship2' }
              ]
            },
            { 
              name: 'M.Tech', 
              isSection: true,
              items: [
                { name: 'Minor Project 1 (Sem 1)', path: '/admin/projects/mtech/minor1' },
                { name: 'Minor Project 2 (Sem 2)', path: '/admin/projects/mtech/minor2' },
                { name: 'Major Project 1 (Sem 3)', path: '/admin/projects/mtech/major1' },
                { name: 'Internship 1 (6 Month)', path: '/admin/projects/mtech/internship1' },
                { name: 'Major Project 2 (Sem 4)', path: '/admin/projects/mtech/major2' },
                { name: 'Internship 2 (6 Month)', path: '/admin/projects/mtech/internship2' }
              ]
            }
          ]
        },
        { 
          name: 'Settings', 
          path: '#',
          isDropdown: true,
          items: [
            { name: 'B.Tech', path: '/admin/settings/btech' },
            { name: 'M.Tech', path: '/admin/settings/mtech' }
          ]
        }
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
          {/* Logo and Brand - Left */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full opacity-70 blur-[1px]"></div>
                <img 
                  src="/IIIT Pune Logo New.jpg" 
                  alt="IIIT Pune" 
                  className="h-10 w-10.1 rounded-full object-cover border-2 border-white relative z-10 shadow-md"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline">
                  <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.05em' }}>
                    SPMS
                  </h1>
                  <span className="mx-0.5 text-sm font-normal text-gray-300" style={{ fontFamily: "'Montserrat', sans-serif" }}>@</span>
                  <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.02em' }}>
                    IIIT-Pune
                  </h2>
                </div>
                <div className="flex items-center mt-0.5">
                  <p className="text-[10px] text-slate-300" style={{ fontFamily: "'Lora', serif", letterSpacing: '0.04em', fontWeight: 500 }}>
                    STUDENT PROJECT MANAGEMENT SYSTEM
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Right Side Container - Combines Navigation and User Menu */}
          <div className="flex items-center ml-auto">
            {/* Navigation Items - Right Side */}
            {navigationItems.length > 0 && (
              <div className="hidden md:flex items-center gap-5">
                {navigationItems.map((item) => 
                  item.isDropdown ? (
                    <div 
                      key={item.name}
                      className="relative" 
                      ref={el => dropdownRefs.current[item.name] = el}
                    >
                      <button
                        onClick={() => toggleDropdown(item.name)}
                        className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1 ${
                          isActivePath(item.path)
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {item.name}
                        <svg className={`w-3 h-3 transition-transform ${openDropdowns[item.name] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Main Dropdown Menu */}
                      {openDropdowns[item.name] && (
                        <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-slate-200 py-1">
                          {item.items.map((subItem, idx) => 
                            subItem.isSection ? (
                              <div key={subItem.name}>
                                {idx > 0 && <div className="border-t border-slate-200 my-1"></div>}
                                <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                  {subItem.name}
                                </div>
                                {subItem.items.map(sectionItem => (
                                  <Link
                                    key={`${subItem.name}-${sectionItem.name}`}
                                    to={sectionItem.path}
                                    onClick={() => toggleDropdown(item.name)}
                                    className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    {sectionItem.name}
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <Link
                                key={subItem.name}
                                to={subItem.path}
                                onClick={() => toggleDropdown(item.name)}
                                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                {subItem.name}
                              </Link>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
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
                  )
                )}

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
                      <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-slate-200 py-1">
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

            {/* User Menu */}
            {userRole ? (
              // Logged in user menu
              <>
                {/* User Profile Dropdown - Compact */}
                <div className="relative hidden md:block ml-6" ref={userMenuRef}>
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">
                        {getUserName().charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-white leading-tight">
                        {getUserName()}
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
                  item.isDropdown ? (
                    <div key={item.name} className="py-1">
                      <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        {item.name}
                      </div>
                      <div className="pl-2 border-l border-slate-700 ml-3 space-y-1">
                        {item.items.map((subItem, idx) => 
                          subItem.isSection ? (
                            <div key={subItem.name} className="pt-1">
                              <div className="px-3 py-1 text-xs font-semibold text-slate-500">
                                {subItem.name}
                              </div>
                              <div className="pl-2 space-y-1">
                                {subItem.items.map(sectionItem => (
                                  <Link
                                    key={`${subItem.name}-${sectionItem.name}`}
                                    to={sectionItem.path}
                                    className="block px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"
                                    onClick={() => setIsMenuOpen(false)}
                                  >
                                    {sectionItem.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Link
                              key={subItem.name}
                              to={subItem.path}
                              className="block px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              {subItem.name}
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
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
                  )
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
                      {getUserName().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{getUserName()}</p>
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
