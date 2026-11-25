export default function StatusMessage({ kind = 'error', children }) {
  if (!children) return null;

  return (
    <p className={`status-message ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
