import { Link } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading.jsx';

const features = [
  {
    number: '01',
    title: 'Build your blueprint',
    text: 'Shape a training plan around your goals, your schedule, and the movements you love.'
  },
  {
    number: '02',
    title: 'Log the work',
    text: 'Capture sets, reps, and load as you train. Keep the details that make progress measurable.'
  },
  {
    number: '03',
    title: 'Earn your next level',
    text: 'Look back at your training history and find the next small, sustainable step forward.'
  }
];

function WorkoutPreview() {
  return (
    <div className="workout-card">
      <div className="card-topline">
        <span className="live-dot" /> SAMPLE WORKOUT · PREVIEW ONLY
        <span className="card-menu" aria-hidden="true">•••</span>
      </div>
      <div className="session-heading">
        <div>
          <span className="muted-label">EXAMPLE PLAN</span>
          <h2>Upper body <span className="heading-period">/</span> A</h2>
        </div>
        <span className="session-date">PREVIEW</span>
      </div>
      <div className="workout-divider" />
      <div className="exercise-row">
        <span className="exercise-index">01</span>
        <div className="exercise-name"><strong>Barbell bench press</strong><span>Chest · Compound</span></div>
        <div className="exercise-target"><strong>4 <small>sets</small></strong><span>6—8 reps</span></div>
      </div>
      <div className="exercise-row">
        <span className="exercise-index">02</span>
        <div className="exercise-name"><strong>Incline dumbbell press</strong><span>Chest · Compound</span></div>
        <div className="exercise-target"><strong>3 <small>sets</small></strong><span>8—10 reps</span></div>
      </div>
      <div className="exercise-row">
        <span className="exercise-index">03</span>
        <div className="exercise-name"><strong>Seated cable row</strong><span>Back · Compound</span></div>
        <div className="exercise-target"><strong>3 <small>sets</small></strong><span>10—12 reps</span></div>
      </div>
      <p className="preview-disclaimer">Illustrative example · no workout data saved</p>
      <Link to="/workouts" className="session-link">Explore the workout builder <span aria-hidden="true">↗</span></Link>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="hero page-width">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="kicker-line" /> BUILT FOR THE LONG GAME</div>
          <h1>Make every<br />rep <span>count.</span></h1>
          <p className="hero-description">
            A clearer way to plan your training, log your lifts, and see the strength you build over time.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/register">Start building <span aria-hidden="true">↗</span></Link>
            <Link className="text-link" to="/workouts">Explore the app <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hero-footnote"><span aria-hidden="true">✳</span> CONSISTENCY OVER PERFECTION. ALWAYS.</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-glow" />
          <div className="art-cross cross-one" />
          <div className="art-cross cross-two" />
          <div className="art-label label-top">PROGRESS IS BUILT<br />ONE SESSION AT A TIME</div>
          <div className="art-label label-bottom">STAY IN<br />YOUR REP RANGE <span>↗</span></div>
          <div className="art-index">01 — 04</div>
        </div>
        <WorkoutPreview />
      </section>

      <section className="principles page-width">
        <div className="principles-top">
          <SectionHeading eyebrow="THE METHOD" title={<>Simple tools.<br />Serious momentum.</>}>
            Training progress isn’t a guess. It’s a practice you can plan, record, and build on.
          </SectionHeading>
          <span className="principles-side-note">A BETTER WAY TO<br />SHOW UP FOR YOURSELF <span>↘</span></span>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <span className="feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-banner page-width">
        <div>
          <span className="eyebrow">YOUR NEXT REP STARTS HERE</span>
          <h2>Progress is a practice.</h2>
        </div>
        <Link className="button" to="/register">Build your foundation <span aria-hidden="true">↗</span></Link>
      </section>
    </>
  );
}
