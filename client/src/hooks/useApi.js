import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios.js';

// Fetches `path` from the API whenever it changes.
// Returns { data, error, isLoading, reload }. Pass null to skip fetching.
//
//   const { data, isLoading, error } = useApi(`/artifacts/${slug}`);
export default function useApi(path) {
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = path ? `${path}#${reloadCount}` : null;
  // The last answer, labelled with the request it belongs to
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    if (!requestKey) return;
    // If the request changes before the answer arrives (e.g. the visitor clicks to the next page),
    // ignore the old answer so it can't overwrite the newer one.
    let ignore = false;
    api
      .get(path)
      .then(({ data }) => !ignore && setResult({ key: requestKey, data, error: null }))
      .catch((error) => !ignore && setResult({ key: requestKey, data: null, error }));
    return () => {
      ignore = true;
    };
  }, [requestKey]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  // Still loading = the answer we hold is not for the current request yet. (The previous data
  // stays available meanwhile, so lists can keep showing while the next page loads.)
  const isLoading = Boolean(requestKey) && result.key !== requestKey;
  return {
    data: path ? result.data : null,
    error: isLoading ? null : result.error,
    isLoading,
    reload,
  };
}
