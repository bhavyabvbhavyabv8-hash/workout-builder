import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { formatApiError, sessionApi } from '../services/api.js';
import formatDuration from '../utils/formatDuration.js';

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [result, setResult] = useState({ sessions: [], page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    sessionApi.history({ page, limit: PAGE_SIZE })
      .then((response) => {
        if (active) setResult(response);
      })
      .catch((requestError) => {
        if (active) setError(formatApiError(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, retryCount]);

  if (loading) return <LoadingState message="Loading workout history…" />;

  return (
    <section className="app-page page-width">
      <div className="app-page-heading">
        <div><span className="eyebrow">YOUR TRAINING LOG</span><h1>Show up.<br /><span>Stack it up.</span></h1><p>Completed sessions, saved from your logged sets.</p></div>
        <Link className="button button-outline" to="/workouts">My workouts <span aria-hidden="true">↗</span></Link>
      </div>
      <StatusMessage>{error}</StatusMessage>
      {error ? (
        <div className="empty-state"><strong>History could not be loaded</strong><p>Retry once the API connection is available.</p><button className="button button-outline" type="button" onClick={() => setRetryCount((current) => current + 1)}>Retry</button></div>
      ) : result.sessions.length ? (
        <>
          <div className="detail-meta"><span>{result.total} completed sessions</span><span>Page {result.page}</span></div>
          <div className="history-list">
            {result.sessions.map((session) => (
              <Link className="history-card" to={`/sessions/${session._id}`} key={session._id}>
                <span className="history-date"><strong>{new Date(session.completedAt).toLocaleDateString(undefined, { day: '2-digit' })}</strong><small>{new Date(session.completedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</small></span>
                <span className="history-copy"><strong>{session.name}</strong><small>Started {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span>
                <span className="history-exercises">
                  <strong>{formatDuration(session.durationSeconds)}</strong>
                  <small title={session.exerciseNames.join(' · ')}>
                    {session.exerciseNames.join(' · ') || 'No exercises recorded'}
                  </small>
                </span>
                <span className="history-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          <div className="pagination">
            <button type="button" className="button button-outline" onClick={() => setPage((current) => current - 1)} disabled={page <= 1}>← Previous</button>
            <span>{page} / {Math.max(1, Math.ceil(result.total / PAGE_SIZE))}</span>
            <button type="button" className="button button-outline" onClick={() => setPage((current) => current + 1)} disabled={page * PAGE_SIZE >= result.total}>Next →</button>
          </div>
        </>
      ) : (
        <div className="empty-state large"><span className="empty-mark" aria-hidden="true">✳</span><h2>Your training history starts here</h2><p>Start a saved workout and log your completed sets to build your history.</p><Link className="button" to="/workouts">Choose a workout <span aria-hidden="true">↗</span></Link></div>
      )}
    </section>
  );
}
