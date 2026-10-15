// On/off switch for publishing an exhibition. role="switch" tells screen readers it toggles.
function PublishSwitch({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="inline-flex items-center gap-3 text-sm disabled:opacity-60"
    >
      <span className={`relative h-6 w-11 rounded-full border transition-colors ${checked ? 'border-gold bg-gold' : 'border-line bg-raised'}`}>
        <span
          className={`absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full transition-transform ${checked ? 'translate-x-5 bg-canvas' : 'bg-ink-subtle'}`}
        />
      </span>
      <span className={checked ? 'text-ink' : 'text-ink-muted'}>{checked ? 'Published' : 'Draft'}</span>
    </button>
  );
}

export default PublishSwitch;
