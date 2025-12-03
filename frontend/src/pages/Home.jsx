import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section - Full Screen with Warm Gradient */}
      <section className="min-h-screen bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50 relative overflow-hidden flex items-center">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-200 rounded-full opacity-40 blur-3xl"></div>
          <div className="absolute top-1/2 -left-20 w-72 h-72 bg-secondary-200 rounded-full opacity-30 blur-3xl"></div>
          <div className="absolute -bottom-20 right-1/3 w-80 h-80 bg-accent-200 rounded-full opacity-30 blur-3xl"></div>
        </div>
        
        {/* Subtle Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>

        <div className="relative z-10 w-full px-6 sm:px-8 lg:px-12 xl:px-20 py-16">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-16 items-start">
            {/* Left - Hero Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 border border-primary-200 mb-6">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                <span className="text-sm font-medium text-primary-700">Student Project Management System</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-neutral-800 mb-6">
                <span className="block">Manage Projects</span>
                <span className="block text-primary-600">With Clarity</span>
          </h1>
              
              <p className="text-lg sm:text-xl text-neutral-600 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                A unified workspace for IIIT Pune where students register projects, 
                faculty supervise progress, and admins orchestrate the entire 
                academic project lifecycle across B.Tech and M.Tech programs.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30"
                >
                  <span>Get Started</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-surface-100 hover:bg-surface-200 text-neutral-700 font-semibold rounded-xl border border-neutral-300 transition-all duration-200"
                >
                  Create Account
                </Link>
              </div>
            </div>

            {/* Right - Feature Preview Cards */}
            <div className="space-y-4">
              {/* Student Card */}
              <div className="bg-surface-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-neutral-200 group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-1 group-hover:text-primary-700 transition-colors">Student Portal</h3>
                    <p className="text-sm text-neutral-600">Register projects, form groups, choose faculty, track progress</p>
                  </div>
                  <span className="text-xs font-semibold text-primary-700 bg-primary-100 px-3 py-1 rounded-full">B.Tech & M.Tech</span>
                </div>
              </div>

              {/* Faculty Card */}
              <div className="bg-surface-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-neutral-200 group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-secondary-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-1 group-hover:text-secondary-700 transition-colors">Faculty Dashboard</h3>
                    <p className="text-sm text-neutral-600">Manage allocations, evaluate projects, track student progress</p>
                  </div>
                  <span className="text-xs font-semibold text-secondary-700 bg-secondary-100 px-3 py-1 rounded-full">Guide & Evaluate</span>
                </div>
              </div>

              {/* Admin Card */}
              <div className="bg-surface-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-neutral-200 group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-1 group-hover:text-accent-700 transition-colors">Admin Control</h3>
                    <p className="text-sm text-neutral-600">Configure settings, manage users, oversee all operations</p>
                  </div>
                  <span className="text-xs font-semibold text-accent-700 bg-accent-100 px-3 py-1 rounded-full">Full Access</span>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-5 shadow-lg">
                <p className="text-sm text-white/90">
                  <span className="font-semibold text-white">Built for IIIT Pune:</span> Supports B.Tech (Sem 4-8) and M.Tech (Sem 1-4) 
                  with project rules, evaluation windows, and internship workflows aligned to institute policies.
          </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="bg-surface-300 py-20 lg:py-24">
        <div className="w-full px-6 sm:px-8 lg:px-12 xl:px-20">
          <div className="text-center mb-14">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-4 border border-primary-200">
              FEATURES
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">
              Three experiences, one platform
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Role-specific dashboards that show exactly what matters - no clutter, no confusion.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Students Feature Card */}
            <div className="bg-surface-100 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-neutral-200 group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-800 mb-3">For Students</h3>
              <p className="text-neutral-600 mb-6">
                Complete project lifecycle management from registration to completion.
              </p>
              <ul className="space-y-3">
                {['Project registration & tracking', 'Group formation & invitations', 'Faculty preference selection', 'Internship applications'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-600">
                    <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Faculty Feature Card */}
            <div className="bg-surface-100 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-neutral-200 group">
              <div className="w-16 h-16 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-secondary-500/20 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-800 mb-3">For Faculty</h3>
              <p className="text-neutral-600 mb-6">
                Supervise and evaluate projects with complete visibility into student progress.
              </p>
              <ul className="space-y-3">
                {['Group allocation dashboard', 'Project evaluation tools', 'Submission tracking', 'Workload management'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-600">
                    <span className="w-5 h-5 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Admin Feature Card */}
            <div className="bg-surface-100 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-neutral-200 group">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-accent-500/20 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-800 mb-3">For Administrators</h3>
              <p className="text-neutral-600 mb-6">
                Complete control over the system with powerful management tools.
              </p>
              <ul className="space-y-3">
                {['User management', 'Project oversight', 'Allocation overrides', 'Reports & analytics'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-600">
                    <span className="w-5 h-5 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

          {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 py-20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full opacity-5 blur-3xl translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full opacity-5 blur-3xl -translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative z-10 w-full px-6 sm:px-8 lg:px-12 xl:px-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to streamline your projects?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Join IIIT Pune's integrated project management system. Login with your institute credentials 
              or create a new account to get started.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-surface-100 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login to SPMS
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border-2 border-white/30 hover:bg-white/20 transition-all duration-200 w-full sm:w-auto justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-800 text-white py-12">
        <div className="w-full px-6 sm:px-8 lg:px-12 xl:px-20">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/IIIT Pune Logo New.jpg" 
                  alt="IIIT Pune" 
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white tracking-wide">
                    SPMS<span className="text-primary-400 font-normal">@</span>IIITP
                  </span>
                  <span className="text-[10px] text-neutral-400 tracking-wide">Student Project Management System</span>
                </div>
              </div>
              <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
                Streamlining academic project and internship workflows across semesters 
                for students, faculty, and administrators at IIIT Pune.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/login" className="text-neutral-300 hover:text-primary-400 transition-colors duration-200 text-sm">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="text-neutral-300 hover:text-primary-400 transition-colors duration-200 text-sm">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link to="/help" className="text-neutral-300 hover:text-primary-400 transition-colors duration-200 text-sm">
                    Help & Support
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">Contact</h3>
              <address className="text-sm text-neutral-400 not-italic leading-relaxed">
                Indian Institute of Information Technology<br />
                Pune, Maharashtra<br />
                India
              </address>
            </div>
          </div>

          <div className="border-t border-neutral-700 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-neutral-500">
              &copy; {new Date().getFullYear()} SPMS · IIIT Pune. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>Built for Academic Excellence</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
