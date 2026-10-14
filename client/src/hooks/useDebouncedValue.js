import { useEffect, useState } from 'react';

// Returns `value`, but only after it has stopped changing for `delay` milliseconds.
// Used for search-as-you-type: one request after the visitor pauses, not one per key press.
export default function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // a new key press cancels the waiting update
  }, [value, delay]);

  return debounced;
}
