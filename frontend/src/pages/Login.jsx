import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Logo from '../components/Logo';

const roleHome = { customer: '/customer', driver: '/driver', admin: '/admin' };

const Login = () => {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(roleHome[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <LanguageSwitcher floating />
      <div className="w-full max-w-sm bg-surface p-8 rounded-2xl shadow-card border border-line">
        <Logo size={44} className="mb-5" />
        <h1 className="text-2xl font-bold text-ink mb-1">{t('auth.welcomeBack')}</h1>
        <p className="text-muted text-sm mb-6">{t('auth.signInSubtitle')}</p>

        {error && (
          <div className="mb-4 text-sm text-danger-700 bg-danger-50 border border-danger-100 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder={t('auth.email')}
            className="field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            required
            placeholder={t('auth.password')}
            className="field"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <p className="text-sm text-muted mt-5 text-center">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-primary-700 font-medium hover:text-primary-800">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;