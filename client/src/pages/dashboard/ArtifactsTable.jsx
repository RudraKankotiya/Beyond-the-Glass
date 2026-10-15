import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router';
import api, { fileUrl, getErrorMessage } from '../../api/axios.js';
import Notice from '../../components/dashboard/Notice.jsx';
import EmptyState, { ErrorState } from '../../components/EmptyState.jsx';
import Pagination from '../../components/Pagination.jsx';
import { LoadingRegion, Skeleton } from '../../components/Skeletons.jsx';
import useApi from '../../hooks/useApi.js';
import useAuth from '../../hooks/useAuth.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const PAGE_SIZE = 20;

// Dashboard: every artifact, with search, edit, hotspots and (admins only) delete
function ArtifactsTable() {
  useDocumentTitle('Manage artifacts');
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const location = useLocation();
  const searchId = useId();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(location.state?.notice ?? ''); // e.g. "Artifact saved" after the form
  const [error, setError] = useState('');

  const request = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (debouncedSearch) request.set('search', debouncedSearch);
  const { data, isLoading, error: loadError, reload } = useApi(`/artifacts?${request}`);

  // Exhibition titles, to show which exhibition each artifact belongs to (curators also get drafts)
  const exhibitions = useApi('/exhibitions');
  const exhibitionTitle = (id) => exhibitions.data?.exhibitions.find((e) => e._id === id)?.title;

  // Delete asks for confirmation in the row itself before anything is removed
  const [confirmingId, setConfirmingId] = useState(null);
  const remove = async (artifact) => {
    setError('');
    try {
      await api.delete(`/artifacts/${artifact._id}`);
      setConfirmingId(null);
      setNotice(`"${artifact.title}" was deleted, along with its 3D model and thumbnail files.`);
      reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  let content;
  if (isLoading && !data) {
    content = (
      <LoadingRegion label="Loading artifacts" className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </LoadingRegion>
    );
  } else if (loadError) {
    content = <ErrorState title="Could not load artifacts" error={loadError} onRetry={reload} />;
  } else if (data.total === 0) {
    content = debouncedSearch ? (
      <EmptyState title="No artifacts match">Try a shorter or different search word.</EmptyState>
    ) : (
      <EmptyState
        title="No artifacts yet"
        action={
          <Link to="new" className="btn btn-primary">
            Add artifact
          </Link>
        }
      >
        Add the first artifact to start building the collection.
      </EmptyState>
    );
  } else {
    content = (
      <>
        {/* On small screens the table scrolls sideways inside this box, not the whole page */}
        <div className="relative overflow-x-auto rounded-sm border border-line">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-surface text-ink-subtle">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Artifact</th>
                <th scope="col" className="px-4 py-3 font-medium">Era and region</th>
                <th scope="col" className="px-4 py-3 font-medium">Exhibition</th>
                <th scope="col" className="px-4 py-3 font-medium">3D model</th>
                <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.artifacts.map((artifact) => (
                <tr key={artifact._id} className="border-t border-line align-middle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm border border-line bg-surface">
                        {artifact.thumbnailUrl && (
                          <img src={fileUrl(artifact.thumbnailUrl)} alt="" className="h-full w-full object-contain" />
                        )}
                      </div>
                      <Link to={`/artifacts/${artifact.slug}`} className="font-medium text-ink hover:text-gold-bright">
                        {artifact.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{[artifact.era, artifact.region].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{exhibitionTitle(artifact.exhibitionId) ?? '—'}</td>
                  <td className="px-4 py-3">
                    {artifact.modelUrl ? <span className="text-ink">Uploaded</span> : <span className="text-ink-subtle">Missing</span>}
                  </td>
                  <td className="px-4 py-3">
                    {confirmingId === artifact._id ? (
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-ink-muted">Delete permanently?</span>
                        <button type="button" onClick={() => remove(artifact)} className="text-danger hover:underline">
                          Delete
                        </button>
                        <button type="button" onClick={() => setConfirmingId(null)} className="text-ink-muted hover:text-ink">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-4">
                        <Link to={`${artifact._id}/edit`} className="text-gold hover:text-gold-bright">
                          Edit
                        </Link>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setConfirmingId(artifact._id)}
                            className="text-ink-muted hover:text-danger"
                            aria-label={`Delete ${artifact.title}`}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
      </>
    );
  }

  return (
    <div className="page-container pb-20">
      <Notice>{notice}</Notice>
      <Notice tone="error">{error}</Notice>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-sm">
          <label htmlFor={searchId} className="field-label">
            Search artifacts
          </label>
          <input id={searchId} type="search" value={search} onChange={handleSearch} className="field-input" placeholder="Title, description or tag" />
        </div>
        <Link to="new" className="btn btn-primary">
          Add artifact
        </Link>
      </div>
      <p className="mb-4 text-sm text-ink-subtle" aria-live="polite">
        {data && !isLoading ? (data.total === 1 ? '1 artifact' : `${data.total} artifacts`) : ''}
      </p>

      {content}
    </div>
  );
}

export default ArtifactsTable;
