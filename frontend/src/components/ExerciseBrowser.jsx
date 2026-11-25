import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from './LoadingState.jsx';
import StatusMessage from './StatusMessage.jsx';
import { exerciseApi, formatApiError } from '../services/api.js';

const EMPTY_FILTERS = { q: '', muscleGroup: '', equipment: '', difficulty: '' };

export default function ExerciseBrowser({ onSelect, onClose, refreshKey = 0 }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ exercises: [], total: 0, page: 1, limit: 12 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 12;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    exerciseApi.list({ ...appliedFilters, page, limit })
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
  }, [appliedFilters, page, refreshKey]);

  function submitFilters() {
    setPage(1);
    setAppliedFilters(filters);
  }

  function submitOnEnter(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitFilters();
    }
  }

  return (
    <section className="exercise-browser" aria-label="Exercise library">
      <div className="exercise-browser-heading">
        <div><span className="eyebrow">MOVEMENT LIBRARY</span><h3>Find an exercise</h3></div>
        {onClose && <button className="subtle-link" type="button" onClick={onClose}>Close</button>}
      </div>
      <div className="exercise-filter-form" role="search">
        <label className="field-label">Search by name
          <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} onKeyDown={submitOnEnter} maxLength={100} placeholder="e.g. squat" />
        </label>
        <label className="field-label">Muscle group
          <select value={filters.muscleGroup} onChange={(event) => setFilters((current) => ({ ...current, muscleGroup: event.target.value }))}>
            <option value="">All muscle groups</option><option value="chest">Chest</option><option value="back">Back</option>
            <option value="shoulders">Shoulders</option><option value="arms">Arms</option><option value="legs">Legs</option>
            <option value="core">Core</option><option value="full-body">Full body</option>
          </select>
        </label>
        <label className="field-label">Equipment
          <input value={filters.equipment} onChange={(event) => setFilters((current) => ({ ...current, equipment: event.target.value }))} onKeyDown={submitOnEnter} maxLength={80} placeholder="Any equipment" />
        </label>
        <label className="field-label">Difficulty
          <select value={filters.difficulty} onChange={(event) => setFilters((current) => ({ ...current, difficulty: event.target.value }))}>
            <option value="">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select>
        </label>
        <button className="button button-small" type="button" onClick={submitFilters}>Search <span aria-hidden="true">↗</span></button>
      </div>

      <StatusMessage>{error}</StatusMessage>
      {loading ? <LoadingState message="Searching exercises…" /> : result.exercises.length ? (
        <>
          <div className="exercise-browser-results">
            {result.exercises.map((exercise) => (
              <article className="exercise-library-card" key={exercise._id}>
                <div className="exercise-library-card-top"><span className="eyebrow">{exercise.muscleGroup}</span><span className="difficulty-tag">{exercise.difficulty}</span></div>
                <h4>{exercise.name}</h4>
                <p><strong>Targets:</strong> {exercise.targetMuscles?.join(', ') || exercise.muscleGroup}</p>
                <p><strong>Equipment:</strong> {exercise.equipment || 'Not specified'}</p>
                {exercise.instructions && <p className="exercise-instructions">{exercise.instructions}</p>}
                {onSelect ? (
                  <button className="text-link exercise-select-button" type="button" onClick={() => onSelect(exercise)}>Add to workout <span aria-hidden="true">+</span></button>
                ) : (
                  <Link className="text-link exercise-select-button" to="/workouts/new">Build a workout with this <span aria-hidden="true">→</span></Link>
                )}
              </article>
            ))}
          </div>
          <div className="exercise-pagination">
            <span>{result.total} exercises · page {page} of {Math.max(1, Math.ceil(result.total / limit))}</span>
            <div>
              <button className="button button-outline button-small" type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= 1}>Previous</button>
              <button className="button button-outline button-small" type="button" onClick={() => setPage((current) => current + 1)} disabled={page * limit >= result.total}>Next</button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state"><strong>No exercises match those filters</strong><p>Try a different search or clear one of the filters.</p></div>
      )}
    </section>
  );
}
