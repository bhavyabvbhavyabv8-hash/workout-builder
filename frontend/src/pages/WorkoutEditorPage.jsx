import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { formatApiError, workoutApi } from '../services/api.js';

const emptyExercise = () => ({
  name: '',
  muscleGroup: 'chest',
  sets: 3,
  repetitions: 10,
  weight: 0,
  durationSeconds: '',
  restSeconds: 90,
  notes: ''
});

function normalizeExercise(exercise) {
  const parsed = {
    name: exercise.name.trim(),
    muscleGroup: exercise.muscleGroup,
    sets: Number(exercise.sets),
    repetitions: Number(exercise.repetitions),
    weight: Number(exercise.weight || 0),
    restSeconds: exercise.restSeconds === '' ? undefined : Number(exercise.restSeconds),
    notes: exercise.notes?.trim() || undefined
  };
  if (exercise.durationSeconds !== '') parsed.durationSeconds = Number(exercise.durationSeconds);
  return parsed;
}

export default function WorkoutEditorPage() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(workoutId);
  const [form, setForm] = useState({ name: '', description: '', exercises: [emptyExercise()] });
  const [loading, setLoading] = useState(editing);
  const [loadedWorkout, setLoadedWorkout] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    workoutApi.get(workoutId)
      .then(({ workout }) => {
        if (!active) return;
        setForm({
          name: workout.name,
          description: workout.description || '',
          exercises: workout.exercises.map((exercise) => ({
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: exercise.sets,
            repetitions: exercise.repetitions,
            weight: exercise.weight,
            durationSeconds: exercise.durationSeconds ?? '',
            restSeconds: exercise.restSeconds ?? '',
            notes: exercise.notes || ''
          }))
        });
        setLoadedWorkout(true);
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
  }, [editing, workoutId]);

  function updateWorkoutField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateExercise(index, field, value) {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? { ...exercise, [field]: value } : exercise
      )
    }));
  }

  function addExercise() {
    setForm((current) => ({ ...current, exercises: [...current.exercises, emptyExercise()] }));
  }

  function removeExercise(index) {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.filter((_, exerciseIndex) => exerciseIndex !== index)
    }));
  }

  async function saveWorkout(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      exercises: form.exercises.map(normalizeExercise)
    };

    try {
      const result = editing
        ? await workoutApi.update(workoutId, body)
        : await workoutApi.create(body);
      navigate(`/workouts/${result.workout._id}`, {
        replace: true,
        state: { notice: editing ? 'Workout changes saved.' : 'Workout created.' }
      });
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading workout…" />;
  if (editing && !loadedWorkout) {
    return (
      <section className="app-page page-width">
        <StatusMessage>{error || 'Workout could not be loaded.'}</StatusMessage>
        <Link className="text-link" to="/workouts">Back to workouts <span aria-hidden="true">→</span></Link>
      </section>
    );
  }

  return (
    <section className="app-page page-width editor-page">
      <div className="app-page-heading">
        <div>
          <span className="eyebrow">{editing ? 'EDIT YOUR PLAN' : 'NEW WORKOUT'}</span>
          <h1>{editing ? 'Refine the plan.' : <>Build your<br /><span>blueprint.</span></>}</h1>
          <p>Set your exercise order, targets, and recovery time.</p>
        </div>
        <Link className="text-link" to={editing ? `/workouts/${workoutId}` : '/workouts'}>Cancel <span aria-hidden="true">→</span></Link>
      </div>
      <StatusMessage>{error}</StatusMessage>
      <form className="editor-form" onSubmit={saveWorkout}>
        <section className="form-panel">
          <h2>Workout details</h2>
          <label className="field-label">
            Workout name
            <input name="name" value={form.name} onChange={updateWorkoutField} required minLength={1} maxLength={120} placeholder="e.g. Upper body A" />
          </label>
          <label className="field-label">
            Description <span className="optional-label">Optional</span>
            <textarea name="description" value={form.description} onChange={updateWorkoutField} maxLength={1000} rows={3} placeholder="What is this session focused on?" />
          </label>
        </section>

        <div className="section-title-row exercise-editor-heading">
          <div><span className="eyebrow">THE MOVEMENTS</span><h2>Exercises <span className="count-pill">{form.exercises.length}</span></h2></div>
          <button className="button button-outline" type="button" onClick={addExercise}>Add exercise <span aria-hidden="true">+</span></button>
        </div>

        {form.exercises.map((exercise, index) => (
          <section className="form-panel exercise-editor-card" key={index}>
            <div className="exercise-editor-title">
              <span className="feature-number">EXERCISE {String(index + 1).padStart(2, '0')}</span>
              <button className="subtle-link danger-link" type="button" onClick={() => removeExercise(index)} aria-label={`Remove exercise ${index + 1}`}>Remove</button>
            </div>
            <div className="form-grid">
              <label className="field-label field-span-two">
                Exercise name
                <input value={exercise.name} onChange={(event) => updateExercise(index, 'name', event.target.value)} required maxLength={100} placeholder="e.g. Barbell bench press" />
              </label>
              <label className="field-label">
                Muscle group
                <select value={exercise.muscleGroup} onChange={(event) => updateExercise(index, 'muscleGroup', event.target.value)} required>
                  <option value="chest">Chest</option><option value="back">Back</option><option value="shoulders">Shoulders</option>
                  <option value="arms">Arms</option><option value="legs">Legs</option><option value="core">Core</option><option value="full-body">Full body</option>
                </select>
              </label>
              <label className="field-label">Sets
                <input type="number" value={exercise.sets} onChange={(event) => updateExercise(index, 'sets', event.target.value)} required min={1} max={30} step={1} />
              </label>
              <label className="field-label">Repetitions
                <input type="number" value={exercise.repetitions} onChange={(event) => updateExercise(index, 'repetitions', event.target.value)} required min={1} max={1000} step={1} />
              </label>
              <label className="field-label">Weight
                <input type="number" value={exercise.weight} onChange={(event) => updateExercise(index, 'weight', event.target.value)} min={0} max={100000} step="any" />
              </label>
              <label className="field-label">Rest (seconds)
                <input type="number" value={exercise.restSeconds} onChange={(event) => updateExercise(index, 'restSeconds', event.target.value)} min={0} max={3600} step={1} />
              </label>
              <label className="field-label">Duration (seconds) <span className="optional-label">Optional</span>
                <input type="number" value={exercise.durationSeconds} onChange={(event) => updateExercise(index, 'durationSeconds', event.target.value)} min={0} max={86400} step={1} />
              </label>
              <label className="field-label field-span-two">Notes <span className="optional-label">Optional</span>
                <textarea value={exercise.notes} onChange={(event) => updateExercise(index, 'notes', event.target.value)} maxLength={1000} rows={2} placeholder="Technique reminders or variations" />
              </label>
            </div>
          </section>
        ))}

        {!form.exercises.length && <div className="empty-state"><p>No exercises added. You can save the plan and edit it later.</p></div>}
        <div className="form-footer">
          <button className="button" type="submit" disabled={saving}>{saving ? 'Saving workout…' : 'Save workout'} <span aria-hidden="true">↗</span></button>
          <span>Your workout is saved to your account.</span>
        </div>
      </form>
    </section>
  );
}
