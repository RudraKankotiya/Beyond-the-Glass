import { useEffect } from 'react';

// Sets the browser tab title, e.g. "Exhibitions | Beyond the Glass"
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Beyond the Glass` : 'Beyond the Glass';
  }, [title]);
}
