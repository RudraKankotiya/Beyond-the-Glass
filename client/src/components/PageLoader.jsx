// Shown while a lazy-loaded page downloads or the saved login is being checked
function PageLoader() {
  return (
    <div role="status" className="page-container flex min-h-[50vh] items-center justify-center">
      <div className="h-px w-24 overflow-hidden bg-line">
        <div className="h-full w-1/3 animate-loader bg-gold" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default PageLoader;
