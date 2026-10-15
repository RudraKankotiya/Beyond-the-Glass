import { useEffect, useState } from 'react';

// Gives a temporary URL for a File the user picked, so it can be previewed before uploading:
// an <img src> for an image, or the 3D viewer for a .glb.
//
// URL.createObjectURL(file) returns something like "blob:http://localhost:5173/3f2a…" that points
// at the file in the browser's memory - nothing is sent to the server.
export default function useObjectUrl(file) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    // Free the memory when another file is chosen or the form closes
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}
