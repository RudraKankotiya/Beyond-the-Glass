import { useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import api, { fileUrl, getErrorMessage } from '../../api/axios.js';
import Notice from '../../components/dashboard/Notice.jsx';
import UploadProgress from '../../components/dashboard/UploadProgress.jsx';
import EmptyState, { ErrorState } from '../../components/EmptyState.jsx';
import FormField from '../../components/FormField.jsx';
import { LoadingRegion, Skeleton } from '../../components/Skeletons.jsx';
import ModelViewer from '../../components/viewer/ModelViewer.jsx';
import useApi from '../../hooks/useApi.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import useObjectUrl from '../../hooks/useObjectUrl.js';
import { checkImageFile, checkModelFile, formatFileSize, IMAGE_MAX_MB, MODEL_MAX_MB } from '../../utils/fileChecks.js';

const TEXT_FIELDS = ['title', 'description', 'era', 'region', 'category', 'material'];
const LICENSES = ['Public Domain', 'CC0 1.0', 'CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'CC BY-NC-SA 4.0'];

// Add (/dashboard/artifacts/new) or edit (/dashboard/artifacts/:id/edit) an artifact
function ArtifactForm() {
  const { id } = useParams();
  const { data, error, isLoading, reload } = useApi(id ? `/artifacts/by-id/${id}` : null);
  useDocumentTitle(id ? 'Edit artifact' : 'Add artifact');

  if (isLoading) {
    return (
      <LoadingRegion label="Loading artifact" className="page-container grid gap-8 pb-20 lg:grid-cols-2">
        <Skeleton className="h-[32rem] w-full" />
        <Skeleton className="h-[32rem] w-full" />
      </LoadingRegion>
    );
  }
  if (error) {
    return (
      <div className="page-container pb-20">
        {error.response?.status === 404 ? (
          <EmptyState title="Artifact not found" action={<Link to="/dashboard/artifacts" className="btn btn-outline">Back to artifacts</Link>} />
        ) : (
          <ErrorState title="Could not load this artifact" error={error} onRetry={reload} />
        )}
      </div>
    );
  }
  // key: the form's fields start from the loaded artifact
  return <ArtifactFormFields key={data?.artifact._id ?? 'new'} artifact={data?.artifact} />;
}

function ArtifactFormFields({ artifact }) {
  const isEdit = Boolean(artifact);
  const navigate = useNavigate();
  const exhibitions = useApi('/exhibitions');
  const fieldId = useId();

  const [form, setForm] = useState(() => ({
    ...Object.fromEntries(TEXT_FIELDS.map((key) => [key, artifact?.[key] ?? ''])),
    tags: artifact?.tags.join(', ') ?? '',
    exhibitionId: artifact?.exhibitionId ?? '',
    credits: {
      author: artifact?.credits.author ?? '',
      license: artifact?.credits.license ?? '',
      sourceUrl: artifact?.credits.sourceUrl ?? '',
    },
  }));
  const setField = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const setCredit = (event) => setForm({ ...form, credits: { ...form.credits, [event.target.name]: event.target.value } });

  // Files: checked in the browser first, then previewed through a temporary object URL
  const [modelFile, setModelFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [fileError, setFileError] = useState({ model: '', thumbnail: '' });
  const modelPreviewUrl = useObjectUrl(modelFile);
  const thumbnailPreviewUrl = useObjectUrl(thumbnailFile);

  const pickFile = (kind, check, setFile) => (event) => {
    const file = event.target.files[0] ?? null;
    const problem = file ? check(file) : '';
    setFileError((errors) => ({ ...errors, [kind]: problem }));
    setFile(problem ? null : file);
    if (problem) event.target.value = ''; // clear the rejected file from the input
  };

  const [progress, setProgress] = useState(null); // null = not uploading, 0-100 while uploading
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Files and text fields travel together as multipart/form-data (what multer reads)
    const body = new FormData();
    for (const key of TEXT_FIELDS) body.append(key, form[key].trim());
    body.append('tags', form.tags); // "bronze, egypt" - the API splits it into a list
    body.append('credits', JSON.stringify(form.credits)); // objects are sent as JSON text
    body.append('exhibitionId', form.exhibitionId); // '' = not in an exhibition
    if (modelFile) body.append('model', modelFile);
    if (thumbnailFile) body.append('thumbnail', thumbnailFile);

    setProgress(0);
    try {
      const config = {
        // axios reports how many bytes have been sent so far
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        },
      };
      const { data } = isEdit
        ? await api.put(`/artifacts/${artifact._id}`, body, config)
        : await api.post('/artifacts', body, config);

      navigate('/dashboard/artifacts', { state: { notice: `"${data.artifact.title}" was saved.` } });
    } catch (err) {
      setError(getErrorMessage(err));
      setProgress(null);
    }
  };

  const savedModelUrl = artifact?.modelUrl ? fileUrl(artifact.modelUrl) : '';
  const savedThumbnailUrl = artifact?.thumbnailUrl ? fileUrl(artifact.thumbnailUrl) : '';
  const isUploading = progress !== null;

  return (
    <div className="page-container pb-20">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-3xl">{isEdit ? `Edit ${artifact.title}` : 'Add artifact'}</h2>
        <Link to="/dashboard/artifacts" className="text-sm text-ink-muted hover:text-ink">
          Back to artifacts
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2">
        {/* Left column: the details */}
        <div className="space-y-5">
          <FormField label="Title" name="title" required maxLength={120} value={form.title} onChange={setField} />
          <FormField as="textarea" label="Description" name="description" required rows={5} maxLength={5000} value={form.description} onChange={setField} />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Era" name="era" value={form.era} onChange={setField} placeholder="e.g. Han Dynasty" />
            <FormField label="Region" name="region" value={form.region} onChange={setField} placeholder="e.g. China" />
            <FormField label="Category" name="category" value={form.category} onChange={setField} placeholder="e.g. Jewellery" />
            <FormField label="Material" name="material" value={form.material} onChange={setField} placeholder="e.g. Jade" />
          </div>
          <FormField label="Tags" name="tags" value={form.tags} onChange={setField} hint="Separate tags with commas. They help visitors find the artifact in search." />
          <FormField
            as="select"
            label="Exhibition"
            name="exhibitionId"
            value={form.exhibitionId}
            onChange={setField}
            hint={
              exhibitions.error
                ? 'The list of exhibitions could not be loaded. Reload the page to try again.'
                : 'Choosing an exhibition adds the artifact to the end of its guided tour.'
            }
          >
            <option value="">Not in an exhibition</option>
            {exhibitions.data?.exhibitions.map((exhibition) => (
              <option key={exhibition._id} value={exhibition._id}>
                {exhibition.title}
                {exhibition.isPublished ? '' : ' (draft)'}
              </option>
            ))}
          </FormField>

          <fieldset className="space-y-5 rounded-sm border border-line p-5">
            <legend className="px-2 font-display text-xl">Credits</legend>
            <p className="-mt-2 text-sm text-ink-subtle">Shown on every view of this artifact.</p>
            <FormField label="Model created by" name="author" required value={form.credits.author} onChange={setCredit} />
            <FormField label="License" name="license" required list={`${fieldId}-licenses`} value={form.credits.license} onChange={setCredit} hint="Pick a common license or type another." />
            <datalist id={`${fieldId}-licenses`}>
              {LICENSES.map((license) => (
                <option key={license} value={license} />
              ))}
            </datalist>
            <FormField label="Source link" name="sourceUrl" type="url" value={form.credits.sourceUrl} onChange={setCredit} placeholder="https://" />
          </fieldset>
        </div>

        {/* Right column: files and live previews */}
        <div className="space-y-8">
          <section aria-labelledby={`${fieldId}-model`}>
            <h3 id={`${fieldId}-model`} className="text-xl">3D model</h3>
            <p className="mt-1 text-sm text-ink-subtle">
              A .glb file, up to {MODEL_MAX_MB} MB. Run it through npm run models:optimize first for faster loading.
            </p>
            <input
              type="file"
              accept=".glb,model/gltf-binary"
              aria-label="Choose a 3D model file"
              onChange={pickFile('model', checkModelFile, setModelFile)}
              className="mt-3 block w-full text-sm text-ink-muted file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-gold/60 file:bg-transparent file:px-4 file:py-2 file:text-gold hover:file:bg-gold/10"
            />
            {fileError.model && <p role="alert" className="mt-2 text-sm text-danger">{fileError.model}</p>}

            <div className="mt-4">
              {modelPreviewUrl ? (
                <>
                  {/* Live preview of the chosen file, straight from the computer - not uploaded yet */}
                  <ModelViewer modelUrl={modelPreviewUrl} title={`Preview of ${modelFile.name}`} className="h-80 rounded-sm border border-gold-deep sm:h-96" />
                  <p className="mt-2 text-sm text-ink-muted">
                    Preview of {modelFile.name} ({formatFileSize(modelFile.size)}). It is uploaded when you save.
                  </p>
                </>
              ) : savedModelUrl ? (
                <>
                  <ModelViewer modelUrl={savedModelUrl} title={artifact.title} initialCameraPosition={artifact.cameraPosition} className="h-80 rounded-sm border border-line sm:h-96" />
                  <p className="mt-2 text-sm text-ink-subtle">Current model. Choose a file to replace it.</p>
                </>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-sm border border-dashed border-line px-6 text-center text-sm text-ink-subtle">
                  No model yet. The artifact can be saved without one and the model added later.
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby={`${fieldId}-thumb`}>
            <h3 id={`${fieldId}-thumb`} className="text-xl">Thumbnail</h3>
            <p className="mt-1 text-sm text-ink-subtle">
              JPG, PNG or WebP, up to {IMAGE_MAX_MB} MB. Used in grids and lists. npm run models:thumbnails can make one.
            </p>
            <div className="mt-3 flex items-start gap-4">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-sm border border-line bg-surface">
                {(thumbnailPreviewUrl || savedThumbnailUrl) && (
                  <img src={thumbnailPreviewUrl || savedThumbnailUrl} alt="Thumbnail preview" className="h-full w-full object-contain" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Choose a thumbnail image"
                  onChange={pickFile('thumbnail', checkImageFile, setThumbnailFile)}
                  className="block w-full text-sm text-ink-muted file:mr-4 file:cursor-pointer file:rounded-sm file:border file:border-gold/60 file:bg-transparent file:px-4 file:py-2 file:text-gold hover:file:bg-gold/10"
                />
                {fileError.thumbnail && <p role="alert" className="mt-2 text-sm text-danger">{fileError.thumbnail}</p>}
                {thumbnailFile && <p className="mt-2 text-sm text-ink-muted">{thumbnailFile.name} ({formatFileSize(thumbnailFile.size)})</p>}
              </div>
            </div>
          </section>

          <div className="border-t border-line pt-6">
            <Notice tone="error">{error}</Notice>
            {isUploading ? (
              <UploadProgress percent={progress} />
            ) : (
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn btn-primary">
                  {isEdit ? 'Save changes' : 'Add artifact'}
                </button>
                <Link to="/dashboard/artifacts" className="btn btn-outline">
                  Cancel
                </Link>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default ArtifactForm;
