import { getErrorMessage } from '../api/axios.js';

// Shown when there is nothing to list. Says what is missing and, if possible, what to do next.
function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-sm border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-2xl text-ink">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-ink-muted">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

// Shown when a request failed, with a button to try it again
export function ErrorState({ title = 'Could not load this', error, onRetry }) {
  return (
    <div role="alert">
      <EmptyState
        title={title}
        action={
          onRetry && (
            <button type="button" onClick={onRetry} className="btn btn-outline">
              Try again
            </button>
          )
        }
      >
        {getErrorMessage(error)}
      </EmptyState>
    </div>
  );
}

export default EmptyState;
