import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectToken } from '../../features/auth/authSlice';
import { isTokenExpired } from '../../features/auth/token';

// Wraps the pages that need a signed-in user. Without a valid session the visitor is sent
// to the login page and brought back to where they were going afterwards.
export default function RequireAuth({ children }) {
  const token = useSelector(selectToken);
  const location = useLocation();

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}
