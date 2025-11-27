import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sem5Provider } from './context/Sem5Context';
import { Sem7Provider } from './context/Sem7Context';
import { Sem8Provider } from './context/Sem8Context';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import StudentDashboard from './pages/student/Dashboard';
import ProjectRegistration from './pages/student/ProjectRegistration';
// PPTUpload removed - functionality merged into Sem4ProjectDashboard
import MinorProject2Registration from './pages/student/MinorProject2Registration';
import GroupFormation from './pages/student/GroupFormation';
import GroupDashboard from './pages/student/GroupDashboard';
import FacultyDashboard from './pages/faculty/Dashboard';
import ProjectDetails from './pages/shared/ProjectDetails';
import EvaluationInterface from './pages/faculty/EvaluationInterface';
import GroupAllocation from './pages/faculty/GroupAllocation';
import AllocatedGroups from './pages/faculty/AllocatedGroups';
import AdminDashboard from './pages/admin/Dashboard';
import ManageFaculty from './pages/admin/ManageFaculty';
import ManageStudents from './pages/admin/ManageStudents';
import Sem4RegistrationsTable from './pages/admin/Sem4RegistrationsTable';
import Sem4UnregisteredStudents from './pages/admin/Sem4UnregisteredStudents';
import Sem5RegistrationsTable from './pages/admin/Sem5RegistrationsTable';
import Sem5AllocatedFaculty from './pages/admin/Sem5AllocatedFaculty';
import Sem6RegistrationsTable from './pages/admin/Sem6RegistrationsTable';
import Sem7Review from './pages/admin/Sem7Review';
import Sem7TrackFinalization from './pages/admin/Sem7TrackFinalization';
import Sem8Review from './pages/admin/Sem8Review';
import Sem8TrackFinalization from './pages/admin/Sem8TrackFinalization';
import SystemConfiguration from './pages/admin/SystemConfiguration';
import NotFound from './pages/NotFound';
import AdminProfile from './pages/admin/Profile';
import ToastDemo from './components/common/ToastDemo';
import SignupTestDemo from './components/auth/SignupTestDemo';
import SpecificErrorTestDemo from './components/auth/SpecificErrorTestDemo';
import FacultyProfile from './pages/faculty/Profile';
import StudentProfile from './pages/student/Profile';
import Sem4ProjectDashboard from './pages/student/Sem4ProjectDashboard';
import Sem6Registration from './pages/student/Sem6Registration';
import MTechSem1Registration from './pages/student/MTechSem1Registration';
import Sem7TrackSelection from './pages/student/Sem7TrackSelection';
import MTechSem3TrackSelection from './pages/student/MTechSem3TrackSelection';
import InternshipApplicationForm from './pages/student/InternshipApplicationForm';
import MajorProject1Registration from './pages/student/MajorProject1Registration';
import MajorProject1Dashboard from './pages/student/MajorProject1Dashboard';
import Internship1Registration from './pages/student/Internship1Registration';
import Internship1Dashboard from './pages/student/Internship1Dashboard';
import SemesterManagement from './pages/admin/SemesterManagement';
import ManageProjects from './pages/admin/ManageProjects';
import MTechSem1Registrations from './pages/admin/MTechSem1Registrations';
import MTechSem1UnregisteredStudents from './pages/admin/MTechSem1UnregisteredStudents';
import MTechSem2Registration from './pages/student/MTechSem2Registration';
import MTechSem2Registrations from './pages/admin/MTechSem2Registrations';
import MTechSem2UnregisteredStudents from './pages/admin/MTechSem2UnregisteredStudents';
import MTechSem3Review from './pages/admin/MTechSem3Review';
import MTechSem3MajorProject from './pages/student/MTechSem3MajorProject';
import MTechSem3MajorProjectRegister from './pages/student/MTechSem3MajorProjectRegister';
import Sem8TrackSelection from './pages/student/Sem8TrackSelection';
import Sem8Status from './pages/student/Sem8Status';
import MajorProject2Dashboard from './pages/student/MajorProject2Dashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Sem5Provider>
          <Sem7Provider>
            <Sem8Provider>
              <AppContent />
            </Sem8Provider>
          </Sem7Provider>
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
    <>
      <Toaster
  position="top-center"
  containerStyle={{
    top: '50px', // Adjust this value based on your navbar height
    left: '50%',
    transform: 'translateX(-50%)',
  }}
  toastOptions={{
    duration: 4000,
    style: {
      background: '#363636',
      color: '#fff',
      marginTop: '20px',
    },
    success: {
      duration: 3000,
      iconTheme: {
        primary: '#10B981',
        secondary: '#fff',
      },
    },
    error: {
      duration: 5000,
      iconTheme: {
        primary: '#EF4444',
        secondary: '#fff',
      },
    },
    loading: {
      duration: Infinity,
    },
  }}
/>
      
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
          {/* M.Tech Sem 1 Registration */}
          <Route path="/student/mtech/sem1/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MTechSem1Registration />
            </ProtectedRoute>
          } />
          {/* M.Tech Sem 2 Registration */}
          <Route path="/student/mtech/sem2/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MTechSem2Registration />
            </ProtectedRoute>
          } />
          {/* Old PPTUpload route removed - functionality merged into Sem4ProjectDashboard */}
          {/* Sem 5 Routes */}
          <Route path="/student/sem5/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MinorProject2Registration />
            </ProtectedRoute>
          } />
          
          {/* Sem 6 Registration */}
          <Route path="/student/sem6/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Sem6Registration />
            </ProtectedRoute>
          } />

          {/* M.Tech Sem 3 Track Selection */}
          <Route path="/student/mtech/sem3/track-selection" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MTechSem3TrackSelection />
            </ProtectedRoute>
          } />
          <Route path="/student/mtech/sem3/major-project" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MTechSem3MajorProject />
            </ProtectedRoute>
          } />
          <Route path="/student/mtech/sem3/major-project/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MTechSem3MajorProjectRegister />
            </ProtectedRoute>
          } />
          
          {/* Sem 7 Routes */}
          <Route path="/student/sem7/track-selection" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Sem7TrackSelection />
            </ProtectedRoute>
          } />
          <Route path="/student/sem7/internship/apply/:type" element={
            <ProtectedRoute allowedRoles={['student']}>
              <InternshipApplicationForm />
            </ProtectedRoute>
          } />
          <Route path="/student/sem7/internship/apply/:type/:id/edit" element={
            <ProtectedRoute allowedRoles={['student']}>
              <InternshipApplicationForm />
            </ProtectedRoute>
          } />
          <Route path="/student/sem7/major1/dashboard" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MajorProject1Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/sem7/major1/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MajorProject1Registration />
            </ProtectedRoute>
          } />
          <Route path="/student/sem7/internship1/dashboard" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Internship1Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/sem7/internship1/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Internship1Registration />
            </ProtectedRoute>
          } />
          
          {/* Sem 8 Routes */}
          <Route path="/student/sem8/track-selection" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Sem8TrackSelection />
            </ProtectedRoute>
          } />
          <Route path="/student/sem8/status" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Sem8Status />
            </ProtectedRoute>
          } />
          <Route path="/student/sem8/internship/apply/:type" element={
            <ProtectedRoute allowedRoles={['student']}>
              <InternshipApplicationForm />
            </ProtectedRoute>
          } />
          <Route path="/student/sem8/internship/apply/:type/:id/edit" element={
            <ProtectedRoute allowedRoles={['student']}>
              <InternshipApplicationForm />
            </ProtectedRoute>
          } />
          <Route path="/student/sem8/major2/dashboard" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MajorProject2Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/sem8/major2/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <MajorProject1Registration />
            </ProtectedRoute>
          } />
          <Route path="/student/sem8/internship2/dashboard" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Internship1Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/sem8/internship2/register" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Internship1Registration />
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
          <Route path="/student/profile" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Layout>
                <StudentProfile />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/projects/sem4/:projectId" element={
            <ProtectedRoute allowedRoles={['student']}>
              <Sem4ProjectDashboard />
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
          <Route path="/faculty/profile" element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <Layout>
                <FacultyProfile />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/manage-faculty" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <ManageFaculty />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/manage-students" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <ManageStudents />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/sem4/registrations" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Sem4RegistrationsTable />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/sem4/unregistered" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Sem4UnregisteredStudents />
            </ProtectedRoute>
          } />
          <Route path="/admin/mtech/sem1/registrations" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <MTechSem1Registrations />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/mtech/sem1/unregistered" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <MTechSem1UnregisteredStudents />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/mtech/sem2/registrations" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <MTechSem2Registrations />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/mtech/sem2/unregistered" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <MTechSem2UnregisteredStudents />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/mtech/sem3/review" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MTechSem3Review />
            </ProtectedRoute>
          } />
          {/* Redirects to allocated-faculty page - registrations is now a tab there */}
          <Route path="/admin/sem5/registrations" element={
            <Navigate to="/admin/sem5/allocated-faculty" replace />
          } />
          <Route path="/admin/sem5/allocated-faculty" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Sem5AllocatedFaculty />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/sem6/registrations" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Sem6RegistrationsTable />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/sem7/review" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Sem7Review />
            </ProtectedRoute>
          } />
          <Route path="/admin/sem7/track-choices" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Sem7TrackFinalization />
            </ProtectedRoute>
          } />
          <Route path="/admin/sem8/review" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Sem8Review />
            </ProtectedRoute>
          } />
          <Route path="/admin/sem8/track-choices" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Sem8TrackFinalization />
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
          <Route path="/admin/system-config" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <SystemConfiguration />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/semester-management" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SemesterManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/manage-projects" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <ManageProjects />
              </Layout>
            </ProtectedRoute>
          } />
          {/* Shared Routes - Accessible by all authenticated users */}
          <Route path="/projects/:projectId" element={
            <ProtectedRoute allowedRoles={['student', 'faculty', 'admin']}>
              <ProjectDetails />
            </ProtectedRoute>
          } />
          {/* Demo Routes - Remove in production */}
          <Route path="/toast-demo" element={
            <Layout>
              <ToastDemo />
            </Layout>
          } />
          <Route path="/signup-test-demo" element={
            <Layout>
              <SignupTestDemo />
            </Layout>
          } />
          <Route path="/specific-error-test-demo" element={
            <Layout>
              <SpecificErrorTestDemo />
            </Layout>
          } />
          <Route path="*" element={
            <Layout>
              <NotFound />
            </Layout>
          } />
      </Routes>
    </>
  );
}

export default App
