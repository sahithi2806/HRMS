import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { LeavePage } from './pages/LeavePage';
import { PortalPage } from './pages/PortalPage';
import { AttendancePage } from './pages/AttendancePage';
import { AssetsPage } from './pages/AssetsPage';
import { MyAssetsPage } from './pages/MyAssetsPage';
import { NotFoundPage } from './pages/NotFoundPage';

const AppLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        {children}
      </div>
    </div>
  );
};

export const App = () => {
  const { isAuthenticated } = useAuth();

  const getDefaultRedirect = () => {
    if (!isAuthenticated) return '/login';
    return '/portal';
  };

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getDefaultRedirect()} replace /> : <LoginPage />}
      />

      {/* Portal (Default Landing Page) */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PortalPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Attendance & Time Tracking */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AttendancePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected Routes inside AppLayout */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
            <AppLayout>
              <EmployeesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DocumentsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <AppLayout>
              <LeavePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Asset Management (Admin only) */}
      <Route
        path="/assets"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AppLayout>
              <AssetsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* My Assets (All users) */}
      <Route
        path="/my-assets"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyAssetsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <AppLayout>
              <NotFoundPage />
            </AppLayout>
          ) : (
            <NotFoundPage />
          )
        }
      />
    </Routes>
  );
};

export default App;
