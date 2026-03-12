import { Navigate, useLocation } from 'react-router-dom';

/**
 * PrivateRoute
 * Redirects to /login if user is not authenticated.
 * Optionally checks role against allowedRoles.
 *
 * Usage:
 *   <Route element={<PrivateRoute allowedRoles={['admin']} />}>
 *     <Route path="/admin" element={<AdminDashboard />} />
 *   </Route>
 */
const PrivateRoute = ({ children, allowedRoles }) => {
  const location = useLocation();

  let user = null;
  try {
    const stored = localStorage.getItem('user');
    if (stored) user = JSON.parse(stored);
  } catch {
    user = null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Authenticated but wrong role — send to home
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
