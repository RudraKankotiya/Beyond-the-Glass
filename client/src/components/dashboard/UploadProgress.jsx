// Shows how much of an upload has been sent. After 100% the server still has to store the
// files and save the record, so the label changes to "Saving…".
function UploadProgress({ percent }) {
  return (
    <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="h-1 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-gold transition-[width] duration-150" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-sm text-ink-muted">{percent < 100 ? `Uploading ${percent}%` : 'Saving…'}</p>
    </div>
  );
}

export default UploadProgress;
