import { Link } from 'react-router';

// Wordmark with a small display-case icon (a gold frame with a glass reflection line)
// inverted: light version for dark backgrounds (the footer)
function Logo({ inverted = false, className = '' }) {
  const accent = inverted ? 'var(--color-gold-deep)' : 'var(--color-gold)';
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${inverted ? 'text-night-ink' : 'text-ink'} ${className}`}>
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none" aria-hidden="true">
        <rect x="0.75" y="0.75" width="16.5" height="20.5" stroke={accent} strokeWidth="1.5" />
        <path d="M5 16L12 5" stroke={accent} strokeOpacity="0.7" strokeWidth="1" />
      </svg>
      <span className="font-display text-xl font-medium">Beyond the Glass</span>
    </Link>
  );
}

export default Logo;
