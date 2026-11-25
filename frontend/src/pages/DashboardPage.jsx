import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { formatApiError, sessionApi, workoutApi } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState('');

  async function loadDashboard() {
    setError('');
    setLoading(true);
    try {
      const [stats, workouts, sessions] = await Promise.all([
        workoutApi.stats(),
        workoutApi.list(),
        sessionApi.list('?page=1&limit=5')
      ]);
      setData({ stats, workouts: workouts.workouts, sessions: sessions.sessions });
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function startWorkout(workoutId) {
    setStarting(workoutId);
    setError('');
    try {
      const { session } = await sessionApi.start({ templateId: workoutId });
      navigate(`/sessions/${session._id}`);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setStarting('');
    }
  }

  if (loading) return <LoadingState message="Loading your dashboard…" />;
  if (error && !data) {
    return (
      <section className="app-page page-width">
        <div className="app-page-heading"><div><span className="eyebrow">YOUR TRAINING SPACE</span><h1>Dashboard</h1></div></div>
        <StatusMessage>{error}</StatusMessage>
        <button className="button" type="button" onClick={loadDashboard}>Retry loading dashboard</button>
      </section>
    );
  }

  return (
    <section className="app-page page-width">
      <div className="app-page-heading">
        <div>
          <span className="eyebrow">YOUR TRAINING SPACE</span>
          <h1>Welcome back, <span>{user?.name?.split(' ')[0] || 'athlete'}.</span></h1>
          <p>Pick up where you left off or start a fresh session.</p>
        </div>
        <Link className="button" to="/workouts/new">Create workout <span aria-hidden="true">↗</span></Link>
      </div>
      <StatusMessage>{error}</StatusMessage>

      <div className="metric-grid">
        <article className="metric-card"><span>COMPLETED WORKOUTS</span><strong>{data?.stats.completedWorkouts ?? 0}</strong></article>
        <article className="metric-card"><span>THIS WEEK</span><strong>{data?.stats.workoutsThisWeek ?? 0}</strong></article>
        <article className="metric-card"><span>SETS LOGGED</span><strong>{data?.stats.totalSets ?? 0}</strong></article>
        <article className="metric-card"><span>TOTAL VOLUME</span><strong>{Number(data?.stats.totalVolume ?? 0).toLocaleString()}</strong><small>weight × reps</small></article>
      </div>

      <div className="dashboard-columns">
        <section className="panel-section">
          <div className="section-title-row">
            <div><span className="eyebrow">YOUR PLANS</span><h2>Workouts</h2></div>
            <Link className="text-link" to="/workouts">View all <span aria-hidden="true">→</span></Link>
          </div>
          {data?.workouts.length ? (
            <div className="compact-workout-list">
              {data.workouts.slice(0, 3).map((workout) => (
                <article className="compact-workout" key={workout._id}>
                  <Link to={`/workouts/${workout._id}`} className="compact-workout-main">
                    <strong>{workout.name}</strong>
                    <span>{workout.exercises.length} exercises</span>
                  </Link>
                  <button className="button button-small" type="button" onClick={() => startWorkout(workout._id)} disabled={starting === workout._id}>
                    {starting === workout._id ? 'Starting…' : 'Start'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><strong>No workouts yet</strong><p>Create a plan to start logging sessions.</p><Link className="text-link" to="/workouts/new">Build your first workout <span aria-hidden="true">→</span></Link></div>
          )}
        </section>

        <section className="panel-section">
          <div className="section-title-row">
            <div><span className="eyebrow">RECENT ACTIVITY</span><h2>Sessions</h2></div>
            <Link className="text-link" to="/history">History <span aria-hidden="true">→</span></Link>
          </div>
          {data?.sessions.length ? (
            <div className="session-list">
              {data.sessions.map((session) => (
                <Link className="session-list-row" to={`/sessions/${session._id}`} key={session._id}>
                  <span className={`session-status ${session.completedAt ? 'complete' : ''}`} aria-hidden="true" />
                  <span><strong>{session.name}</strong><small>{new Date(session.startedAt).toLocaleDateString()}</small></span>
                  <span className="session-row-state">{session.completedAt ? 'Completed' : 'In progress'} <b aria-hidden="true">↗</b></span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state"><strong>No sessions logged yet</strong><p>Your started and completed workouts will show up here.</p></div>
          )}
        </section>
      </div>
    </section>
  );
}
