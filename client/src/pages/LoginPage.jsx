import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { getErrorMessage } from '../api/axios.js';
import FormField from '../components/FormField.jsx';
import useAuth from '../hooks/useAuth.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

function LoginPage() {
  useDocumentTitle('Log in');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ProtectedRoute sends users here with the page they wanted in state.from
  const redirectTo = location.state?.from?.pathname || '/';

  // Already logged in (e.g. opened /login directly)
  if (user) return <Navigate to={redirectTo} replace />;

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <section className="page-container flex justify-center py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl">Log in</h1>
        <p className="mt-3 text-ink-muted">Save favorites and track your quiz scores.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange}
          />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-8 text-sm text-ink-muted">
          New here?{' '}
          <Link to="/register" state={location.state} className="text-gold hover:text-gold-bright">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}

export default LoginPage;
