import { useState } from 'react';
import ExerciseBrowser from '../components/ExerciseBrowser.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { exerciseApi, formatApiError } from '../services/api.js';

const EMPTY_EXERCISE = {
  name: '',
  muscleGroup: 'chest',
  targetMuscles: '',
  equipment: '',
  difficulty: 'beginner',
  instructions: ''
};

export default function ExerciseLibraryPage() {
  const [form, setForm] = useState(EMPTY_EXERCISE);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function createExercise(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await exerciseApi.create({
        ...form,
        targetMuscles: form.targetMuscles.split(',').map((muscle) => muscle.trim()).filter(Boolean),
        equipment: form.equipment.trim(),
        instructions: form.instructions.trim()
      });
      setForm(EMPTY_EXERCISE);
      setNotice('Your exercise is now in your personal library.');
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-page page-width">
      <div className="app-page-heading">
        <div><span className="eyebrow">EXERCISE LIBRARY</span><h1>Find your next<br /><span>movement.</span></h1><p>Search the built-in catalog and your own exercises by name, muscle group, equipment, or difficulty.</p></div>
      </div>
      <StatusMessage>{error}</StatusMessage>
      <StatusMessage kind="success">{notice}</StatusMessage>
      <ExerciseBrowser refreshKey={refreshKey} />

      <details className="custom-exercise-disclosure">
        <summary>Create a personal exercise</summary>
        <form className="form-panel custom-exercise-form" onSubmit={createExercise}>
          <h2>Add an exercise to your library</h2>
          <div className="form-grid">
            <label className="field-label field-span-two">Exercise name
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required minLength={1} maxLength={100} />
            </label>
            <label className="field-label">Muscle group
              <select value={form.muscleGroup} onChange={(event) => setForm((current) => ({ ...current, muscleGroup: event.target.value }))}>
                <option value="chest">Chest</option><option value="back">Back</option><option value="shoulders">Shoulders</option>
                <option value="arms">Arms</option><option value="legs">Legs</option><option value="core">Core</option><option value="full-body">Full body</option>
              </select>
            </label>
            <label className="field-label">Target muscles
              <input value={form.targetMuscles} onChange={(event) => setForm((current) => ({ ...current, targetMuscles: event.target.value }))} maxLength={500} placeholder="Separate with commas" />
            </label>
            <label className="field-label">Equipment
              <input value={form.equipment} onChange={(event) => setForm((current) => ({ ...current, equipment: event.target.value }))} maxLength={80} />
            </label>
            <label className="field-label">Difficulty
              <select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="field-label field-span-two">Instructions
              <textarea value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} maxLength={2000} rows={3} />
            </label>
          </div>
          <button className="button" type="submit" disabled={saving}>{saving ? 'Saving exercise…' : 'Save exercise'} <span aria-hidden="true">↗</span></button>
        </form>
      </details>
    </section>
  );
}
