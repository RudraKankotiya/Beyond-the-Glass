import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import api, { fileUrl, getErrorMessage } from '../../api/axios.js';
import Notice from '../../components/dashboard/Notice.jsx';
import PublishSwitch from '../../components/dashboard/PublishSwitch.jsx';
import EmptyState, { ErrorState } from '../../components/EmptyState.jsx';
import { LoadingRegion, Skeleton } from '../../components/Skeletons.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

// Dashboard: every exhibition (drafts included) with a publish switch on each
function ExhibitionsList() {
  useDocumentTitle('Manage exhibitions');
  const location = useLocation();
  const { data, error, isLoading, reload } = useApi('/exhibitions');
  const [notice] = useState(location.state?.notice ?? '');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const togglePublished = async (exhibition) => {
    setBusyId(exhibition._id);
    setActionError('');
    try {
      await api.put(`/exhibitions/${exhibition._id}`, { isPublished: !exhibition.isPublished });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  let content;
  if (isLoading && !data) {
    content = (
      <LoadingRegion label="Loading exhibitions" className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </LoadingRegion>
    );
  } else if (error) {
    content = <ErrorState title="Could not load exhibitions" error={error} onRetry={reload} />;
  } else if (data.exhibitions.length === 0) {
    content = (
      <EmptyState title="No exhibitions yet" action={<Link to="new" className="btn btn-primary">New exhibition</Link>}>
        Group artifacts into an exhibition to give visitors a guided tour.
      </EmptyState>
    );
  } else {
    content = (
      <ul className="divide-y divide-line rounded-sm border border-line">
        {data.exhibitions.map((exhibition) => (
          <li key={exhibition._id} className="flex flex-wrap items-center gap-4 px-4 py-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm border border-line bg-surface">
              {(exhibition.coverImage || exhibition.previewImage) && (
                <img
                  src={fileUrl(exhibition.coverImage || exhibition.previewImage)}
                  alt=""
                  className={`h-full w-full ${exhibition.coverImage ? 'object-cover' : 'object-contain'}`}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`${exhibition.slug}/edit`} className="font-display text-xl text-ink hover:text-gold-bright">
                {exhibition.title}
              </Link>
              <p className="text-sm text-ink-subtle">
                {exhibition.artifactCount === 1 ? '1 artifact' : `${exhibition.artifactCount} artifacts`}
              </p>
            </div>
            <PublishSwitch
              checked={exhibition.isPublished}
              disabled={busyId === exhibition._id}
              onChange={() => togglePublished(exhibition)}
              label={`Publish ${exhibition.title}`}
            />
            <div className="flex gap-4 text-sm">
              <Link to={`${exhibition.slug}/edit`} className="text-gold hover:text-gold-bright">
                Edit
              </Link>
              <Link to={`/exhibitions/${exhibition.slug}`} className="text-ink-muted hover:text-ink">
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="page-container pb-20">
      <Notice>{notice}</Notice>
      <Notice tone="error">{actionError}</Notice>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">Drafts are only visible to curators and admins until they are published.</p>
        <Link to="new" className="btn btn-primary">
          New exhibition
        </Link>
      </div>
      {content}
    </div>
  );
}

export default ExhibitionsList;
