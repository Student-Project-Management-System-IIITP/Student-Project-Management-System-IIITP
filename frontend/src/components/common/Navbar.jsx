import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSem7 } from '../../context/Sem7Context';
import { useSem8 } from '../../context/Sem8Context';
import { useSem5 } from '../../context/Sem5Context';

const Navbar = ({ userRole: propUserRole = null, user: propUser = null, roleData: propRoleData = null }) => {
  // Use props if provided, otherwise get from AuthContext
  const auth = useAuth();
  const userRole = propUserRole || auth.userRole;
  const user = propUser || auth.user;
  const roleData = propRoleData || auth.roleData;
  
  // Get Sem 5 data for students (always call hook, but conditionally use)
  let sem5Data = null;
  try {
    const sem5Context = useSem5();
    // Only use Sem 5 data if student is in semester 5
    if (userRole === 'student' && (roleData?.semester || user?.semester) === 5) {
      sem5Data = sem5Context;
    }
  } catch (error) {
    // Sem5Context might not be available, ignore silently
    console.warn('Sem5Context not available:', error);
  }

  // Get Sem 7 data for students (always call hook, but conditionally use)
  let sem7Data = null;
  try {
    const sem7Context = useSem7();
    // Only use Sem 7 data if student is in semester 7
    if (userRole === 'student' && (roleData?.semester || user?.semester) === 7) {
      sem7Data = sem7Context;
    }
  } catch (error) {
    // Sem7Context might not be available, ignore silently
    console.warn('Sem7Context not available:', error);
  }

  // Get Sem 8 data for students (always call hook, but conditionally use)
  let sem8Data = null;
  try {
    const sem8Context = useSem8();
    // Only use Sem 8 data if student is in semester 8
    if (userRole === 'student' && (roleData?.semester || user?.semester) === 8) {
      sem8Data = sem8Context;
    }
  } catch (error) {
    // Sem8Context might not be available, ignore silently
    console.warn('Sem8Context not available:', error);
  }
  
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

  // Get project dashboard items based on student semester, degree, and history
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
    const degree = studentData.degree;
    const currentSemester = studentData.semester || 0;
    const projectHistory = studentData.currentProjects || [];

    // Helper to get project by semester
    const getProjectBySemester = (semester) => {
      return projectHistory.find(p => p.semester === semester);
    };

    // Only show projects that the student has registered for or is currently enrolled in
    if (degree === 'M.Tech') {
      // M.Tech Sem 1: Minor Project 1 (solo)
      const sem1Project = getProjectBySemester(1);
      if (sem1Project || currentSemester === 1) {
        const projectId = sem1Project?.project || sem1Project?._id || sem1Project?.projectId;
        items.push({
          name: 'Minor Project 1',
          path: projectId ? `/projects/${projectId}` : '/student/mtech/sem1/register',
          semester: 1,
          type: 'mtech_minor1',
          hasProject: !!sem1Project,
          projectId: projectId
        });
      }
      // Future: add Sem 2/3/4 mappings when implemented
      return items;
    }

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
    // Use Sem5Context data to verify project exists (more reliable than currentProjects)
    // This ensures we don't show a link to a deleted project after group disbanding
    const sem5ProjectFromContext = sem5Data?.sem5Project;
    const sem5GroupFromContext = sem5Data?.sem5Group;
    const sem5Project = sem5ProjectFromContext || getProjectBySemester(5);
    
    if (sem5Project || currentSemester === 5) {
      // For Sem 5, verify the project actually exists by checking Sem5Context
      // If group was disbanded, sem5Project will be null even if currentProjects has stale data
      const projectId = sem5Project?._id || sem5Project?.project || sem5Project?.projectId;
      const hasValidProject = !!sem5Project && !!projectId;
      
      // Only show link if project exists in Sem5Context OR if student is in a finalized group
      // This prevents showing links to deleted projects after group disbanding
      if (hasValidProject || (sem5GroupFromContext && sem5GroupFromContext.status === 'finalized' && !sem5ProjectFromContext)) {
        items.push({
          name: 'Minor Project 2',
          path: projectId ? `/projects/${projectId}` : '/student/sem5/register',
          semester: 5,
          type: 'minor2',
          hasProject: hasValidProject,
          projectId: projectId
        });
      } else if (currentSemester === 5) {
        // Show registration link if in Sem 5 but no valid project
        items.push({
          name: 'Minor Project 2',
          path: '/student/sem5/register',
          semester: 5,
          type: 'minor2',
          hasProject: false,
          projectId: null
        });
      }
    }

    // Semester 6: Minor Project 3 (continuation)
    const sem6Project = getProjectBySemester(6);
    if (sem6Project || currentSemester === 6) {
      // Check multiple possible fields for project ID
      const projectId = sem6Project?.project || sem6Project?._id || sem6Project?.projectId;
      items.push({
        name: 'Minor Project 3',
        path: projectId ? `/projects/${projectId}` : '/student/sem6/register',
        semester: 6,
        type: 'minor3',
        hasProject: !!sem6Project && !!projectId,
        projectId: projectId
      });
    }

    // Semester 7: Major Project 1 or Internship
    if (currentSemester === 7) {
      const sem7Project = getProjectBySemester(7);
      const finalizedTrack = sem7Data?.trackChoice?.finalizedTrack;
      
      // Show Major Project 1 for coursework track
      if (finalizedTrack === 'coursework') {
        // Use Sem7Context data which has full project object with faculty info
        const major1Project = sem7Data?.majorProject1;
        const projectId = major1Project?._id;
        
        // Only show in Project Dashboard if project exists AND faculty is allocated
        if (major1Project && major1Project.faculty) {
          items.push({
            name: 'Major Project 1',
            path: `/projects/${projectId}`,
            semester: 7,
            type: 'major1',
            hasProject: true,
            projectId: projectId
          });
        }
        
        // Show Internship 1 if eligible and has faculty allocated
        const internship1Project = sem7Data?.internship1Project;
        if (internship1Project) {
          const internship1Id = internship1Project._id;
          // Only show in Project Dashboard if faculty is allocated
          if (internship1Project.faculty) {
            items.push({
              name: 'Internship 1',
              path: `/projects/${internship1Id}`,
              semester: 7,
              type: 'internship1',
              hasProject: true,
              projectId: internship1Id
            });
          }
        }
      }
      
      // Don't show 6-month internship in Project Dashboard (it's not a project, it's an application)
      // It should be shown in navigation items instead
    }

    // Semester 8: Major Project 2
    const sem8Project = getProjectBySemester(8);
    if (sem8Project || currentSemester === 8) {
      // Check multiple possible fields for project ID
      const projectId = sem8Project?.project || sem8Project?._id || sem8Project?.projectId;
      items.push({
        name: 'Major Project 2',
        path: projectId ? `/projects/${projectId}` : '/student/sem8/register',
        semester: 8,
        type: 'major2',
        hasProject: !!sem8Project && !!projectId,
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

      // Sem 7 specific navigation
      const currentSemester = roleData?.semester || user?.semester;
      if (currentSemester === 7) {
        const finalizedTrack = sem7Data?.trackChoice?.finalizedTrack;
        const trackChoice = sem7Data?.trackChoice;
        const selectedTrack = finalizedTrack || trackChoice?.chosenTrack;
        
        // Show track selection only if:
        // 1. Not finalized AND
        // 2. No choice submitted yet OR needs_info status
        if (!finalizedTrack) {
          if (!trackChoice || !trackChoice.chosenTrack) {
            // No choice submitted yet - show track selection
            items.push({ 
              name: 'Sem 7 Track Selection', 
              path: '/student/sem7/track-selection' 
            });
          } else if (trackChoice.verificationStatus === 'needs_info') {
            // Choice submitted but needs info - show update option
            items.push({ 
              name: 'Update Track Choice', 
              path: '/student/sem7/track-selection' 
            });
          }
          // If choice is submitted and pending, don't show track selection in navbar
        }
        
        // Show internship applications when internship is chosen or finalized
        if (selectedTrack === 'internship') {
          const sixMonthApp = sem7Data?.internshipApplications?.find(app => app.type === '6month');
          // Only show link if no application exists or needs_info status
          if (!sixMonthApp || sixMonthApp.status === 'needs_info') {
            items.push({
              name: sixMonthApp?.status === 'needs_info' ? 'Update Internship Application' : 'Internship Application',
              path: sixMonthApp ? `/student/sem7/internship/apply/6month/${sixMonthApp._id}/edit` : '/student/sem7/internship/apply/6month'
            });
          }
        }
        
        // Show Major Project 1 Dashboard and Internship 1 Dashboard for coursework track
        if (selectedTrack === 'coursework') {
          // Major Project 1 Dashboard - always show for coursework students
          items.push({
            name: 'Major Project 1',
            path: '/student/sem7/major1/dashboard'
          });
          
          // Internship 1 Dashboard - always show for coursework students
          // This dashboard provides access to summer internship application functionality
          items.push({
            name: 'Internship 1',
            path: '/student/sem7/internship1/dashboard'
          });
        }
      }

      // Sem 8 specific navigation
      if (currentSemester === 8) {
        const sem8FinalizedTrack = sem8Data?.trackChoice?.finalizedTrack;
        const sem8TrackChoice = sem8Data?.trackChoice;
        const sem8SelectedTrack = sem8FinalizedTrack || sem8TrackChoice?.chosenTrack;
        const studentType = sem8Data?.sem8Status?.studentType;
        const isType2 = studentType === 'type2';
        
        // Show track selection only for Type 2 students:
        // 1. Not finalized AND
        // 2. No choice submitted yet OR needs_info status
        if (isType2 && !sem8FinalizedTrack) {
          if (!sem8TrackChoice || !sem8TrackChoice.chosenTrack) {
            // No choice submitted yet - show track selection
            items.push({ 
              name: 'Sem 8 Track Selection', 
              path: '/student/sem8/track-selection' 
            });
          } else if (sem8TrackChoice.verificationStatus === 'needs_info') {
            // Choice submitted but needs info - show update option
            items.push({ 
              name: 'Update Track Choice', 
              path: '/student/sem8/track-selection' 
            });
          }
        }
        
        // Show internship applications when internship is chosen or finalized (Type 2 only)
        if (isType2 && sem8SelectedTrack === 'internship') {
          const sixMonthApp = sem8Data?.internshipApplications?.find(app => app.type === '6month');
          // Only show link if no application exists or needs_info status
          if (!sixMonthApp || sixMonthApp.status === 'needs_info') {
            items.push({
              name: sixMonthApp?.status === 'needs_info' ? 'Update Internship Application' : 'Internship Application',
              path: sixMonthApp ? `/student/sem8/internship/apply/6month/${sixMonthApp._id}/edit` : '/student/sem8/internship/apply/6month'
            });
          }
        }
        
        // Show Major Project 2 Dashboard and Internship 2 Dashboard for major2 track
        // (Type 1 auto-enrolled, Type 2 can choose)
        if (sem8SelectedTrack === 'major2') {
          // Major Project 2 Dashboard - always show for major2 track students
          items.push({
            name: 'Major Project 2',
            path: '/student/sem8/major2/dashboard'
          });
          
          // Internship 2 Dashboard - always show for major2 track students
          items.push({
            name: 'Internship 2',
            path: '/student/sem8/internship2/dashboard'
          });
        }
      }

      // Groups link removed - students can access group dashboard through Major Project 1 dashboard
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
                { name: 'Major Project 2 (Sem 8)', path: '/admin/projects/btech/major2' },
                { name: 'Internship 1 (2 Month)', path: '/admin/projects/btech/internship1' },
                { name: 'Internship 2 (2 Month)', path: '/admin/projects/btech/internship2' },
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
    <nav className="bg-neutral-800 border-b border-neutral-700/50 shadow-lg sticky top-0 z-50">
      <div className="w-full px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo and Brand - Left */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <img 
                src="/IIIT Pune Logo New.jpg" 
                alt="IIIT Pune" 
                className="h-10 w-10 rounded-full object-cover shadow-md"
              />
              <div className="flex flex-col">
                <h1 className="text-base lg:text-lg font-bold text-white tracking-wide">
                  SPMS<span className="text-primary-400 font-normal">@</span>IIITP
                </h1>
                <p className="text-[10px] text-neutral-400 tracking-wider">
                  STUDENT PROJECT MANAGEMENT SYSTEM
                </p>
              </div>
            </Link>
          </div>

          {/* Right Side Container - Combines Navigation and User Menu */}
          <div className="flex items-center ml-auto">
            {/* Navigation Items - Right Side */}
            {navigationItems.length > 0 && (
              <div className="hidden md:flex items-center gap-4">
                {navigationItems.map((item) => 
                  item.isDropdown ? (
                    <div 
                      key={item.name}
                      className="relative" 
                      ref={el => dropdownRefs.current[item.name] = el}
                    >
                      <button
                        onClick={() => toggleDropdown(item.name)}
                        className={`px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                          isActivePath(item.path)
                            ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
                        }`}
                      >
                        {item.name}
                        <svg className={`w-3 h-3 transition-transform ${openDropdowns[item.name] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Main Dropdown Menu */}
                      {openDropdowns[item.name] && (
                        <div className="absolute right-0 mt-2 w-56 bg-surface-100 rounded-xl shadow-xl border border-neutral-200 py-2">
                          {item.items.map((subItem, idx) => 
                            subItem.isSection ? (
                              <div key={subItem.name}>
                                {idx > 0 && <div className="border-t border-neutral-200 my-2"></div>}
                                <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                                  {subItem.name}
                                </div>
                                {subItem.items.map(sectionItem => (
                                  <Link
                                    key={`${subItem.name}-${sectionItem.name}`}
                                    to={sectionItem.path}
                                    onClick={() => toggleDropdown(item.name)}
                                    className="block px-3 py-2 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors rounded-lg mx-1"
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
                                className="block px-3 py-2 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors rounded-lg mx-1"
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
                      className={`px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        isActivePath(item.path)
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
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
                      className={`px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                        location.pathname.includes('/student/project/')
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
                      }`}
                    >
                      Project Dashboard
                      <svg className={`w-3 h-3 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isProjectMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-surface-100 rounded-xl shadow-xl border border-neutral-200 py-2">
                        {projectDashboardItems.map((project) => (
                          <Link
                            key={project.type}
                            to={project.path}
                            onClick={() => setIsProjectMenuOpen(false)}
                            className={`block px-3 py-2 text-sm transition-colors rounded-lg mx-1 ${
                              location.pathname === project.path
                                ? 'bg-primary-100 text-primary-700 font-medium'
                                : 'text-neutral-600 hover:bg-primary-50 hover:text-primary-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{project.name}</span>
                              <span className="text-xs text-neutral-400">Sem {project.semester}</span>
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
                <div className="relative hidden md:block ml-4" ref={userMenuRef}>
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-md shadow-primary-500/20">
                      <span className="text-xs font-bold text-white">
                        {getUserName().charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-white leading-tight">
                        {getUserName()}
                      </p>
                      <p className="text-[10px] text-primary-300 leading-tight">
                        {getRoleDisplayName(userRole)}
                      </p>
                    </div>
                    <svg className={`w-3 h-3 text-neutral-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-surface-100 rounded-xl shadow-xl border border-neutral-200 py-2">
                      <Link
                        to={`/${userRole}/profile`}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors rounded-lg mx-1"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          My Profile
                        </div>
                      </Link>
                      <div className="border-t border-neutral-200 my-2 mx-2"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors rounded-lg mx-1"
                        style={{ width: 'calc(100% - 8px)' }}
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
                  className="px-3 py-1.5 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors shadow-md shadow-primary-600/30"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
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
          <div className="md:hidden border-t border-neutral-700/50 py-3 bg-neutral-800">
            {/* Navigation Items */}
            {navigationItems.length > 0 && (
              <div className="space-y-1 mb-2 px-2">
                {navigationItems.map((item) => (
                  item.isDropdown ? (
                    <div key={item.name} className="py-1">
                      <div className="px-3 py-1.5 text-xs font-semibold text-primary-300 uppercase tracking-wide">
                        {item.name}
                      </div>
                      <div className="pl-2 border-l-2 border-primary-600/30 ml-3 space-y-1">
                        {item.items.map((subItem, idx) => 
                          subItem.isSection ? (
                            <div key={subItem.name} className="pt-1">
                              <div className="px-3 py-1 text-xs font-semibold text-neutral-500">
                                {subItem.name}
                              </div>
                              <div className="pl-2 space-y-1">
                                {subItem.items.map(sectionItem => (
                                  <Link
                                    key={`${subItem.name}-${sectionItem.name}`}
                                    to={sectionItem.path}
                                    className="block px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg"
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
                              className="block px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg"
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
                      className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActivePath(item.path)
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  )
                ))}

                {/* Project Dashboard - Mobile */}
                {userRole === 'student' && projectDashboardItems.length > 0 && (
                  <div className="pt-3 mt-2 border-t border-neutral-700/50">
                    <div className="px-3 py-1.5 text-xs font-semibold text-primary-300 uppercase tracking-wide">
                      Project Dashboard
                    </div>
                    {projectDashboardItems.map((project) => (
                      <Link
                        key={project.type}
                        to={project.path}
                        className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          location.pathname === project.path
                            ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{project.name}</span>
                          <span className="text-xs text-primary-300">Sem {project.semester}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* User Menu for Mobile */}
            {userRole ? (
              <div className="border-t border-neutral-700/50 pt-3 mt-2 px-2">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <span className="text-sm font-bold text-white">
                      {getUserName().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{getUserName()}</p>
                    <p className="text-xs text-primary-300">{getRoleDisplayName(userRole)}</p>
                  </div>
                </div>
                <Link
                  to={`/${userRole}/profile`}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-error-400 hover:text-error-300 hover:bg-error-500/10 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              // Mobile Public Menu
              <div className="border-t border-neutral-700/50 pt-3 mt-2 px-2 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors text-center"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors shadow-md shadow-primary-600/30 text-center"
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
