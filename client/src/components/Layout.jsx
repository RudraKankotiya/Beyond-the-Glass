import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import PageLoader from './PageLoader.jsx';

function Layout() {
  const { pathname } = useLocation();

  // Start each new page at the top (the browser would otherwise keep the old scroll position)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Lets keyboard users jump past the navigation */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-canvas"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main" className="flex-1">
        {/* Lazy-loaded pages (artifact viewer, dashboard) show the loader while their code downloads */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

export default Layout;
