import { Link, Navigate, Outlet, useLocation } from 'react-router';
import useAuth from '../hooks/useAuth.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import PageHeader from './PageHeader.jsx';
import PageLoader from './PageLoader.jsx';

// Wraps routes that need a logged-in user, optionally with specific roles:
//   <Route element={<ProtectedRoute />}>                                  any logged-in user
//   <Route element={<ProtectedRoute allowedRoles={['curator', 'admin']} />}>  only those roles
function ProtectedRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Still checking the saved login after a refresh - don't redirect yet
  if (isLoading) return <PageLoader />;

  // Not logged in: go to login, remembering where to come back to afterwards
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // Logged in, but the wrong role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDenied allowedRoles={allowedRoles} role={user.role} />;
  }

  return <Outlet />;
}

function AccessDenied({ allowedRoles, role }) {
  useDocumentTitle('No access');

  return (
    <section>
      <PageHeader title="No access">
        This area is for {allowedRoles.join(' and ')} accounts. You are logged in as a {role}.
      </PageHeader>
      <div className="page-container pb-20">
        <Link to="/" className="btn btn-outline">
          Go to the home page
        </Link>
      </div>
    </section>
  );
}

export default ProtectedRoute;
