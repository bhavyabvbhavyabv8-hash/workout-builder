import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import LoadingState from './LoadingState.jsx';
import StatusMessage from './StatusMessage.jsx';

export default function ProtectedRoute() {
  const { status, authError, refreshProfile } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState message="Checking your account…" />;
  }

  if (status === 'unavailable') {
    return (
      <section className="simple-page page-width">
        <span className="eyebrow">CONNECTION ISSUE</span>
        <h1>We couldn’t<br /><span>load your account.</span></h1>
        <StatusMessage>{authError}</StatusMessage>
        <button className="button" type="button" onClick={() => refreshProfile().catch(() => {})}>
          Retry connection
        </button>
      </section>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
