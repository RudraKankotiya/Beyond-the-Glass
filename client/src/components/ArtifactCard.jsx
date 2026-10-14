import { Link } from 'react-router';
import { fileUrl } from '../api/axios.js';

// Grid card for an artifact: thumbnail image (never live 3D), title, era and region.
// stop: optional number for its place in an exhibition's guided tour.
// action: optional extra control under the card (e.g. "Remove" in My Collection).
function ArtifactCard({ artifact, stop, action }) {
  const { slug, title, thumbnailUrl, era, region, modelUrl } = artifact;

  // Start loading the 3D model as soon as the visitor shows interest (hover, keyboard focus or
  // touch). The loader is imported on demand, so lists don't download three.js up front.
  const preload = () => {
    if (modelUrl) import('./viewer/preloadModel.js').then(({ preloadModel }) => preloadModel(fileUrl(modelUrl)));
  };
  const details = [era, region].filter(Boolean).join(', ');

  return (
    <article>
      <Link to={`/artifacts/${slug}`} className="group block" onPointerEnter={preload} onFocus={preload} onTouchStart={preload}>
        <div className="relative aspect-square overflow-hidden rounded-sm border border-line bg-surface transition-colors group-hover:border-gold-deep">
          {thumbnailUrl ? (
            <img
              src={fileUrl(thumbnailUrl)}
              alt=""
              loading="lazy"
              width="600"
              height="600"
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-subtle">
              <svg width="40" height="48" viewBox="0 0 18 22" fill="none" aria-hidden="true">
                <rect x="0.75" y="0.75" width="16.5" height="20.5" stroke="currentColor" strokeWidth="1" />
                <path d="M5 16L12 5" stroke="currentColor" strokeWidth="0.75" />
              </svg>
              <span className="sr-only">No image yet</span>
            </div>
          )}
          {stop && (
            <span className="absolute top-2 left-2 flex h-7 min-w-7 items-center justify-center rounded-full border border-gold bg-canvas/85 px-2 text-xs font-semibold text-gold">
              <span className="sr-only">Tour stop </span>
              {stop}
            </span>
          )}
        </div>
        <h3 className="mt-3 text-lg leading-snug transition-colors group-hover:text-gold-bright">{title}</h3>
        {details && <p className="mt-0.5 text-sm text-ink-muted">{details}</p>}
      </Link>
      {action && <div className="mt-2">{action}</div>}
    </article>
  );
}

export default ArtifactCard;
