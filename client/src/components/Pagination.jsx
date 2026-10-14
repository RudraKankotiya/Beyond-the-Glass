// Previous / Next buttons with "Page 2 of 5". Hidden when everything fits on one page.
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pages" className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-6">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn btn-outline"
      >
        Previous
      </button>
      <p className="text-sm text-ink-muted" aria-live="polite">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn btn-outline"
      >
        Next
      </button>
    </nav>
  );
}

export default Pagination;
