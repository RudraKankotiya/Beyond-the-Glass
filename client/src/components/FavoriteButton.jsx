import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import api, { getErrorMessage } from '../api/axios.js';
import useAuth from '../hooks/useAuth.js';

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 20s-7-4.4-9-9.2C1.7 7.6 3.8 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.2 0 5.3 3.1 4 6.3C19 15.6 12 20 12 20z" />
    </svg>
  );
}

// Saves an artifact to (or removes it from) the visitor's collection.
// Logged-out visitors get a link to log in, which brings them back here afterwards.
function FavoriteButton({ artifactId }) {
  const { user, setFavorites } = useAuth();
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <Link to="/login" state={{ from: location }} className="btn btn-outline">
        <HeartIcon /> Log in to save
      </Link>
    );
  }

  const isSaved = user.favorites?.includes(artifactId);

  const toggle = async () => {
    setSaving(true);
    setError('');
    try {
      // Both routes answer with the updated list of favorite ids
      const { data } = isSaved
        ? await api.delete(`/users/favorites/${artifactId}`)
        : await api.post(`/users/favorites/${artifactId}`);
      setFavorites(data.favorites);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={isSaved}
        className={`btn ${isSaved ? 'btn-primary' : 'btn-outline'}`}
      >
        <HeartIcon filled={isSaved} />
        {isSaved ? 'Saved to My Collection' : 'Save to My Collection'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default FavoriteButton;
