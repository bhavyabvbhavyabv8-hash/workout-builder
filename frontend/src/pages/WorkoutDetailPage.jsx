import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { formatApiError, sessionApi, workoutApi } from '../services/api.js';

export default function WorkoutDetailPage() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [workout, setWorkout] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let active = true;
    workoutApi.get(workoutId)
      .then(({ workout: result }) => {
        if (active) setWorkout(result);
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
  }, [workoutId]);

  async function startWorkout() {
    setError('');
    setBusy('start');
    try {
      const { session } = await sessionApi.start({ templateId: workoutId });
      navigate(`/sessions/${session._id}`);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setBusy('');
    }
  }

  async function deleteWorkout() {
    if (!window.confirm(`Delete “${workout.name}”? Your completed history will be retained.`)) return;
    setError('');
    setBusy('delete');
    try {
      await workoutApi.delete(workoutId);
      navigate('/workouts', { replace: true, state: { notice: 'Workout deleted.' } });
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setBusy('');
    }
  }

  if (loading) return <LoadingState message="Loading workout…" />;
  if (!workout) {
    return <section className="app-page page-width"><StatusMessage>{error || 'Workout not found.'}</StatusMessage><Link className="text-link" to="/workouts">Back to workouts <span aria-hidden="true">→</span></Link></section>;
  }

  return (
    <section className="app-page page-width">
      <div className="app-page-heading">
        <div>
          <span className="eyebrow">WORKOUT DETAILS</span>
          <h1>{workout.name}</h1>
          <p>{workout.description || 'A plan built around your training.'}</p>
        </div>
        <div className="heading-actions">
          <Link className="button button-outline" to={`/workouts/${workoutId}/edit`}>Edit workout</Link>
          <button className="button" type="button" onClick={startWorkout} disabled={busy !== '' || workout.exercises.length === 0}>
            {busy === 'start' ? 'Starting…' : workout.exercises.length ? 'Start workout' : 'Add exercises first'} <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
      {location.state?.notice && <StatusMessage kind="success">{location.state.notice}</StatusMessage>}
      <StatusMessage>{error}</StatusMessage>

      <div className="detail-meta"><span>{workout.exercises.length} exercises</span><span>Updated {new Date(workout.updatedAt).toLocaleDateString()}</span></div>
      {workout.exercises.length ? (
        <div className="exercise-detail-list">
          {workout.exercises.map((exercise, index) => (
            <article className="exercise-detail-row" key={exercise._id}>
              <span className="exercise-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="exercise-detail-name"><strong>{exercise.name}</strong><span>{exercise.muscleGroup} {exercise.notes ? `· ${exercise.notes}` : ''}</span></div>
              <div className="exercise-detail-target"><strong>{exercise.sets} × {exercise.repetitions}</strong><span>{exercise.weight} weight · {exercise.restSeconds ?? 0}s rest</span></div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><h2>This workout has no exercises yet</h2><p>Add movements before starting a session.</p><Link className="text-link" to={`/workouts/${workoutId}/edit`}>Edit workout <span aria-hidden="true">→</span></Link></div>
      )}
      <div className="detail-footer">
        <Link className="text-link" to="/workouts">← All workouts</Link>
        <button className="subtle-link danger-link" type="button" onClick={deleteWorkout} disabled={busy !== ''}>{busy === 'delete' ? 'Deleting…' : 'Delete workout'}</button>
      </div>
    </section>
  );
}
