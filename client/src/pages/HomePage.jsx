import { Link } from 'react-router';
import ArtifactCard from '../components/ArtifactCard.jsx';
import EmptyState, { ErrorState } from '../components/EmptyState.jsx';
import { ArtifactGridSkeleton } from '../components/Skeletons.jsx';
import Vitrine from '../components/Vitrine.jsx';
import useApi from '../hooks/useApi.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

const FEATURED_LIMIT = 4;

const VISIT_STEPS = [
  { title: 'Explore', text: 'Browse digital artifacts from across history, categorized by era and region.' },
  { title: 'Inspect', text: 'Interact with every artifact in 3D: freely turn, pan, and zoom to examine intricate craftsmanship.' },
  { title: 'Discover', text: 'Search the collection with granular filters, or try the surprise picker to discover something new.' },
  { title: 'Collect', text: 'Save your favorite pieces into your own private virtual collection to revisit anytime.' },
];

function HomePage() {
  useDocumentTitle();
  // A random artifact that has a 3D model (404 = the museum has none yet)
  const featured = useApi('/artifacts/random?withModel=true');
  const artifactsApi = useApi(`/artifacts?limit=${FEATURED_LIMIT}`);

  const featuredArtifacts = artifactsApi.data?.artifacts ?? [];

  return (
    <>
      {/* Hero */}
      <section className="page-container grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div>
          <h1 className="text-6xl leading-[1.02] font-medium sm:text-7xl lg:text-8xl">Beyond the Glass</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted sm:text-xl">
            A virtual museum where every artifact is a 3D model you can turn, zoom into and study up close.
          </p>
          <Link to="/discover" className="btn btn-primary mt-10 px-7 py-3 text-base">
            Explore Collection
          </Link>
        </div>
        <div className="flex justify-center lg:justify-end">
          <Vitrine
            artifact={featured.data?.artifact}
            isLoading={featured.isLoading}
            failed={Boolean(featured.error) && featured.error.response?.status !== 404}
          />
        </div>
      </section>

      {/* Featured collection artifacts */}
      <section aria-labelledby="featured-heading" className="page-container py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="featured-heading" className="text-3xl sm:text-4xl">
            Featured artifacts
          </h2>
          <Link to="/discover" className="shrink-0 text-sm text-gold hover:text-gold-bright">
            View all artifacts
          </Link>
        </div>

        {artifactsApi.isLoading ? (
          <ArtifactGridSkeleton count={FEATURED_LIMIT} />
        ) : artifactsApi.error ? (
          <ErrorState title="Could not load artifacts" error={artifactsApi.error} onRetry={artifactsApi.reload} />
        ) : featuredArtifacts.length === 0 ? (
          <EmptyState title="No artifacts yet">New artifacts will appear here once added to the collection.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featuredArtifacts.map((artifact) => (
              <ArtifactCard key={artifact._id} artifact={artifact} />
            ))}
          </div>
        )}
      </section>

      {/* Explore / Inspect / Discover / Collect */}
      <section aria-labelledby="visit-heading" className="page-container py-16">
        <h2 id="visit-heading" className="sr-only">
          How to visit
        </h2>
        <ul className="grid gap-10 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {VISIT_STEPS.map(({ title, text }) => (
            <li key={title}>
              <h3 className="text-2xl text-gold">{title}</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default HomePage;
