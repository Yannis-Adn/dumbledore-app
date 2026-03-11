import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/auth';
import { ThemeProvider } from '@/context/theme';
import { ToastProvider } from '@/context/toast';
import Layout from '@/components/Layout';
import ToastContainer from '@/components/ToastContainer';
import ErrorBoundary from '@/components/ErrorBoundary';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Courses from '@/pages/Courses';
import CourseDetail from '@/pages/CourseDetail';
import Calendar from '@/pages/Calendar';
import Notifications from '@/pages/Notifications';
import ProjectProfile from '@/pages/ProjectProfile';
import Profile from '@/pages/Profile';
import TokenManagement from '@/pages/TokenManagement';
import PushNotifications from '@/pages/PushNotifications';
import ThemeManagement from '@/pages/ThemeManagement';

import Subscribe from '@/pages/Subscribe';
import PageLoader from '@/components/PageLoader';
import { Agentation } from 'agentation';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return <PageLoader fullScreen />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return <PageLoader fullScreen />;
  }

  if (token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/project/:courseId" element={<ProjectProfile />} />
        <Route path="/stats" element={<Profile />} />
        <Route path="/tokens" element={<TokenManagement />} />
        <Route path="/push-notifications" element={<PushNotifications />} />
        <Route path="/theme" element={<ThemeManagement />} />
      </Route>

      <Route path="/subscribe/:topicId" element={<Subscribe />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
            <ToastContainer />
            {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
