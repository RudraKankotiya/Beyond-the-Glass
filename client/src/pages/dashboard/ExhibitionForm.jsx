import { useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import api, { fileUrl, getErrorMessage } from '../../api/axios.js';
import Notice from '../../components/dashboard/Notice.jsx';
import PublishSwitch from '../../components/dashboard/PublishSwitch.jsx';
import SortableList, { DragHandle } from '../../components/dashboard/SortableList.jsx';
import UploadProgress from '../../components/dashboard/UploadProgress.jsx';
import EmptyState, { ErrorState } from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import { LoadingRegion, Skeleton } from '../../components/Skeletons.jsx';
import useApi from '../../hooks/useApi.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import useObjectUrl from '../../hooks/useObjectUrl.js';
import { checkImageFile, IMAGE_MAX_MB } from '../../utils/fileChecks.js';

// Create (/dashboard/exhibitions/new) or edit (/dashboard/exhibitions/:slug/edit) an exhibition
function ExhibitionForm() {
  const { slug } = useParams();
  const { data, error, isLoading, reload } = useApi(slug ? `/exhibitions/${slug}` : null);
  useDocumentTitle(slug ? 'Edit exhibition' : 'New exhibition');

  if (isLoading) {
    return (
      <LoadingRegion label="Loading exhibition" className="page-container grid gap-8 pb-20 lg:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </LoadingRegion>
    );
  }
  if (error) {
    return (
      <div className="page-container pb-20">
        {error.response?.status === 404 ? (
          <EmptyState title="Exhibition not found" action={<Link to="/dashboard/exhibitions" className="btn btn-outline">Back to exhibitions</Link>} />
        ) : (
          <ErrorState title="Could not load this exhibition" error={error} onRetry={reload} />
        )}
      </div>
    );
  }
  return <ExhibitionFields key={data?.exhibition._id ?? 'new'} exhibition={data?.exhibition} />;
}

function ExhibitionFields({ exhibition }) {
  const isEdit = Boolean(exhibition);
  const navigate = useNavigate();
  const fieldId = useId();

  const [form, setForm] = useState({
    title: exhibition?.title ?? '',
    description: exhibition?.description ?? '',
    theme: exhibition?.theme ?? '',
    isPublished: exhibition?.isPublished ?? false,
  });
  const setField = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  // The guided tour: artifacts in the order visitors will meet them
  const [tour, setTour] = useState(exhibition?.artifacts ?? []);
  const addToTour = (artifact) => setTour((list) => [...list, artifact]);
  const removeFromTour = (id) => setTour((list) => list.filter((artifact) => artifact._id !== id));

  const [coverFile, setCoverFile] = useState(null);
  const [coverError, setCoverError] = useState('');
  const coverPreviewUrl = useObjectUrl(coverFile);
  const pickCover = (event) => {
    const file = event.target.files[0] ?? null;
    const problem = file ? checkImageFile(file) : '';
    setCoverError(problem);
    setCoverFile(problem ? null : file);
    if (problem) event.target.value = '';
  };

  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const body = new FormData();
    body.append('title', form.title.trim());
    body.append('description', form.description.trim());
    body.append('theme', form.theme.trim());
    body.append('isPublished', String(form.isPublished));
    body.append('artifacts', JSON.stringify(tour.map((artifact) => artifact._id))); // ids in tour order
    if (coverFile) body.append('coverImage', coverFile);

    setProgress(0);
    try {
      const config = {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        },
      };
      const { data } = isEdit
        ? await api.put(`/exhibitions/${exhibition._id}`, body, config)
        : await api.post('/exhibitions', body, config);
      navigate('/dashboard/exhibitions', { state: { notice: `"${data.exhibition.title}" was saved.` } });
    } catch (err) {
      setError(getErrorMessage(err));
      setProgress(null);
    }
  };

  const deleteExhibition = async () => {
    try {
      await api.delete(`/exhibitions/${exhibition._id}`);
      navigate('/dashboard/exhibitions', {
        state: { notice: `"${exhibition.title}" was deleted. Its artifacts are still in the collection.` },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const coverUrl = coverPreviewUrl || (exhibition?.coverImage ? fileUrl(exhibition.coverImage) : '');

  return (
    <div className="page-container pb-20">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-3xl">{isEdit ? `Edit ${exhibition.title}` : 'New exhibition'}</h2>
        <Link to="/dashboard/exhibitions" className="text-sm text-ink-muted hover:text-ink">
          Back to exhibitions
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2">
        {/* Details */}
        <div className="space-y-5">
          <FormField label="Title" name="title" required maxLength={120} value={form.title} onChange={setField} />
          <FormField as="textarea" label="Description" name="description" rows={5} maxLength={5000} value={form.description} onChange={setField} />
          <FormField label="Theme" name="theme" value={form.theme} onChange={setField} hint="Optional, e.g. the period or mood of the gallery." />

          <div>
            <p className="field-label">Cover image</p>
            <div className="flex items-start gap-4">
              <div className="aspect-[4/3] w-36 shrink-0 overflow-hidden rounded-sm border border-line bg-surface">
                {coverUrl && <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Choose a cover image"
                  onChange={pickCover}
                  className="block w-full text-sm text-ink-muted file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-gold/60 file:bg-transparent file:px-4 file:py-2 file:text-gold hover:file:bg-gold/10"
                />
                <p className="mt-2 text-xs text-ink-subtle">
                  JPG, PNG or WebP, up to {IMAGE_MAX_MB} MB. Without one, the first artifact&apos;s thumbnail is used.
                </p>
                {coverError && <p role="alert" className="mt-2 text-sm text-danger">{coverError}</p>}
              </div>
            </div>
          </div>

          <div>
            <p className="field-label">Visibility</p>
            <PublishSwitch
              checked={form.isPublished}
              onChange={() => setForm({ ...form, isPublished: !form.isPublished })}
              label="Published"
            />
            <p className="mt-2 text-xs text-ink-subtle">Visitors only see published exhibitions.</p>
          </div>
        </div>

        {/* Guided tour */}
        <div className="space-y-6">
          <section aria-labelledby={`${fieldId}-tour`}>
            <h3 id={`${fieldId}-tour`} className="text-xl">
              Guided tour ({tour.length})
            </h3>
            {tour.length === 0 ? (
              <p className="mt-2 rounded-sm border border-dashed border-line p-4 text-sm text-ink-subtle">
                No artifacts yet. Add them below; drag to set the order visitors see them in.
              </p>
            ) : (
              <>
                <p className="mt-1 mb-3 text-sm text-ink-subtle">Drag the handles to change the tour order.</p>
                <SortableList
                  label="Tour order"
                  items={tour}
                  getId={(artifact) => artifact._id}
                  onReorder={setTour}
                  renderItem={(artifact, index, handle) => (
                    <div className="flex items-center gap-3 rounded-sm border border-line bg-surface px-2 py-2">
                      <DragHandle handle={handle} label={`Drag to reorder ${artifact.title}`} />
                      <span className="w-5 text-center text-sm text-gold">{index + 1}</span>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-raised">
                        {artifact.thumbnailUrl && <img src={fileUrl(artifact.thumbnailUrl)} alt="" className="h-full w-full object-contain" />}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-ink">{artifact.title}</span>
                      <button
                        type="button"
                        onClick={() => removeFromTour(artifact._id)}
                        className="px-2 text-sm text-ink-subtle hover:text-danger"
                        aria-label={`Remove ${artifact.title} from the tour`}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                />
              </>
            )}
          </section>

          <ArtifactPicker tourIds={tour.map((artifact) => artifact._id)} exhibitionId={exhibition?._id} onAdd={addToTour} />

          <div className="border-t border-line pt-6">
            <Notice tone="error">{error}</Notice>
            {progress !== null ? (
              <UploadProgress percent={progress} />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn-primary">
                  {isEdit ? 'Save changes' : 'Create exhibition'}
                </button>
                <Link to="/dashboard/exhibitions" className="btn btn-outline">
                  Cancel
                </Link>
                {isEdit &&
                  (confirmDelete ? (
                    <span className="ml-auto flex items-center gap-3 text-sm">
                      <span className="text-ink-muted">Delete this exhibition?</span>
                      <button type="button" onClick={deleteExhibition} className="text-danger hover:underline">
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="text-ink-muted hover:text-ink">
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto text-sm text-ink-muted hover:text-danger">
                      Delete exhibition
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// Search the collection and add artifacts to the tour
function ArtifactPicker({ tourIds, exhibitionId, onAdd }) {
  const searchId = useId();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const request = new URLSearchParams({ limit: '12' });
  if (debounced) request.set('search', debounced);
  const { data, isLoading, error } = useApi(`/artifacts?${request}`);
  const exhibitions = useApi('/exhibitions');
  const exhibitionTitle = (id) => exhibitions.data?.exhibitions.find((e) => e._id === id)?.title;

  return (
    <section aria-labelledby={`${searchId}-heading`} className="rounded-sm border border-line p-4">
      <h3 id={`${searchId}-heading`} className="text-xl">
        Add artifacts
      </h3>
      <label htmlFor={searchId} className="field-label mt-3">
        Search the collection
      </label>
      <input id={searchId} type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="field-input" />

      <div className="mt-4">
        {isLoading && !data ? (
          <LoadingRegion label="Loading artifacts" className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </LoadingRegion>
        ) : error ? (
          <p className="text-sm text-danger">{getErrorMessage(error)}</p>
        ) : data.artifacts.length === 0 ? (
          <p className="text-sm text-ink-subtle">No artifacts match.</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {data.artifacts.map((artifact) => {
              const inTour = tourIds.includes(artifact._id);
              // An artifact belongs to one exhibition: adding it here moves it out of the other one
              const otherExhibition =
                artifact.exhibitionId && artifact.exhibitionId !== exhibitionId ? exhibitionTitle(artifact.exhibitionId) : null;
              return (
                <li key={artifact._id} className="flex items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-surface">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-raised">
                    {artifact.thumbnailUrl && <img src={fileUrl(artifact.thumbnailUrl)} alt="" className="h-full w-full object-contain" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ink">{artifact.title}</p>
                    {otherExhibition && !inTour && <p className="truncate text-xs text-ink-subtle">Now in {otherExhibition}; adding moves it here</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdd(artifact)}
                    disabled={inTour}
                    className="px-2 text-sm text-gold hover:text-gold-bright disabled:text-ink-subtle"
                    aria-label={inTour ? `${artifact.title} is in the tour` : `Add ${artifact.title} to the tour`}
                  >
                    {inTour ? 'Added' : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default ExhibitionForm;
