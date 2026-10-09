import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { getErrorMessage } from '../api/axios.js';
import FormField from '../components/FormField.jsx';
import useAuth from '../hooks/useAuth.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

const MIN_PASSWORD_LENGTH = 8; // same rule as the API

function RegisterPage() {
  useDocumentTitle('Create an account');
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || '/';

  if (user) return <Navigate to={redirectTo} replace />;

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <section className="page-container flex justify-center py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl">Create an account</h1>
        <p className="mt-3 text-ink-muted">Free, and it takes less than a minute.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <FormField label="Name" name="name" autoComplete="name" required maxLength={60} value={form.name} onChange={handleChange} />
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
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={form.password}
            onChange={handleChange}
          />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="text-gold hover:text-gold-bright">
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
