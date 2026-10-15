import { Navigate, NavLink, Route, Routes } from 'react-router';
import NotFoundPage from '../NotFoundPage.jsx';
import ArtifactForm from './ArtifactForm.jsx';
import ArtifactsTable from './ArtifactsTable.jsx';
import ExhibitionForm from './ExhibitionForm.jsx';
import ExhibitionsList from './ExhibitionsList.jsx';

// Loaded lazily (React.lazy in App.jsx) and only for curators/admins (ProtectedRoute).
// App.jsx matches "/dashboard/*"; the nested <Routes> below handle the rest of the URL.

const SECTIONS = [
  { to: '/dashboard/artifacts', label: 'Artifacts' },
  { to: '/dashboard/exhibitions', label: 'Exhibitions' },
];

function DashboardPage() {
  return (
    <section>
      <header className="page-container pt-10 pb-2">
        <h1 className="text-4xl">Dashboard</h1>
        <nav aria-label="Dashboard" className="mt-6 mb-8">
          <ul className="flex gap-6 border-b border-line">
            {SECTIONS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `-mb-px block border-b py-3 text-sm whitespace-nowrap transition-colors ${
                      isActive ? 'border-gold text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Routes>
        <Route index element={<Navigate to="artifacts" replace />} />
        <Route path="artifacts" element={<ArtifactsTable />} />
        <Route path="artifacts/new" element={<ArtifactForm />} />
        <Route path="artifacts/:id/edit" element={<ArtifactForm />} />
        <Route path="artifacts/:id/hotspots" element={<Navigate to="../edit" replace />} />
        <Route path="exhibitions" element={<ExhibitionsList />} />
        <Route path="exhibitions/new" element={<ExhibitionForm />} />
        <Route path="exhibitions/:slug/edit" element={<ExhibitionForm />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </section>
  );
}

export default DashboardPage;
