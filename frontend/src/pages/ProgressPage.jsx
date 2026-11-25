import { Link } from 'react-router-dom';

export default function ProgressPage() {
  return (
    <section className="simple-page page-width">
      <span className="eyebrow">PROGRESS</span>
      <h1>Small steps.<br /><span>Real strength.</span></h1>
      <p className="simple-page-copy">Progress tracking is planned around your recorded sessions and exercise history. Those logging flows are not connected yet.</p>
      <div className="notice-card">
        <span className="notice-icon" aria-hidden="true">↗</span>
        <div><strong>Your progress data will live here</strong><p>No sample stats or placeholder results are shown as real training data.</p></div>
      </div>
      <Link className="text-link" to="/">Back to home <span aria-hidden="true">→</span></Link>
    </section>
  );
}
