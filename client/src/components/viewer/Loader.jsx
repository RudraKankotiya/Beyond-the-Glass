import { useProgress } from '@react-three/drei';

// The <Suspense> fallback shown while the model downloads.
// useProgress follows every file three.js is loading and reports 0-100%.
// poster: optional image (the artifact's thumbnail) to show until the 3D model is ready.
function Loader({ poster }) {
  const { progress } = useProgress();
  const percent = Math.round(progress);

  const bar = (
    <div className="h-px w-full bg-line">
      <div className="h-full bg-gold transition-[width] duration-200" style={{ width: `${percent}%` }} />
    </div>
  );

  return (
    <div
      role="progressbar"
      aria-label="Loading 3D model"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="relative flex h-full items-center justify-center"
    >
      {poster ? (
        <>
          <img src={poster} alt="" className="h-full w-full object-contain p-6" />
          <div className="absolute inset-x-0 bottom-0">{bar}</div>
        </>
      ) : (
        <div className="w-48">
          {bar}
          <p className="mt-3 text-center text-xs text-ink-muted">Loading model {percent}%</p>
        </div>
      )}
    </div>
  );
}

export default Loader;
