import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import StatusMessage from '../components/StatusMessage.jsx';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { status, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (isRegister && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        await register({ name: form.name, email: form.email, password: form.password });
        navigate('/login', {
          replace: true,
          state: { notice: 'Your account was created. Log in to continue.' }
        });
      } else {
        await login({ email: form.email, password: form.password });
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
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
        <p className="auth-caption">{isRegister ? 'Start with an account that belongs to you.' : 'Your training is waiting.'}</p>
        {location.state?.notice && <StatusMessage kind="success">{location.state.notice}</StatusMessage>}
        <StatusMessage>{error}</StatusMessage>
        {isRegister && (
          <label className="field-label">
            Full name
            <input type="text" name="name" placeholder="Your name" autoComplete="name" value={form.name} onChange={updateField} required minLength={2} maxLength={80} />
          </label>
        )}
        <label className="field-label">
          Email
          <input type="email" name="email" placeholder="you@example.com" autoComplete="email" value={form.email} onChange={updateField} required maxLength={254} />
        </label>
        <label className="field-label">
          Password
          <input type="password" name="password" placeholder="Enter your password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={updateField} required minLength={isRegister ? 10 : 1} maxLength={128} />
        </label>
        {isRegister && (
          <>
            <p className="field-hint">Use at least 10 characters, including an uppercase letter, a lowercase letter, and a number.</p>
            <label className="field-label">
              Confirm password
              <input type="password" name="confirmPassword" placeholder="Re-enter your password" autoComplete="new-password" value={form.confirmPassword} onChange={updateField} required maxLength={128} />
            </label>
          </>
        )}
        <button className="button auth-submit" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'} <span aria-hidden="true">↗</span>
        </button>
        <p className="auth-switch">
          {isRegister ? 'Already have an account? ' : 'New to Forge? '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link>
        </p>
      </form>
    </section>
  );
}
