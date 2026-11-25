import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { formatApiError, sessionApi } from '../services/api.js';

export default function ActiveWorkoutPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [sets, setSets] = useState([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSet, setSavingSet] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let active = true;
    sessionApi.get(sessionId)
      .then(({ session: result, sets: loggedSets }) => {
        if (!active) return;
        setSession(result);
        setSets(loggedSets);
        setReps(String(result.plannedExercises[0]?.repetitions || 10));
        setWeight(String(result.plannedExercises[0]?.weight || 0));
        setDurationSeconds(result.plannedExercises[0]?.durationSeconds == null ? '' : String(result.plannedExercises[0].durationSeconds));
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
  }, [sessionId]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const timerId = window.setInterval(() => {
      setRestSeconds((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [timerRunning]);

  const exercise = session?.plannedExercises[exerciseIndex];
  const exerciseSets = useMemo(
    () => exercise ? sets.filter((set) => set.exerciseName.toLowerCase() === exercise.name.toLowerCase()) : [],
    [exercise, sets]
  );
  const sessionCompleted = Boolean(session?.completedAt);
  const loggedCount = sets.length;

  function chooseExercise(index) {
    const selected = session.plannedExercises[index];
    setExerciseIndex(index);
    setReps(String(selected.repetitions));
    setWeight(String(selected.weight || 0));
    setDurationSeconds(selected.durationSeconds == null ? '' : String(selected.durationSeconds));
  }

  async function logSet(event) {
    event.preventDefault();
    if (!exercise) return;
    setSavingSet(true);
    setError('');
    const setNumber = exerciseSets.length + 1;
    try {
      const body = {
        exerciseName: exercise.name,
        setNumber,
        reps: Number(reps),
        weight: Number(weight),
        ...(durationSeconds === '' ? {} : { durationSeconds: Number(durationSeconds) })
      };
      const { set } = await sessionApi.addSet(sessionId, body);
      setSets((current) => [...current, set]);
      setRestSeconds(exercise.restSeconds || 0);
      setTimerRunning(false);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSavingSet(false);
    }
  }

  async function finishWorkout() {
    setFinishing(true);
    setError('');
    try {
      const { session: completed } = await sessionApi.complete(sessionId);
      setSession(completed);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setFinishing(false);
    }
  }

  if (loading) return <LoadingState message="Loading workout session…" />;
  if (!session) {
    return <section className="app-page page-width"><StatusMessage>{error || 'Workout session not found.'}</StatusMessage><Link className="text-link" to="/history">Go to workout history <span aria-hidden="true">→</span></Link></section>;
  }

  const plannedExercises = session.plannedExercises || [];
  const allTargetsReached = plannedExercises.length > 0 && plannedExercises.every((planned) =>
    sets.filter((set) => set.exerciseName.toLowerCase() === planned.name.toLowerCase()).length >= planned.sets
  );
  const minutes = Math.floor(restSeconds / 60);
  const seconds = String(restSeconds % 60).padStart(2, '0');

  return (
    <section className="app-page page-width active-session-page">
      <div className="app-page-heading">
        <div>
          <span className="eyebrow">{sessionCompleted ? 'SESSION COMPLETE' : 'ACTIVE WORKOUT'}</span>
          <h1>{session.name}</h1>
          <p>Started {new Date(session.startedAt).toLocaleString()}</p>
        </div>
        <Link className="text-link" to="/history">Workout history <span aria-hidden="true">→</span></Link>
      </div>
      <StatusMessage>{error}</StatusMessage>

      <div className="session-progress">
        <span><strong>{loggedCount}</strong> sets recorded</span>
        <span>{plannedExercises.length} exercises planned</span>
        {sessionCompleted && <strong className="complete-label">Completed {new Date(session.completedAt).toLocaleString()}</strong>}
      </div>

      {plannedExercises.length ? (
        <div className="active-session-grid">
          <aside className="session-exercise-nav" aria-label="Workout exercises">
            {plannedExercises.map((planned, index) => {
              const count = sets.filter((set) => set.exerciseName.toLowerCase() === planned.name.toLowerCase()).length;
              const complete = count >= planned.sets;
              return (
                <button className={`session-exercise-tab ${index === exerciseIndex ? 'selected' : ''}`} type="button" key={`${planned.name}-${index}`} onClick={() => chooseExercise(index)}>
                  <span className="exercise-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="session-tab-copy"><strong>{planned.name}</strong><small>{count}/{planned.sets} sets {complete ? '· Complete' : ''}</small></span>
                  {complete && <span className="check-mark" aria-label="Exercise complete">✓</span>}
                </button>
              );
            })}
          </aside>

          <section className="form-panel current-exercise-panel">
            {exercise && <>
              <div className="current-exercise-head">
                <div><span className="eyebrow">{exercise.muscleGroup}</span><h2>{exercise.name}</h2></div>
                <span className="target-badge">{exerciseSets.length} / {exercise.sets} sets</span>
              </div>
              {exercise.notes && <p className="exercise-notes">{exercise.notes}</p>}
              <div className="logged-set-list">
                {exerciseSets.map((set) => (
                  <div className="logged-set-row" key={set._id}>
                    <span>SET {String(set.setNumber).padStart(2, '0')}</span>
                    <strong>{set.reps} reps</strong>
                    <strong>{set.weight} weight</strong>
                    <small>{new Date(set.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                ))}
                {!exerciseSets.length && <p className="no-sets">Log your first set below. Each set is saved immediately.</p>}
              </div>

              {!sessionCompleted && <form className="set-entry-form" onSubmit={logSet}>
                <h3>Record set {exerciseSets.length + 1}</h3>
                <div className="form-grid">
                  <label className="field-label">Repetitions
                    <input type="number" value={reps} onChange={(event) => setReps(event.target.value)} min={1} max={1000} step={1} required />
                  </label>
                  <label className="field-label">Weight
                    <input type="number" value={weight} onChange={(event) => setWeight(event.target.value)} min={0} max={100000} step="any" required />
                  </label>
                  {exercise.durationSeconds != null && <label className="field-label">Duration (seconds)
                    <input type="number" value={durationSeconds} onChange={(event) => setDurationSeconds(event.target.value)} min={0} max={86400} step={1} />
                  </label>}
                </div>
                <button className="button" type="submit" disabled={savingSet || exerciseSets.length >= exercise.sets}>{savingSet ? 'Saving set…' : exerciseSets.length >= exercise.sets ? 'Target sets reached' : 'Log completed set'} <span aria-hidden="true">↗</span></button>
              </form>}
            </>}
          </section>

          <aside className="rest-timer panel-section">
            <span className="eyebrow">RECOVERY</span>
            <h2>Rest timer</h2>
            <div className="timer-display" aria-live="polite">{minutes}:{seconds}</div>
            <p>{restSeconds ? 'Take the time you need before your next set.' : 'Timer ready. Start when you need recovery time.'}</p>
            <div className="timer-actions">
              <button className="button button-small" type="button" onClick={() => { setRestSeconds(exercise?.restSeconds || 90); setTimerRunning(true); }} disabled={sessionCompleted}>Start rest</button>
              {timerRunning && <button className="text-link" type="button" onClick={() => setTimerRunning(false)}>Pause</button>}
              {restSeconds > 0 && <button className="text-link" type="button" onClick={() => { setTimerRunning(false); setRestSeconds(0); }}>Reset</button>}
            </div>
          </aside>
        </div>
      ) : (
        <div className="empty-state"><h2>No planned exercises</h2><p>This session has no exercise plan to execute.</p></div>
      )}

      <div className="session-finish">
        {sessionCompleted ? (
          <><div><strong>Session saved.</strong><p>Your completed sets are part of your workout history and progress.</p></div><Link className="button" to="/progress">View progress <span aria-hidden="true">↗</span></Link></>
        ) : (
          <><div><strong>{allTargetsReached ? 'All planned sets are recorded.' : 'Finish when you are ready.'}</strong><p>{loggedCount ? 'Your set data is saved as you go.' : 'Log at least one set before finishing this workout.'}</p></div><button className="button" type="button" onClick={finishWorkout} disabled={finishing || loggedCount === 0}>{finishing ? 'Finishing…' : 'Finish workout'} <span aria-hidden="true">↗</span></button></>
        )}
      </div>
    </section>
  );
}
