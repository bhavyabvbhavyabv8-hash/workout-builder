import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { formatApiError, workoutApi } from '../services/api.js';

export default function WorkoutBuilderPage() {
  const [workouts, setWorkouts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState('');

  async function loadWorkouts() {
    setLoading(true);
    setError('');
    try {
      const result = await workoutApi.list();
      setWorkouts(result.workouts);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkouts();
  }, []);

  async function deleteWorkout(workout) {
    if (!window.confirm(`Delete “${workout.name}”? Completed session history will be kept.`)) return;
    setDeleting(workout._id);
    setError('');
    try {
      await workoutApi.delete(workout._id);
      setWorkouts((current) => current.filter((entry) => entry._id !== workout._id));
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setDeleting('');
    }
  }

  if (loading) return <LoadingState message="Loading your workouts…" />;

  return (
    <section className="app-page page-width">
      <div className="app-page-heading">
        <div>
          <span className="eyebrow">WORKOUT BUILDER</span>
          <h1>Your training,<br /><span>your blueprint.</span></h1>
          <p>Create reusable plans and keep your exercise targets together.</p>
        </div>
        <Link className="button" to="/workouts/new">Create workout <span aria-hidden="true">↗</span></Link>
      </div>
      <StatusMessage>{error}</StatusMessage>
      {workouts.length ? (
        <div className="workout-grid">
          {workouts.map((workout) => (
            <article className="workout-tile" key={workout._id}>
              <span className="tile-index">{String(workout.exercises.length).padStart(2, '0')} EXERCISES</span>
              <h2><Link to={`/workouts/${workout._id}`}>{workout.name}</Link></h2>
              <p>{workout.description || 'A plan ready for your next session.'}</p>
              <div className="tile-exercises">
                {workout.exercises.slice(0, 3).map((exercise) => (
                  <span key={exercise._id}>{exercise.name}</span>
                ))}
                {workout.exercises.length > 3 && <span>+{workout.exercises.length - 3} more</span>}
              </div>
              <div className="tile-actions">
                <Link className="text-link" to={`/workouts/${workout._id}`}>Open workout <span aria-hidden="true">→</span></Link>
                <div>
                  <Link className="subtle-link" to={`/workouts/${workout._id}/edit`}>Edit</Link>
                  <button className="subtle-link danger-link" type="button" onClick={() => deleteWorkout(workout)} disabled={deleting === workout._id}>
                    {deleting === workout._id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : error ? (
        <div className="empty-state"><strong>Workouts could not be loaded</strong><p>Retry once the API connection is available.</p><button className="button button-outline" type="button" onClick={loadWorkouts}>Retry</button></div>
      ) : (
        <div className="empty-state large">
          <span className="empty-mark" aria-hidden="true">✳</span>
          <h2>No workouts saved yet</h2>
          <p>Create your first plan with exercises, sets, reps, and rest targets.</p>
          <Link className="button" to="/workouts/new">Build your first workout <span aria-hidden="true">↗</span></Link>
        </div>
      )}
    </section>
  );
}
