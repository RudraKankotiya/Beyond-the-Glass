// Fills the viewer area with a short message (used for "no model yet" and load errors)
function ViewerMessage({ title, children, action }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      {children && <p className="max-w-sm text-sm text-ink-muted">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export default ViewerMessage;
