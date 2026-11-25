import { Link } from 'react-router-dom';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';

  function handleSubmit(event) {
    event.preventDefault();
  }

  return (
    <section className="auth-page page-width">
      <div className="auth-intro">
        <span className="eyebrow">{isRegister ? 'START YOUR FOUNDATION' : 'WELCOME BACK'}</span>
        <h1>{isRegister ? <>Build your<br /><span>next chapter.</span></> : <>Good to<br /><span>see you.</span></>}</h1>
        <p>{isRegister ? 'Make a little room for a stronger routine.' : 'Your next session is one good decision away.'}</p>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>{isRegister ? 'Create your account' : 'Log in to your account'}</h2>
        <p className="auth-caption">Account access will be connected in a later phase.</p>
        {isRegister && (
          <label className="field-label">Name<input type="text" name="name" placeholder="Your name" autoComplete="name" /></label>
        )}
        <label className="field-label">Email<input type="email" name="email" placeholder="you@example.com" autoComplete="email" /></label>
        <label className="field-label">Password<input type="password" name="password" placeholder="Enter your password" autoComplete={isRegister ? 'new-password' : 'current-password'} /></label>
        <button className="button auth-submit" type="submit">{isRegister ? 'Create account' : 'Log in'} <span aria-hidden="true">↗</span></button>
        <p className="auth-switch">
          {isRegister ? 'Already have an account? ' : 'New to Forge? '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link>
        </p>
        <p className="auth-disclaimer">This form is a layout only; it does not create an account or submit your details.</p>
      </form>
    </section>
  );
}
