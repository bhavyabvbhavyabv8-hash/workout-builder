import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { accountApi, formatApiError } from '../services/api.js';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { updateProfile, changePassword, deleteAccount } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    accountApi.get()
      .then(({ user }) => {
        if (active) setProfile({ name: user.name, email: user.email });
      })
      .catch((requestError) => {
        if (active) setError(formatApiError(requestError));
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setError('');
    setNotice('');
    try {
      const user = await updateProfile({ name: profile.name.trim(), email: profile.email.trim() });
      setProfile({ name: user.name, email: user.email });
      setNotice('Your profile has been updated.');
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      navigate('/login', { replace: true, state: { notice: 'Password changed. Log in using your new password.' } });
    } catch (requestError) {
      setError(formatApiError(requestError));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function removeAccount(event) {
    event.preventDefault();
    if (!window.confirm('Delete your account and all associated workout data? This cannot be undone.')) return;
    setAccountDeleting(true);
    setError('');
    try {
      await deleteAccount({ password: deletePassword });
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(formatApiError(requestError));
      setAccountDeleting(false);
    }
  }

  return (
    <section className="app-page page-width">
      <div className="app-page-heading">
        <div><span className="eyebrow">ACCOUNT SETTINGS</span><h1>Your profile.</h1><p>Manage your personal information and account security.</p></div>
      </div>
      <StatusMessage>{error}</StatusMessage>
      <StatusMessage kind="success">{notice}</StatusMessage>
      {profileLoading && <div className="loading-state" role="status">Loading account details…</div>}
      {!profileLoading && !profile.email && <div className="empty-state"><strong>Account details are unavailable</strong><p>Check your connection, then reload this page to try again.</p></div>}
      {!profileLoading && profile.email && (
      <div className="profile-sections">
        <form className="form-panel profile-form" onSubmit={saveProfile}>
          <span className="eyebrow">PERSONAL DETAILS</span>
          <h2>Profile information</h2>
          <p>These details are associated with your workout account.</p>
          <label className="field-label">Full name
            <input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} autoComplete="name" required minLength={2} maxLength={80} disabled={profileLoading} />
          </label>
          <label className="field-label">Email address
            <input type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} autoComplete="email" required maxLength={254} disabled={profileLoading} />
          </label>
          <button className="button" type="submit" disabled={profileLoading || profileSaving}>{profileSaving ? 'Saving…' : 'Save profile'} <span aria-hidden="true">↗</span></button>
        </form>

        <form className="form-panel profile-form" onSubmit={savePassword}>
          <span className="eyebrow">SECURITY</span>
          <h2>Change password</h2>
          <p>After changing your password, you will be asked to sign in again.</p>
          <label className="field-label">Current password
            <input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} autoComplete="current-password" required />
          </label>
          <label className="field-label">New password
            <input type="password" value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} autoComplete="new-password" required minLength={10} maxLength={128} />
          </label>
          <label className="field-label">Confirm new password
            <input type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))} autoComplete="new-password" required minLength={10} maxLength={128} />
          </label>
          <p className="form-hint">Use at least 10 characters with lowercase, uppercase, and a number.</p>
          <button className="button button-outline" type="submit" disabled={passwordSaving}>{passwordSaving ? 'Updating…' : 'Update password'} <span aria-hidden="true">↗</span></button>
        </form>

        <form className="form-panel profile-form danger-panel" onSubmit={removeAccount}>
          <span className="eyebrow">DANGER ZONE</span>
          <h2>Delete account</h2>
          <p>Deleting your account permanently removes your profile and workout data.</p>
          <label className="field-label">Confirm with your password
            <input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" required />
          </label>
          <button className="button button-danger" type="submit" disabled={accountDeleting}>{accountDeleting ? 'Deleting account…' : 'Delete my account'}</button>
        </form>
      </div>
      )}
    </section>
  );
}
