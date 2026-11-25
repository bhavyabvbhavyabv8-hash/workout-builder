import { Link } from 'react-router-dom';

export default function WorkoutBuilderPage() {
  return (
    <section className="simple-page page-width">
      <span className="eyebrow">WORKOUT BUILDER</span>
      <h1>Your training,<br /><span>your blueprint.</span></h1>
      <p className="simple-page-copy">The workout planning interface is part of the next phase. The data model is ready for templates and exercise targets.</p>
      <div className="notice-card">
        <span className="notice-icon" aria-hidden="true">✳</span>
        <div><strong>Builder coming in a later phase</strong><p>Workout creation and saving are not connected yet.</p></div>
      </div>
      <Link className="text-link" to="/">Back to home <span aria-hidden="true">→</span></Link>
    </section>
  );
}
