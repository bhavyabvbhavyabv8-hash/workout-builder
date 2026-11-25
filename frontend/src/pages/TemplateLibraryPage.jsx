import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LoadingState from '../components/LoadingState.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { formatApiError, templateApi } from '../services/api.js';

export default function TemplateLibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  async function loadTemplates() {
    setError('');
    setLoading(true);
    try {
      const { templates: savedTemplates } = await templateApi.list();
      setTemplates(savedTemplates);
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  async function useTemplate(template) {
    setBusy(template._id);
    setError('');
    try {
      const { workout } = await templateApi.use(template._id);
      navigate(`/workouts/${workout._id}`, { state: { notice: `Created from ${template.name}.` } });
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setBusy('');
    }
  }

  async function deleteTemplate(template) {
    if (!window.confirm(`Delete your “${template.name}” template?`)) return;
    setBusy(template._id);
    setError('');
    try {
      await templateApi.delete(template._id);
      setTemplates((current) => current.filter((entry) => entry._id !== template._id));
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setBusy('');
    }
  }

  if (loading) return <LoadingState message="Loading workout templates…" />;

  return (
    <section className="app-page page-width">
      <div className="app-page-heading">
        <div><span className="eyebrow">REUSABLE PLANS</span><h1>Start with a<br /><span>template.</span></h1><p>Use a starter plan, or save your own template to build from again.</p></div>
        <Link className="button" to="/templates/new">Create template <span aria-hidden="true">↗</span></Link>
      </div>
      {location.state?.notice && <StatusMessage kind="success">{location.state.notice}</StatusMessage>}
      <StatusMessage>{error}</StatusMessage>
      {templates.length ? (
        <div className="template-grid">
          {templates.map((template) => (
            <article className="template-card" key={template._id}>
              <div className="exercise-library-card-top"><span className="eyebrow">{template.isBuiltIn ? 'STARTER PLAN' : 'YOUR TEMPLATE'}</span><span className="difficulty-tag">{template.difficulty}</span></div>
              <h2>{template.name}</h2>
              <p>{template.description || 'A reusable training plan.'}</p>
              <div className="template-meta"><span>{template.category}</span><span>{template.durationMinutes} min</span><span>{template.exercises.length} exercises</span></div>
              <div className="tile-exercises">
                {template.exercises.slice(0, 4).map((exercise) => <span key={`${exercise.name}-${exercise.order}`}>{exercise.name}</span>)}
                {template.exercises.length > 4 && <span>+{template.exercises.length - 4} more</span>}
              </div>
              <div className="tile-actions">
                <button className="button button-small" type="button" onClick={() => useTemplate(template)} disabled={busy !== ''}>
                  {busy === template._id ? 'Creating…' : 'Create workout'} <span aria-hidden="true">↗</span>
                </button>
                {!template.isBuiltIn && <div>
                  <Link className="subtle-link" to={`/templates/${template._id}/edit`}>Edit</Link>
                  <button className="subtle-link danger-link" type="button" onClick={() => deleteTemplate(template)} disabled={busy !== ''}>Delete</button>
                </div>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state large"><h2>No templates available</h2><p>Starter templates are seeded when the backend starts. You can create one here, too.</p><Link className="button" to="/templates/new">Create template <span aria-hidden="true">↗</span></Link></div>
      )}
    </section>
  );
}
