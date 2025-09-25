import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">SPMS@IIITP</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your project management experience with our comprehensive platform 
            designed for students, faculty, and administrators at IIIT Pune.
          </p>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {/* Students Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition duration-300">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Students</h3>
              <p className="text-gray-600 mb-6">
                Signup for projects, form groups, select faculty preferences, 
                and track your academic journey seamlessly.
              </p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Project registration & tracking</li>
                <li>• Group formation & management</li>
                <li>• Faculty preference selection</li>
                <li>• Internship document submission</li>
              </ul>
            </div>

            {/* Faculty Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Faculty</h3>
              <p className="text-gray-600 mb-6">
                Manage group allocations, supervise projects, evaluate students, 
                and maintain your academic workload efficiently.
              </p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• Group allocation management</li>
                <li>• Project supervision</li>
                <li>• Student evaluation</li>
                <li>• Workload tracking</li>
              </ul>
            </div>

            {/* Admin Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition duration-300">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Administrators</h3>
              <p className="text-gray-600 mb-6">
                Oversee the entire system, manage users, generate reports, 
                and ensure smooth operation of the platform.
              </p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>• User management</li>
                <li>• Project management</li>
                <li>• Allocation overrides</li>
                <li>• Reports & analytics</li>
              </ul>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join thousands of students and faculty already using SPMS
            </p>
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Use the navigation bar above to login or signup
              </p>
              <div className="inline-flex items-center space-x-2 text-blue-600">
                <span>👆</span>
                <span className="text-sm">Click Login or Signup in the top navigation</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">SPMS</h3>
              <p className="text-gray-400">
                Student Project Management System for IIIT Pune. 
                Streamlining academic project workflows.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/login" className="hover:text-white transition duration-200">Login</Link></li>
                <li><Link to="/signup" className="hover:text-white transition duration-200">Signup</Link></li>
                <li><Link to="/help" className="hover:text-white transition duration-200">Help</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-400">
                IIIT Pune<br />
                Pune, Maharashtra<br />
                India
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SPMS - IIIT Pune. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
