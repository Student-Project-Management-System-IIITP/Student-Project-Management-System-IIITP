import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';

const Layout = ({ children, showNavbar = true }) => {
  const { user, userRole, roleData, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-200">
      {showNavbar && <Navbar userRole={userRole} user={user} roleData={roleData} />}
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;
