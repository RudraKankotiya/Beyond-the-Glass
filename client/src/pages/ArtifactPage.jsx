import { Link, useParams } from 'react-router';
import { fileUrl } from '../api/axios.js';
import ArtifactCard from '../components/ArtifactCard.jsx';
import EmptyState, { ErrorState } from '../components/EmptyState.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import { ArtifactCardSkeleton, LoadingRegion, Skeleton } from '../components/Skeletons.jsx';
import ModelViewer from '../components/viewer/ModelViewer.jsx';
import useApi from '../hooks/useApi.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

// The page fills the screen below the navbar (h-16 + 1px border): viewer and info panel side by
// side on large screens, stacked on phones. The info panel scrolls on its own.
const SCREEN_HEIGHT = 'h-[calc(100dvh-65px)] min-h-[36rem]';

// Loaded lazily (React.lazy in App.jsx): the 3D viewer's code - three.js and
// react-three-fiber - is large, so it only downloads when an artifact is opened.
function ArtifactPage() {
  const { slug } = useParams();
  // key: moving to another artifact starts with fresh state (e.g. no hotspot selected)
  return <ArtifactView key={slug} slug={slug} />;
}

function ArtifactView({ slug }) {
  const { data, error, isLoading, reload } = useApi(`/artifacts/${slug}`);
  const artifact = data?.artifact;
  useDocumentTitle(artifact?.title ?? 'Artifact');

  if (isLoading) return <ArtifactSkeleton />;

  if (error) {
    return (
      <div className="page-container py-16">
        {error.response?.status === 404 ? (
          <EmptyState
            title="Artifact not found"
            action={
              <Link to="/discover" className="btn btn-outline">
                Browse the collection
              </Link>
            }
          >
            There is no artifact at this address.
          </EmptyState>
        ) : (
          <ErrorState title="Could not load this artifact" error={error} onRetry={reload} />
        )}
      </div>
    );
  }

  const { title, modelUrl, thumbnailUrl, cameraPosition } = artifact;

  return (
    <article className={`flex flex-col lg:flex-row ${SCREEN_HEIGHT}`}>
      <div className="h-[48%] shrink-0 p-3 sm:p-4 lg:h-full lg:w-[65%] lg:pr-0">
        <ModelViewer
          title={title}
          modelUrl={fileUrl(modelUrl)}
          poster={thumbnailUrl ? fileUrl(thumbnailUrl) : undefined}
          initialCameraPosition={cameraPosition}
          className="h-full rounded-sm border border-line"
        />
      </div>

      <section aria-labelledby="artifact-title" className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-12 sm:px-6 lg:px-8 lg:pt-8">
        <InfoPanel artifact={artifact} />
      </section>
    </article>
  );
}

function InfoPanel({ artifact }) {
  const { _id, slug, title, era, region, material, category, description, credits, modelUrl } = artifact;
  const details = [
    ['Era', era],
    ['Region', region],
    ['Material', material],
    ['Category', category],
  ].filter(([, value]) => value);

  return (
    <>
      <h1 id="artifact-title" className="text-4xl leading-tight">
        {title}
      </h1>

      {details.length > 0 && (
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {details.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-ink-subtle">{label}</dt>
              <dd className="text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-6">
        <FavoriteButton artifactId={_id} />
      </div>

      {description && <p className="mt-8 leading-relaxed text-ink-muted">{description}</p>}

      {/* Every artifact view credits the model's creator and license */}
      <section aria-labelledby="credits-heading" className="mt-10 border-t border-line pt-6">
        <h2 id="credits-heading" className="text-2xl">
          Credits
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-ink-subtle">3D model by</dt>
          <dd>{credits.author}</dd>
          <dt className="text-ink-subtle">License</dt>
          <dd>{credits.license}</dd>
          {credits.sourceUrl && (
            <>
              <dt className="text-ink-subtle">Source</dt>
              <dd className="min-w-0">
                <a
                  href={credits.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-words text-gold hover:text-gold-bright"
                >
                  {credits.sourceUrl.replace(/^https?:\/\//, '')}
                </a>
              </dd>
            </>
          )}
        </dl>
      </section>

      <RelatedArtifacts slug={slug} />
    </>
  );
}

function RelatedArtifacts({ slug }) {
  const { data, isLoading, error } = useApi(`/artifacts/${slug}/related`);

  return (
    <section aria-labelledby="related-heading" className="mt-10 border-t border-line pt-6">
      <h2 id="related-heading" className="mb-5 text-2xl">
        Related artifacts
      </h2>
      {isLoading ? (
        <LoadingRegion label="Loading related artifacts" className="grid grid-cols-2 gap-4">
          <ArtifactCardSkeleton />
          <ArtifactCardSkeleton />
        </LoadingRegion>
      ) : error ? (
        <p className="text-sm text-ink-subtle">Related artifacts could not be loaded.</p>
      ) : data.artifacts.length === 0 ? (
        <p className="text-sm text-ink-subtle">No other artifacts share this era or category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {data.artifacts.map((related) => (
            <ArtifactCard key={related._id} artifact={related} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArtifactSkeleton() {
  return (
    <LoadingRegion label="Loading artifact" className={`flex flex-col lg:flex-row ${SCREEN_HEIGHT}`}>
      <div className="h-[48%] shrink-0 p-3 sm:p-4 lg:h-full lg:w-[65%] lg:pr-0">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="flex-1 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="mt-6 h-4 w-1/2" />
        <Skeleton className="mt-2 h-4 w-2/5" />
        <Skeleton className="mt-6 h-10 w-48" />
        <Skeleton className="mt-8 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    </LoadingRegion>
  );
}

export default ArtifactPage;
