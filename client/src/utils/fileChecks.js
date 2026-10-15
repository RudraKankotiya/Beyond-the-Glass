// The same rules the server's upload middleware uses, checked in the browser first so the
// curator gets a clear message before waiting for an upload that would be rejected.
const MB = 1024 * 1024;

export const MODEL_MAX_MB = 25;
export const IMAGE_MAX_MB = 2;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Returns an error message, or '' when the file is fine
export const checkModelFile = (file) => {
  if (!file.name.toLowerCase().endsWith('.glb')) return 'The 3D model must be a .glb file.';
  if (file.size > MODEL_MAX_MB * MB) return `The 3D model must be at most ${MODEL_MAX_MB} MB.`;
  return '';
};

export const checkImageFile = (file) => {
  if (!IMAGE_TYPES.includes(file.type)) return 'The image must be a JPG, PNG or WebP file.';
  if (file.size > IMAGE_MAX_MB * MB) return `The image must be at most ${IMAGE_MAX_MB} MB.`;
  return '';
};

export const formatFileSize = (bytes) =>
  bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
