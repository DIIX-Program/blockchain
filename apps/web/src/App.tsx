import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { BatchesPage } from './pages/BatchesPage';
import { BatchDetailPage } from './pages/BatchDetailPage';
import { SensorMonitoringPage } from './pages/SensorMonitoringPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnchorsPage } from './pages/AnchorsPage';
import { ManagementPage } from './pages/ManagementPage';
import { PublicTracePage } from './pages/PublicTracePage';
import { LoadingSpinner } from './components/LoadingSpinner';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <LoadingSpinner message="Authenticating session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes (Zero Login required) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/trace/:batchNumber" element={<PublicTracePage />} />

          {/* Protected Enterprise Routes */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/products"
            element={
              <RequireAuth>
                <ProductsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/products/:id"
            element={
              <RequireAuth>
                <ProductDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/batches"
            element={
              <RequireAuth>
                <BatchesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/batches/:id"
            element={
              <RequireAuth>
                <BatchDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/sensors"
            element={
              <RequireAuth>
                <SensorMonitoringPage />
              </RequireAuth>
            }
          />
          <Route
            path="/alerts"
            element={
              <RequireAuth>
                <AlertsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/anchors"
            element={
              <RequireAuth>
                <AnchorsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <ManagementPage />
              </RequireAuth>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;
