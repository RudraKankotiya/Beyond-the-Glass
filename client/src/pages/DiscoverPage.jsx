import { useEffect, useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import api, { getErrorMessage } from '../api/axios.js';
import ArtifactCard from '../components/ArtifactCard.jsx';
import EmptyState, { ErrorState } from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import { ArtifactGridSkeleton } from '../components/Skeletons.jsx';
import useApi from '../hooks/useApi.js';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

const PAGE_SIZE = 12;
const FILTERS = [
  { key: 'era', label: 'Era', allLabel: 'All eras', options: 'eras' },
  { key: 'region', label: 'Region', allLabel: 'All regions', options: 'regions' },
  { key: 'category', label: 'Category', allLabel: 'All categories', options: 'categories' },
];

function DiscoverPage() {
  useDocumentTitle('Discover');
  const navigate = useNavigate();

  // The search, filters and page live in the URL (?q=coin&era=Roman&page=2), so results can be
  // bookmarked or shared, and the browser's back button returns to the previous results.
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('page')) || 1;

  const updateParams = (changes, { replace = false } = {}) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace }
    );
  };

  // Search as you type: the box updates instantly, the URL (and so the request) only once
  // typing pauses for 350 ms
  const [query, setQuery] = useState(q);
  const debouncedQuery = useDebouncedValue(query);
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed !== q) updateParams({ q: trimmed, page: null }, { replace: true });
  }, [debouncedQuery]);
  // If the URL changes some other way (back button, "Clear"), show that search in the box
  useEffect(() => {
    if (q !== debouncedQuery.trim()) setQuery(q);
  }, [q]);

  // Build the API request from the URL
  const request = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (q) request.set('search', q);
  for (const { key } of FILTERS) if (params.get(key)) request.set(key, params.get(key));
  const results = useApi(`/artifacts?${request}`);
  const filterOptions = useApi('/artifacts/filters');

  const hasFilters = Boolean(q || FILTERS.some(({ key }) => params.get(key)));
  const clearAll = () => {
    setQuery('');
    setParams({});
  };

  const goToPage = (nextPage) => {
    updateParams({ page: nextPage > 1 ? String(nextPage) : null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // "Surprise me": ask the API for a random artifact and open it
  const [surprise, setSurprise] = useState({ loading: false, error: '' });
  const surpriseMe = async () => {
    setSurprise({ loading: true, error: '' });
    try {
      const { data } = await api.get('/artifacts/random');
      navigate(`/artifacts/${data.artifact.slug}`);
    } catch (err) {
      setSurprise({
        loading: false,
        error: err.response?.status === 404 ? 'There are no artifacts to pick from yet.' : getErrorMessage(err),
      });
    }
  };

  const searchId = useId();
  const total = results.data?.total ?? 0;

  return (
    <section>
      <PageHeader title="Discover">Search the whole collection and filter it by era, region or category.</PageHeader>

      <div className="page-container pb-20">
        {/* Search and filters */}
        <form role="search" onSubmit={(event) => event.preventDefault()} className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <label htmlFor={searchId} className="field-label">
              Search
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, description or tag"
              className="field-input"
            />
          </div>
          {FILTERS.map(({ key, label, allLabel, options }) => (
            <div key={key}>
              <label htmlFor={`${searchId}-${key}`} className="field-label">
                {label}
              </label>
              <select
                id={`${searchId}-${key}`}
                value={params.get(key) ?? ''}
                onChange={(event) => updateParams({ [key]: event.target.value, page: null })}
                className="field-input"
              >
                <option value="">{allLabel}</option>
                {(filterOptions.data?.[options] ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </form>
        {filterOptions.error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            The era, region and category lists could not be loaded. Search still works.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <p className="text-sm text-ink-muted" aria-live="polite">
            {results.isLoading ? 'Searching…' : results.error ? '' : total === 1 ? '1 artifact' : `${total} artifacts`}
            {hasFilters && !results.isLoading && (
              <button type="button" onClick={clearAll} className="ml-4 text-gold hover:text-gold-bright">
                Clear search and filters
              </button>
            )}
          </p>
          <div className="text-right">
            <button type="button" onClick={surpriseMe} disabled={surprise.loading} className="btn btn-outline">
              {surprise.loading ? 'Picking…' : 'Surprise me'}
            </button>
            {surprise.error && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {surprise.error}
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="mt-10">
          <h2 className="sr-only">Results</h2>
          {results.isLoading ? (
            <ArtifactGridSkeleton count={PAGE_SIZE} />
          ) : results.error ? (
            <ErrorState title="Could not search the collection" error={results.error} onRetry={results.reload} />
          ) : total === 0 ? (
            <EmptyState
              title={hasFilters ? 'No artifacts match' : 'The collection is empty'}
              action={
                hasFilters && (
                  <button type="button" onClick={clearAll} className="btn btn-outline">
                    Clear search and filters
                  </button>
                )
              }
            >
              {hasFilters
                ? 'Try a shorter search word or fewer filters.'
                : 'Artifacts will appear here once a curator adds them.'}
            </EmptyState>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {results.data.artifacts.map((artifact) => (
                  <ArtifactCard key={artifact._id} artifact={artifact} />
                ))}
              </div>
              <Pagination page={page} totalPages={results.data.totalPages} onPageChange={goToPage} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default DiscoverPage;
