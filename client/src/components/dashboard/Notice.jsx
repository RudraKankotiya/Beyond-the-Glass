// A short confirmation ("Artifact saved") or error message at the top of a dashboard page
function Notice({ tone = 'success', children }) {
  if (!children) return null;
  const isError = tone === 'error';
  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`mb-6 rounded-sm border px-4 py-3 text-sm ${
        isError ? 'border-danger/40 bg-danger/10 text-danger' : 'border-gold-deep bg-gold/10 text-ink'
      }`}
    >
      {children}
    </p>
  );
}

export default Notice;
