import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { StudentRegistration } from './pages/StudentRegistration';
import { VideoManagement } from './pages/VideoManagement';
import { AttendanceReports } from './pages/AttendanceReports';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ClassSelection } from './pages/ClassSelection';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route wrapper - requires authentication
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Role-based Protected Route - requires specific role
const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate page based on role
    if (user.role === 'student') {
      return <Navigate to="/classes" replace />;
    }
    return <Navigate to="/classes" replace />;
  }

  return children;
};

// Public Route - redirects to classes if already logged in
const PublicRoute = ({ children }) => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/classes" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } />
          
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <Navigate to="/classes" replace />
            </ProtectedRoute>
          } />

          <Route path="/classes" element={
            <ProtectedRoute>
              <ClassSelection />
            </ProtectedRoute>
          } />

          {/* Class specific routes - Teachers have full access */}
          <Route path="/class/:classId" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={
              <RoleProtectedRoute allowedRoles={['teacher', 'student']}>
                <Navigate to="dashboard" replace />
              </RoleProtectedRoute>
            } />
            
            {/* Dashboard - accessible to both */}
            <Route path="dashboard" element={
              <RoleProtectedRoute allowedRoles={['teacher', 'student']}>
                <Dashboard />
              </RoleProtectedRoute>
            } />
            
            {/* Reports - accessible to both */}
            <Route path="reports" element={
              <RoleProtectedRoute allowedRoles={['teacher', 'student']}>
                <AttendanceReports />
              </RoleProtectedRoute>
            } />
            
            {/* Teacher-only routes */}
            <Route path="upload" element={
              <RoleProtectedRoute allowedRoles={['teacher']}>
                <VideoManagement />
              </RoleProtectedRoute>
            } />
            <Route path="registration" element={
              <RoleProtectedRoute allowedRoles={['teacher']}>
                <StudentRegistration />
              </RoleProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
