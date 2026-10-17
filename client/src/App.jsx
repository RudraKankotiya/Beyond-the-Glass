import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { STAFF_ROLES } from './context/AuthContext.jsx';
import HomePage from './pages/HomePage.jsx';
import DiscoverPage from './pages/DiscoverPage.jsx';
import CollectionPage from './pages/CollectionPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Code-splitting: these pages are downloaded only when first visited.
// The <Suspense> in Layout shows a loader while they download.
const ArtifactPage = lazy(() => import('./pages/ArtifactPage.jsx'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage.jsx'));

function App() {
  return (
    <Routes>
      {/* Layout renders the navbar/footer; child pages render inside its <Outlet /> */}
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {/* Exhibition routes redirected to discover */}
        <Route path="exhibitions" element={<Navigate to="/discover" replace />} />
        <Route path="exhibitions/*" element={<Navigate to="/discover" replace />} />
        <Route path="artifacts/:slug" element={<ArtifactPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Any logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="collection" element={<CollectionPage />} />
        </Route>

        {/* Curators and admins only */}
        <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} />}>
          <Route path="dashboard/*" element={<DashboardPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
