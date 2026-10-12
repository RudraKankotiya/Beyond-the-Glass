import { Suspense, useCallback, useImperativeHandle, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import FitCamera from './FitCamera.jsx';
import Lighting from './Lighting.jsx';
import Loader from './Loader.jsx';
import Model from './Model.jsx';
import ViewerErrorBoundary from './ViewerErrorBoundary.jsx';
import ViewerMessage from './ViewerMessage.jsx';
import { DEFAULT_LIGHTING, LIGHTING_PRESETS } from './lightingPresets.js';
import {
  CAMERA_FOV,
  DEFAULT_CAMERA_POSITION,
  MAX_PAN_DISTANCE,
  MAX_ZOOM_DISTANCE,
  MIN_ZOOM_DISTANCE,
} from './viewerSettings.js';

// Simplified 3D viewer: one clean <Canvas> showing one model.
// Reset, fullscreen, auto-rotate, points of interest, and light mode controls have been removed for simplicity.
function ModelViewer({
  modelUrl,
  poster,
  initialCameraPosition = DEFAULT_CAMERA_POSITION,
  onModelClick,
  interactive = true,
  title = '3D model',
  className = 'h-[60vh] min-h-80 rounded-sm border border-line',
  ref,
}) {
  const containerRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const floorYRef = useRef(-1);

  useImperativeHandle(ref, () => ({
    getCameraView() {
      const { camera, controls } = cameraRef.current ?? {};
      if (!camera) return null;
      const view = camera.position.clone();
      if (controls) view.sub(controls.target);
      return view.toArray().map((n) => Number(n.toFixed(3)));
    },
  }));

  const handleFit = useCallback((floorY) => {
    floorYRef.current = floorY;
  }, []);

  const keepTargetInBounds = useCallback(() => {
    const target = controlsRef.current?.target;
    if (!target) return;
    if (target.y < floorYRef.current) target.y = floorYRef.current;
    if (target.length() > MAX_PAN_DISTANCE) target.setLength(MAX_PAN_DISTANCE);
  }, []);

  const preset = LIGHTING_PRESETS[DEFAULT_LIGHTING];

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`3D viewer: ${title}`}
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: preset.background }}
    >
      {!modelUrl ? (
        <ViewerMessage title="No 3D model yet">This artifact&apos;s 3D model has not been uploaded.</ViewerMessage>
      ) : (
        <ViewerErrorBoundary key={modelUrl} onRetry={() => useGLTF.clear(modelUrl)}>
          {interactive && (
            <p className="sr-only">Drag to rotate the model, scroll or pinch to zoom, and right-drag to move the view.</p>
          )}

          <Suspense fallback={<Loader poster={poster} />}>
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: initialCameraPosition, fov: CAMERA_FOV, near: 0.01, far: 100 }}
              className={interactive ? (onModelClick ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing') : ''}
            >
              <Lighting preset={DEFAULT_LIGHTING} />
              <ShareCamera cameraRef={cameraRef} />

              <Model
                url={modelUrl}
                modelRef={modelRef}
                onFit={handleFit}
                onModelClick={onModelClick}
                shadowOpacity={preset.shadowOpacity}
              />

              <FitCamera
                modelRef={modelRef}
                direction={initialCameraPosition}
              />

              {interactive && (
                <OrbitControls
                  ref={controlsRef}
                  makeDefault
                  enableDamping
                  dampingFactor={0.08}
                  minDistance={MIN_ZOOM_DISTANCE}
                  maxDistance={MAX_ZOOM_DISTANCE}
                  maxPolarAngle={Math.PI / 2 - 0.05}
                  autoRotate={false}
                  onChange={keepTargetInBounds}
                />
              )}
            </Canvas>
          </Suspense>
        </ViewerErrorBoundary>
      )}
    </div>
  );
}

function ShareCamera({ cameraRef }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  useImperativeHandle(cameraRef, () => ({ camera, controls }), [camera, controls, cameraRef]);
  return null;
}

export default ModelViewer;
