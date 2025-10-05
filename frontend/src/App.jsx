import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sem5Provider } from './context/Sem5Context';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import StudentDashboard from './pages/student/Dashboard';
import ProjectRegistration from './pages/student/ProjectRegistration';
import PPTUpload from './pages/student/PPTUpload';
import MinorProject2Registration from './pages/student/MinorProject2Registration';
import GroupFormation from './pages/student/GroupFormation';
import GroupDashboard from './pages/student/GroupDashboard';
import FacultyDashboard from './pages/faculty/Dashboard';
import ProjectDetails from './pages/shared/ProjectDetails';
import EvaluationInterface from './pages/faculty/EvaluationInterface';
import GroupAllocation from './pages/faculty/GroupAllocation';
import AllocatedGroups from './pages/faculty/AllocatedGroups';
import AdminDashboard from './pages/admin/Dashboard';
import EvaluationManagement from './pages/admin/EvaluationManagement';
import Sem4ProjectOverviewPage from './pages/admin/Sem4ProjectOverview';
import Sem4RegistrationsTable from './pages/admin/Sem4RegistrationsTable';
import GroupManagement from './pages/admin/GroupManagement';
import UnallocatedGroups from './pages/admin/UnallocatedGroups';
import SystemConfiguration from './pages/admin/SystemConfiguration';
import NotFound from './pages/NotFound';
import AdminProfile from './pages/admin/Profile';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Sem5Provider>
          <AppContent />
        </Sem5Provider>
      </AuthProvider>
    </Router>
  );
}

// App Content Component (inside AuthProvider context)
function AppContent() {
  // Protected Route Component
  const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, userRole, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
    
    return children;
  };

  // Dashboard Route Component
  const DashboardRoute = () => {
    const { userRole } = useAuth();
    
    switch (userRole) {
      case 'student':
        return <Navigate to="/dashboard/student" replace />;
      case 'faculty':
        return <Navigate to="/dashboard/faculty" replace />;
      case 'admin':
        return <Navigate to="/dashboard/admin" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  };

  return (
        <Routes>
          <Route path="/" element={
            <Layout>
              <Home />
            </Layout>
          } />
          <Route path="/login" element={
            <Layout>
              <Login />
            </Layout>
          } />
          <Route path="/signup" element={
            <Layout>
              <Signup />
            </Layout>
          } />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/dashboard/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Layout>
                <StudentDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/projects/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <ProjectRegistration />
            </ProtectedRoute>
          } />
          <Route path="/student/projects/:id/upload" element={
            <ProtectedRoute allowedRoles={['student']}>
              <PPTUpload />
            </ProtectedRoute>
          } />
          {/* Sem 5 Routes */}
          <Route path="/student/sem5/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MinorProject2Registration />
            </ProtectedRoute>
          } />
          <Route path="/student/groups/create" element={
            <ProtectedRoute allowedRoles={['student']}>
              <GroupFormation />
            </ProtectedRoute>
          } />
          <Route path="/student/groups/:id/dashboard" element={
            <ProtectedRoute allowedRoles={['student']}>
              <GroupDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/sem5/project" element={
            <ProtectedRoute allowedRoles={['student']}>
              <ProjectDetails />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/faculty" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <Layout>
                <FacultyDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/faculty/evaluations" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <EvaluationInterface />
            </ProtectedRoute>
          } />
          <Route path="/faculty/evaluations/:id" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <EvaluationInterface />
            </ProtectedRoute>
          } />
          {/* Sem 5 Faculty Routes */}
          <Route path="/faculty/groups/allocation" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <Layout>
                <GroupAllocation />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/faculty/groups/allocated" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <Layout>
                <AllocatedGroups />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/faculty/project" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <ProjectDetails />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/evaluations" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EvaluationManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/projects/sem4" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Sem4ProjectOverviewPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/sem4/registrations" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Sem4RegistrationsTable />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/profile" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <AdminProfile />
              </Layout>
            </ProtectedRoute>
          } />
          {/* Sem 5 Admin Routes */}
          <Route path="/admin/groups/sem5" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <GroupManagement />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/groups/unallocated" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <UnallocatedGroups />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/system-config" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <SystemConfiguration />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={
            <Layout>
              <NotFound />
            </Layout>
          } />
        </Routes>
  );
}

export default App
