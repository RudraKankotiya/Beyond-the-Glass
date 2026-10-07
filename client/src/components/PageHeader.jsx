// Title block at the top of a page: an <h1> and an optional introduction
function PageHeader({ title, children }) {
  return (
    <header className="page-container pt-12 pb-8 sm:pt-16 sm:pb-10">
      <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
      {children && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">{children}</p>}
    </header>
  );
}

export default PageHeader;
