import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import ExerciseBrowser from '../components/ExerciseBrowser.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { formatApiError, templateApi, workoutApi } from '../services/api.js';

const emptyExercise = () => ({
  name: '',
  muscleGroup: 'chest',
  exerciseId: '',
  sets: 3,
  repetitions: 10,
  weight: 0,
  durationSeconds: '',
  restSeconds: 90,
  notes: ''
});

function normalizeExercise(exercise) {
  const parsed = {
    ...(exercise.exerciseId ? { exerciseId: exercise.exerciseId } : {}),
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

export default function WorkoutEditorPage({ mode = 'workout' }) {
  const { workoutId, templateId } = useParams();
  const navigate = useNavigate();
  const recordId = mode === 'template' ? templateId : workoutId;
  const editing = Boolean(recordId);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'custom',
    difficulty: 'intermediate',
    durationMinutes: 45,
    exercises: []
  });
  const [loading, setLoading] = useState(editing);
  const [loadedWorkout, setLoadedWorkout] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    const request = mode === 'template' ? templateApi.get(recordId) : workoutApi.get(recordId);
    request
      .then((result) => {
        if (!active) return;
        const workout = result.workout || result.template;
        setForm({
          name: workout.name,
          description: workout.description || '',
          category: workout.category || 'custom',
          difficulty: workout.difficulty || 'intermediate',
          durationMinutes: workout.durationMinutes || 45,
          exercises: workout.exercises.map((exercise) => ({
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            exerciseId: exercise.exercise || '',
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
  }, [editing, mode, recordId]);

  function updateWorkoutField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateExercise(index, field, value) {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index
          ? {
              ...exercise,
              [field]: value,
              ...(field === 'name' || field === 'muscleGroup' ? { exerciseId: '' } : {})
            }
          : exercise
      )
    }));
  }

  function moveExercise(index, direction) {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.exercises.length) return current;
      const exercises = [...current.exercises];
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
      return { ...current, exercises };
    });
  }

  function selectLibraryExercise(exercise) {
    setForm((current) => ({
      ...current,
      exercises: [
        ...current.exercises.filter((entry) => entry.name.trim()),
        { ...emptyExercise(), name: exercise.name, muscleGroup: exercise.muscleGroup, exerciseId: exercise._id }
      ]
    }));
    setPickerOpen(false);
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
      category: form.category,
      difficulty: form.difficulty,
      durationMinutes: Number(form.durationMinutes),
      exercises: form.exercises.map(normalizeExercise)
    };

    try {
      if (mode === 'template') {
        const result = editing
          ? await templateApi.update(recordId, body)
          : await templateApi.create(body);
        navigate('/templates', {
          replace: true,
          state: { notice: editing ? 'Template changes saved.' : 'Template created.' }
        });
        return result;
      }
      const result = editing
        ? await workoutApi.update(recordId, body)
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
        <StatusMessage>{error || `${mode === 'template' ? 'Template' : 'Workout'} could not be loaded.`}</StatusMessage>
        <Link className="text-link" to={mode === 'template' ? '/templates' : '/workouts'}>Back to {mode === 'template' ? 'templates' : 'workouts'} <span aria-hidden="true">→</span></Link>
      </section>
    );
  }

  return (
    <section className="app-page page-width editor-page">
      <div className="app-page-heading">
        <div>
          <span className="eyebrow">{mode === 'template' ? 'REUSABLE PLAN TEMPLATE' : editing ? 'EDIT YOUR PLAN' : 'NEW WORKOUT'}</span>
          <h1>{editing ? 'Refine the plan.' : mode === 'template' ? <>Save a starting<br /><span>blueprint.</span></> : <>Build your<br /><span>blueprint.</span></>}</h1>
          <p>Set the workout details, exercise order, training targets, and recovery time.</p>
        </div>
        <Link className="text-link" to={editing ? (mode === 'template' ? '/templates' : `/workouts/${recordId}`) : (mode === 'template' ? '/templates' : '/workouts')}>Cancel <span aria-hidden="true">→</span></Link>
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
          <div className="form-grid">
            <label className="field-label">Category
              <select name="category" value={form.category} onChange={updateWorkoutField}>
                <option value="custom">Custom</option><option value="strength">Strength</option><option value="hypertrophy">Hypertrophy</option>
                <option value="conditioning">Conditioning</option><option value="mobility">Mobility</option>
              </select>
            </label>
            <label className="field-label">Difficulty
              <select name="difficulty" value={form.difficulty} onChange={updateWorkoutField}>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="field-label">Estimated duration (minutes)
              <input name="durationMinutes" type="number" value={form.durationMinutes} onChange={updateWorkoutField} required min={1} max={600} step={1} />
            </label>
          </div>
        </section>

        <div className="section-title-row exercise-editor-heading">
          <div><span className="eyebrow">THE MOVEMENTS</span><h2>Exercises <span className="count-pill">{form.exercises.length}</span></h2></div>
          <div className="exercise-add-actions">
            <button className="button button-outline" type="button" onClick={() => setPickerOpen((open) => !open)}>{pickerOpen ? 'Close library' : 'Browse library'} <span aria-hidden="true">⌕</span></button>
            <button className="button button-outline" type="button" onClick={addExercise}>Add custom <span aria-hidden="true">+</span></button>
          </div>
        </div>

        {pickerOpen && <ExerciseBrowser onSelect={selectLibraryExercise} onClose={() => setPickerOpen(false)} />}
        {form.exercises.map((exercise, index) => (
          <section className="form-panel exercise-editor-card" key={index}>
            <div className="exercise-editor-title">
              <span className="feature-number">EXERCISE {String(index + 1).padStart(2, '0')}</span>
              <div className="exercise-order-actions">
                <button className="subtle-link" type="button" onClick={() => moveExercise(index, -1)} disabled={index === 0} aria-label={`Move exercise ${index + 1} up`}>↑</button>
                <button className="subtle-link" type="button" onClick={() => moveExercise(index, 1)} disabled={index === form.exercises.length - 1} aria-label={`Move exercise ${index + 1} down`}>↓</button>
                <button className="subtle-link danger-link" type="button" onClick={() => removeExercise(index)} aria-label={`Remove exercise ${index + 1}`}>Remove</button>
              </div>
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
          <button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : mode === 'template' ? 'Save template' : 'Save workout'} <span aria-hidden="true">↗</span></button>
          <span>{mode === 'template' ? 'This template is saved to your account.' : 'Your workout is saved to your account.'}</span>
        </div>
      </form>
    </section>
  );
}
