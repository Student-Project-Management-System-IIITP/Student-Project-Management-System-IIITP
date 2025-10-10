import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationCenter from '../notifications/NotificationCenter';

const Navbar = ({ userRole = null, user = null }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Navigation items based on user role
  const getNavigationItems = () => {
    if (!userRole) {
      // Public navigation (not logged in) - No navigation items on homepage
      return [];
    }

    // Only essential navigation items for now
    const items = [
      { name: 'Dashboard', path: `/dashboard/${userRole}`, icon: '📊' }
    ];

    // Show Profile for admin and faculty roles
    if (userRole === 'admin') {
      items.push({ name: 'Profile', path: `/admin/profile`, icon: '👤' });
    }
    if (userRole === 'faculty') {
      items.push({ name: 'Profile', path: `/faculty/profile`, icon: '👤' });
    }
    if (userRole === 'student') {
      items.push({ name: 'Profile', path: `/student/profile`, icon: '👤' });
    }
    // Removed student profile from navbar

    return items;
  };

  const navigationItems = getNavigationItems();

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center">
              <img 
                src="/IIIT Pune Logo New.png" 
                alt="IIIT Pune Logo" 
                className="h-10 w-auto mr-3"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">SPMS</h1>
                <p className="text-xs text-gray-600">Student Project Management System</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {navigationItems.length > 0 && (
            <div className="hidden md:flex items-center space-x-6 flex-1 justify-center">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                    isActivePath(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          )}

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            {userRole ? (
              // Logged in user menu
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <NotificationCenter />

                {/* User Profile Dropdown */}
                <div className="relative">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition duration-200">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {user?.name?.charAt(0) || userRole.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">
                      {user?.name || `${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`}
                    </span>
                    <span className="text-gray-400">▼</span>
                  </button>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              // Public menu (not logged in) - Only show when needed
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition duration-200 hover:bg-gray-100"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
                >
                  Signup
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-2 rounded-md transition duration-200"
            >
              <span className="text-xl">
                {isMenuOpen ? '✕' : '☰'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 rounded-lg mt-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition duration-200 ${
                    isActivePath(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile User Menu - Only show if user is logged in */}
              {userRole && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center px-3 py-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                        {user?.name?.charAt(0) || userRole.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {user?.name || `${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition duration-200"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
              
              {/* Show message when no navigation items and not logged in */}
              {navigationItems.length === 0 && !userRole && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">Welcome to SPMS</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
