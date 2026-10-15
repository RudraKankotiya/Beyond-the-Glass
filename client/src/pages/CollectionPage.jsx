import { useState } from 'react';
import { Link } from 'react-router';
import api, { getErrorMessage } from '../api/axios.js';
import ArtifactCard from '../components/ArtifactCard.jsx';
import EmptyState, { ErrorState } from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { ArtifactGridSkeleton } from '../components/Skeletons.jsx';
import useApi from '../hooks/useApi.js';
import useAuth from '../hooks/useAuth.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

// Only reachable when logged in (wrapped in <ProtectedRoute> in App.jsx)
function CollectionPage() {
  useDocumentTitle('My Collection');
  const { setFavorites } = useAuth();
  const { data, error, isLoading, reload } = useApi('/users/me/favorites');
  const [removedIds, setRemovedIds] = useState([]); // removed during this visit, hidden right away
  const [removeError, setRemoveError] = useState('');

  const remove = async (artifactId) => {
    setRemoveError('');
    try {
      const { data: result } = await api.delete(`/users/favorites/${artifactId}`);
      setFavorites(result.favorites); // keeps the heart buttons elsewhere in sync
      setRemovedIds((ids) => [...ids, artifactId]);
    } catch (err) {
      setRemoveError(getErrorMessage(err));
    }
  };

  const favorites = data?.favorites.filter((artifact) => !removedIds.includes(artifact._id)) ?? [];

  let content;
  if (isLoading) {
    content = <ArtifactGridSkeleton count={4} />;
  } else if (error) {
    content = <ErrorState title="Could not load your collection" error={error} onRetry={reload} />;
  } else if (favorites.length === 0) {
    content = (
      <EmptyState
        title="Nothing saved yet"
        action={
          <Link to="/discover" className="btn btn-primary">
            Discover artifacts
          </Link>
        }
      >
        Use &ldquo;Save to My Collection&rdquo; on any artifact and it will be kept here.
      </EmptyState>
    );
  } else {
    content = (
      <>
        <h2 className="sr-only">Saved artifacts</h2>
        {removeError && (
          <p role="alert" className="mb-6 text-sm text-danger">
            {removeError}
          </p>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((artifact) => (
            <ArtifactCard
              key={artifact._id}
              artifact={artifact}
              action={
                <button
                  type="button"
                  onClick={() => remove(artifact._id)}
                  className="text-sm text-ink-subtle transition-colors hover:text-danger"
                  aria-label={`Remove ${artifact.title} from My Collection`}
                >
                  Remove
                </button>
              }
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <section>
      <PageHeader title="My Collection">The artifacts you have saved, most recent first.</PageHeader>
      <div className="page-container pb-20">{content}</div>
    </section>
  );
}

export default CollectionPage;
