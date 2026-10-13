import { useGLTF } from '@react-three/drei';
import { DRACO_DECODER_PATH } from './viewerSettings.js';

const started = new Set();

// Starts downloading (and parsing) a model before it is needed - e.g. when the pointer moves onto
// an artifact card - so the artifact page opens faster. useGLTF caches it under its URL, and the
// viewer later reads it from that cache.
export function preloadModel(url) {
  if (!url || started.has(url)) return;
  started.add(url);
  useGLTF.preload(url, DRACO_DECODER_PATH);
}
