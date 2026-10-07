import { Link } from 'react-router';
import Logo from './Logo.jsx';

const LINKS = [
  { to: '/discover', label: 'Discover' },
  { to: '/collection', label: 'My Collection' },
];

function Footer() {
  return (
    // Dark band: light text on near-black (colours from the theme in index.css)
    <footer className="bg-night text-night-ink">
      <div className="page-container flex flex-col gap-8 py-10 sm:flex-row sm:justify-between">
        <div className="max-w-sm">
          <Logo inverted />
          <p className="mt-3 text-sm leading-relaxed text-night-muted">
            A virtual museum of 3D artifacts. Every model is shown with credit to its creator and its license.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-col gap-2 text-sm">
            {LINKS.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="text-night-muted transition-colors hover:text-night-ink">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <p className="page-container border-t border-white/10 pt-6 pb-8 text-xs text-night-muted">
        &copy; {new Date().getFullYear()} Beyond the Glass. A college full stack web development project.
      </p>
    </footer>
  );
}

export default Footer;
