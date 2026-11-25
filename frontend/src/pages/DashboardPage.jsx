import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import PersonalGoalCard from '../components/PersonalGoalCard.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { formatApiError, sessionApi, templateApi, workoutApi } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import formatDuration from '../utils/formatDuration.js';

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
      const [stats, workouts, sessions, templates] = await Promise.all([
        workoutApi.stats(),
        workoutApi.list(),
        sessionApi.list('?page=1&limit=5'),
        templateApi.list()
      ]);
      setData({
        stats,
        workouts: workouts.workouts,
        sessions: sessions.sessions,
        templates: templates.templates.filter((template) => template.isBuiltIn)
      });
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

  const todayKey = new Date().toDateString();
  const todaySession = data.sessions.find(
    (session) => new Date(session.startedAt).toDateString() === todayKey
  );
  const suggestedWorkout = data.workouts[0];

  return (
    <section className="app-page page-width">
      <div className="app-page-heading">
        <div>
          <span className="eyebrow">YOUR TRAINING SPACE</span>
          <h1>Welcome back, <span>{user?.name?.split(' ')[0] || 'athlete'}.</span></h1>
          <p>Pick up where you left off and build on the training you have logged.</p>
        </div>
        <div className="heading-actions">
          <Link className="button button-outline" to="/templates">Browse templates</Link>
          <Link className="button" to="/workouts/new">Create workout <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <StatusMessage>{error}</StatusMessage>

      <div className="metric-grid">
        <article className="metric-card"><span>COMPLETED WORKOUTS</span><strong>{data?.stats.completedWorkouts ?? 0}</strong></article>
        <article className="metric-card"><span>THIS WEEK</span><strong>{data?.stats.workoutsThisWeek ?? 0}</strong></article>
        <article className="metric-card"><span>DAILY STREAK</span><strong>{data?.stats.currentStreakDays ?? 0}</strong><small>consecutive days</small></article>
        <article className="metric-card"><span>TOTAL DURATION</span><strong>{formatDuration(data?.stats.totalDurationSeconds ?? 0)}</strong><small>completed sessions</small></article>
        <article className="metric-card"><span>SETS LOGGED</span><strong>{data?.stats.totalSets ?? 0}</strong></article>
        <article className="metric-card"><span>REPETITIONS</span><strong>{data?.stats.totalReps ?? 0}</strong></article>
        <article className="metric-card"><span>TOTAL VOLUME</span><strong>{Number(data?.stats.totalVolume ?? 0).toLocaleString()}</strong><small>weight × reps</small></article>
        <article className="metric-card"><span>COMPLETION RATE</span><strong>{data?.stats.completionRatePercent ?? 0}%</strong><small>of started sessions</small></article>
      </div>

      <section className="today-workout-card">
        <div>
          <span className="eyebrow">TODAY'S WORKOUT</span>
          <h2>{todaySession ? todaySession.name : suggestedWorkout?.name || 'Choose a workout plan'}</h2>
          <p>{todaySession
            ? todaySession.completedAt ? 'A session completed today.' : 'You have an active session ready to continue.'
            : suggestedWorkout ? `${suggestedWorkout.exercises.length} exercises · ${suggestedWorkout.durationMinutes} min`
              : 'Create a workout or start from one of the reusable templates.'}</p>
        </div>
        {todaySession ? (
          <Link className="button" to={`/sessions/${todaySession._id}`}>{todaySession.completedAt ? 'Review session' : 'Continue session'} <span aria-hidden="true">↗</span></Link>
        ) : suggestedWorkout ? (
          <button className="button" type="button" onClick={() => startWorkout(suggestedWorkout._id)} disabled={starting !== ''}>
            {starting === suggestedWorkout._id ? 'Starting…' : 'Start today’s workout'} <span aria-hidden="true">↗</span>
          </button>
        ) : <Link className="button" to="/templates">Browse templates <span aria-hidden="true">↗</span></Link>}
      </section>

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

      <div className="dashboard-lower-grid">
        <PersonalGoalCard />
        <section className="panel-section record-section">
          <div className="section-title-row"><div><span className="eyebrow">PERSONAL RECORDS</span><h2>Best logged efforts</h2></div><Link className="text-link" to="/progress">Progress <span aria-hidden="true">→</span></Link></div>
          {data.stats.personalRecords.length ? (
            <div className="record-list">
              {data.stats.personalRecords.slice(0, 5).map((record) => (
                <article className="record-row" key={record.exerciseId}>
                  <strong>{record.exerciseName}</strong>
                  <span>{record.maxWeight} weight</span>
                  <span>{record.maxReps} reps</span>
                </article>
              ))}
            </div>
          ) : <div className="empty-state"><strong>No personal records yet</strong><p>Complete sessions with logged sets to see your best efforts here.</p></div>}
        </section>
      </div>

      <section className="dashboard-template-strip">
        <div className="section-title-row"><div><span className="eyebrow">QUICK START</span><h2>Starter templates</h2></div><Link className="text-link" to="/templates">All templates <span aria-hidden="true">→</span></Link></div>
        <div className="dashboard-template-links">
          {data.templates.slice(0, 4).map((template) => (
            <Link className="dashboard-template-link" to="/templates" key={template._id}>
              <span>{template.category}</span><strong>{template.name}</strong><small>{template.durationMinutes} min · {template.exercises.length} exercises</small>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
