import { useEffect, useState } from 'react';
import StatusMessage from './StatusMessage.jsx';
import { formatApiError, goalApi } from '../services/api.js';

export default function PersonalGoalCard() {
  const [goal, setGoal] = useState(null);
  const [progress, setProgress] = useState(null);
  const [weeklyWorkoutTarget, setWeeklyWorkoutTarget] = useState('3');
  const [totalWorkoutTarget, setTotalWorkoutTarget] = useState('12');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    goalApi.get()
      .then((result) => {
        if (!active) return;
        setGoal(result.goal);
        setProgress(result.progress);
        if (result.goal) {
          setWeeklyWorkoutTarget(String(result.goal.weeklyWorkoutTarget));
          setTotalWorkoutTarget(String(result.goal.totalWorkoutTarget));
        }
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
  }, []);

  async function saveGoal(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const body = {
        weeklyWorkoutTarget: Number(weeklyWorkoutTarget),
        totalWorkoutTarget: Number(totalWorkoutTarget)
      };
      const result = goal
        ? await goalApi.update(body)
        : await goalApi.create(body);
      setGoal(result.goal);
      setProgress(result.progress);
      setNotice(goal ? 'Goal updated.' : 'Goal saved.');
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal() {
    if (!window.confirm('Delete your current workout goals?')) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await goalApi.delete();
      setGoal(null);
      setProgress({ completedThisWeek: 0, completedTotal: 0, weeklyPercent: 0, totalPercent: 0 });
      setWeeklyWorkoutTarget('3');
      setTotalWorkoutTarget('12');
      setNotice('Goal deleted.');
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="goal-card">
      <div className="section-title-row"><div><span className="eyebrow">PERSONAL TARGETS</span><h2>Your goals</h2></div></div>
      <StatusMessage>{error}</StatusMessage>
      <StatusMessage kind="success">{notice}</StatusMessage>
      {loading ? <p className="goal-loading">Loading your saved goal…</p> : <>
        {goal && progress && <div className="goal-progress-list">
          <div className="goal-progress-item">
            <div><span>This week</span><strong>{progress.completedThisWeek} / {goal.weeklyWorkoutTarget}</strong></div>
            <div className="goal-progress-track" role="progressbar" aria-label="Weekly workout goal" aria-valuenow={progress.weeklyPercent} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress.weeklyPercent}%` }} /></div>
            <small>{progress.weeklyPercent}% of weekly target</small>
          </div>
          <div className="goal-progress-item">
            <div><span>Completed workouts</span><strong>{progress.completedTotal} / {goal.totalWorkoutTarget}</strong></div>
            <div className="goal-progress-track" role="progressbar" aria-label="Completed workout goal" aria-valuenow={progress.totalPercent} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress.totalPercent}%` }} /></div>
            <small>{progress.totalPercent}% of total target</small>
          </div>
        </div>}
        <form className="goal-form" onSubmit={saveGoal}>
          <label className="field-label">Weekly workout target
            <input type="number" value={weeklyWorkoutTarget} onChange={(event) => setWeeklyWorkoutTarget(event.target.value)} min={1} max={14} step={1} required />
          </label>
          <label className="field-label">Completed workout target
            <input type="number" value={totalWorkoutTarget} onChange={(event) => setTotalWorkoutTarget(event.target.value)} min={1} max={10000} step={1} required />
          </label>
          <div className="goal-actions">
            <button className="button button-small" type="submit" disabled={saving}>{saving ? 'Saving…' : goal ? 'Update goal' : 'Set goal'}</button>
            {goal && <button className="subtle-link danger-link" type="button" onClick={deleteGoal} disabled={saving}>Delete goal</button>}
          </div>
        </form>
      </>}
    </section>
  );
}
