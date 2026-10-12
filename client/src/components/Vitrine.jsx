import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { fileUrl } from '../api/axios.js';
import { Skeleton } from './Skeletons.jsx';

// The 3D viewer (three.js) is large; load its code only after the rest of the home page is
// showing. Until then - and while the model itself downloads - the thumbnail stands in.
const ModelViewer = lazy(() => import('./viewer/ModelViewer.jsx'));

// A glass display case on a plinth holding one featured artifact, slowly turning in 3D,
// with a museum-style wall label underneath.
function Vitrine({ artifact, isLoading, failed = false }) {
  const poster = artifact?.thumbnailUrl ? fileUrl(artifact.thumbnailUrl) : undefined;

  let contents;
  if (isLoading) {
    contents = <Skeleton className="h-full w-full rounded-none" />;
  } else if (!artifact) {
    contents = (
      <p className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-subtle">
        {failed ? 'The featured artifact could not be loaded. Check that the server is running.' : 'No artifacts on display yet.'}
      </p>
    );
  } else {
    const posterImage = poster && <img src={poster} alt="" className="h-full w-full object-contain p-6" />;
    contents = (
      <Suspense fallback={posterImage}>
        <ModelViewer
          interactive={false}
          modelUrl={fileUrl(artifact.modelUrl)}
          poster={poster}
          initialCameraPosition={artifact.cameraPosition}
          title={artifact.title}
          className="h-full w-full"
        />
      </Suspense>
    );
  }

  const displayCase = (
    <div className="aspect-square border border-gold-deep bg-surface p-3">
      {/* Inner edge of the glass */}
      <div className="relative h-full w-full overflow-hidden border border-line/70">
        {contents}
        {/* Reflection on the glass: a faint diagonal band that shifts when hovered */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgb(255_255_255/0.45)_42%,transparent_52%)] transition-transform duration-700 group-hover:translate-x-8"
        />
      </div>
    </div>
  );

  return (
    <figure className="w-full max-w-md">
      {artifact ? (
        <Link to={`/artifacts/${artifact.slug}`} className="group block" aria-label={`Open ${artifact.title}`}>
          {displayCase}
        </Link>
      ) : (
        displayCase
      )}
      {/* Plinth */}
      <div aria-hidden="true" className="-mx-[2%] h-3 w-[104%] border-x border-b border-line bg-raised" />

      {artifact && (
        <figcaption className="mt-6 border-l border-gold pl-4">
          <p className="font-display text-xl">{artifact.title}</p>
          {(artifact.era || artifact.region) && (
            <p className="mt-1 text-sm text-ink-muted">{[artifact.era, artifact.region].filter(Boolean).join(', ')}</p>
          )}
          {/* Every artifact view credits the model's creator and license */}
          {artifact.credits && (
            <p className="mt-1 text-xs text-ink-subtle">
              3D model by {artifact.credits.author}, {artifact.credits.license}
            </p>
          )}
          <Link to={`/artifacts/${artifact.slug}`} className="mt-3 inline-block text-sm text-gold hover:text-gold-bright">
            Inspect in 3D
          </Link>
        </figcaption>
      )}
    </figure>
  );
}

export default Vitrine;
