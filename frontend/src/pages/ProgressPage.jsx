import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { exerciseApi, formatApiError, workoutApi } from '../services/api.js';
import formatDuration from '../utils/formatDuration.js';

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [exerciseOptions, setExerciseOptions] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', exerciseId: '' });
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    let active = true;
    setError('');
    setLoading(true);
    Promise.all([
      workoutApi.stats(),
      workoutApi.progress(appliedFilters),
      exerciseApi.list({ limit: 100 })
    ])
      .then(([stats, progress, exercises]) => {
        if (active) setData({ stats, exercises: progress.exercises });
        if (active) setExerciseOptions(exercises.exercises);
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
  }, [appliedFilters, retryCount]);

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters({ from: '', to: '', exerciseId: '' });
    setAppliedFilters({});
  }

  if (loading) return <LoadingState message="Loading your progress…" />;
  if (error && !data) {
    return (
      <section className="app-page page-width">
        <div className="app-page-heading"><div><span className="eyebrow">PROGRESS</span><h1>Your training data.</h1></div></div>
        <StatusMessage>{error}</StatusMessage>
        <button className="button" type="button" onClick={() => setRetryCount((current) => current + 1)}>Retry loading progress</button>
      </section>
    );
  }

  return (
    <section className="app-page page-width">
      <div className="app-page-heading">
        <div><span className="eyebrow">PROGRESS</span><h1>Small steps.<br /><span>Real strength.</span></h1><p>Every metric below comes from your completed workout sessions.</p></div>
        <Link className="button button-outline" to="/history">Workout history <span aria-hidden="true">↗</span></Link>
      </div>
      <StatusMessage>{error}</StatusMessage>
      <form className="progress-filter-form" onSubmit={applyFilters}>
        <label className="field-label">From date
          <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
        </label>
        <label className="field-label">To date
          <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
        </label>
        <label className="field-label">Exercise
          <select value={filters.exerciseId} onChange={(event) => setFilters((current) => ({ ...current, exerciseId: event.target.value }))}>
            <option value="">All exercises</option>
            {exerciseOptions.map((exercise) => <option value={exercise._id} key={exercise._id}>{exercise.name}</option>)}
          </select>
        </label>
        <button className="button button-small" type="submit">Apply filters <span aria-hidden="true">↗</span></button>
        <button className="subtle-link" type="button" onClick={clearFilters}>Clear</button>
      </form>
      <div className="metric-grid progress-metrics">
        <article className="metric-card"><span>COMPLETED WORKOUTS</span><strong>{data?.stats.completedWorkouts ?? 0}</strong></article>
        <article className="metric-card"><span>THIS WEEK</span><strong>{data?.stats.workoutsThisWeek ?? 0}</strong></article>
        <article className="metric-card"><span>THIS MONTH</span><strong>{data?.stats.workoutsThisMonth ?? 0}</strong></article>
        <article className="metric-card"><span>TOTAL SETS</span><strong>{data?.stats.totalSets ?? 0}</strong></article>
        <article className="metric-card"><span>TOTAL REPS</span><strong>{data?.stats.totalReps ?? 0}</strong></article>
        <article className="metric-card"><span>TRAINING TIME</span><strong>{formatDuration(data?.stats.totalDurationSeconds ?? 0)}</strong><small>completed sessions</small></article>
      </div>

      <section className="progress-section">
        <div className="section-title-row"><div><span className="eyebrow">CONSISTENCY</span><h2>Weekly frequency</h2></div><span className="chart-caption">Completed sessions · last 8 weeks</span></div>
        {(data?.stats.weeklyFrequency || []).some((week) => week.workouts > 0) ? (
          <div className="weekly-chart" role="img" aria-label="Completed workouts by week over the last eight weeks">
            {(data?.stats.weeklyFrequency || []).map((week) => {
              const maxCount = Math.max(1, ...data.stats.weeklyFrequency.map((entry) => entry.workouts));
              const height = week.workouts ? Math.max(8, (week.workouts / maxCount) * 100) : 0;
              return (
                <div className="weekly-bar-column" key={week.weekStart} aria-label={`${new Date(`${week.weekStart}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${week.workouts} workouts`}>
                  <span className="bar-value">{week.workouts || ''}</span>
                  <div className="weekly-bar-track"><div className="weekly-bar" style={{ height: `${height}%` }} /></div>
                  <span className="bar-label">{new Date(`${week.weekStart}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><strong>No weekly activity yet</strong><p>Complete a workout session and weekly frequency will be tracked here.</p></div>
        )}
      </section>

      <section className="progress-section">
        <div className="section-title-row"><div><span className="eyebrow">PERSONAL RECORDS</span><h2>Best logged efforts</h2></div></div>
        {data?.stats.personalRecords.length ? (
          <div className="record-list">
            {data.stats.personalRecords.map((record) => (
              <article className="record-row" key={record.exerciseId}><strong>{record.exerciseName}</strong><span>{record.maxWeight} weight</span><span>{record.maxReps} reps</span></article>
            ))}
          </div>
        ) : <div className="empty-state"><strong>No personal records yet</strong><p>Complete sessions and log sets to build your records.</p><Link className="text-link" to="/workouts">Start a workout <span aria-hidden="true">→</span></Link></div>}
      </section>

      <section className="progress-section">
        <div className="section-title-row"><div><span className="eyebrow">EXERCISE PERFORMANCE</span><h2>Strength over time</h2></div><span className="chart-caption">Filter this chart by date and exercise</span></div>
        {data?.exercises.length ? (
          <div className="performance-grid">
            {data.exercises.map((exercise) => {
              const useWeight = exercise.history.some((entry) => entry.maxWeight > 0);
              const measure = useWeight ? 'maxWeight' : 'maxReps';
              const unit = useWeight ? 'weight' : 'reps';
              const maxValue = Math.max(1, ...exercise.history.map((entry) => entry[measure]));
              return (
                <article className="performance-card" key={exercise.exerciseId}>
                  <div className="performance-card-heading"><div><span className="eyebrow">{exercise.history.length} SESSIONS</span><h3>{exercise.exerciseName}</h3></div><span className="performance-best">{Math.max(...exercise.history.map((entry) => entry[measure]))}<small> {unit}</small></span></div>
                  <div className="performance-chart" role="img" aria-label={`${exercise.exerciseName} top ${unit} by session`}>
                    {exercise.history.map((entry) => (
                      <div className="performance-bar-column" key={entry.date}>
                        <span className="performance-value">{entry[measure]}</span>
                        <div className="performance-bar-track"><div className="performance-bar" style={{ height: `${Math.max(7, entry[measure] / maxValue * 100)}%` }} /></div>
                        <span className="performance-date">{new Date(`${entry.date}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ))}
                  </div>
                  <div className="performance-footer"><span>{exercise.history.at(-1).sets} sets in latest session</span><span>{exercise.history.at(-1).maxReps} reps max</span></div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><strong>No exercise performance yet</strong><p>Log and complete a session to see your exercise trends.</p><Link className="text-link" to="/workouts">Start a workout <span aria-hidden="true">→</span></Link></div>
        )}
      </section>
    </section>
  );
}
