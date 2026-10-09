import { useId } from 'react';

// Label + form control pair. Extra props (type, value, onChange, required, ...) go to the control.
// as: 'input' (default), 'textarea' or 'select' (pass the <option>s as children)
function FormField({ label, hint, as: Control = 'input', children, ...controlProps }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <Control id={id} aria-describedby={hintId} className="field-input" {...controlProps}>
        {children}
      </Control>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

export default FormField;
