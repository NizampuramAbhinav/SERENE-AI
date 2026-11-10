// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './auth.css';

export default function Login() {
  const { login, resetPassword, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.code === 'auth/user-not-found' ? 'No account found with this email.' :
        err.code === 'auth/wrong-password' ? 'Incorrect password.' :
        err.code === 'auth/invalid-email' ? 'Invalid email address.' :
        err.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.' :
        err.message || 'Login failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(''); setLoading(true);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!form.email) { setError('Enter your email address first.'); return; }
    setError(''); setLoading(true);
    try {
      await resetPassword(form.email);
      setInfo('Password reset email sent! Check your inbox.');
      setForgotMode(false);
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Brain size={26} color="#0b1120" />
          </div>
          <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.375rem', color: '#f1f5f9' }}>
            SERENE <span style={{ color: '#f59e0b' }}>AI</span>
          </span>
        </div>

        <h1 className="auth-title">{forgotMode ? 'Reset Password' : 'Welcome Back'}</h1>
        <p className="auth-subtitle">
          {forgotMode ? "We'll send a reset link to your email" : 'Sign in to your SERENE AI account'}
        </p>

        {error && <div className="alert alert-error mb-4">{error}</div>}
        {info && <div className="alert alert-success mb-4">{info}</div>}

        <form className="auth-form" onSubmit={forgotMode ? handleReset : handleLogin} id="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <div className="input-group">
              <Mail size={16} className="input-icon" />
              <input
                id="login-email" name="email" type="email"
                className="form-input input-with-icon"
                placeholder="you@example.com"
                value={form.email} onChange={handleChange} required autoFocus
              />
            </div>
          </div>

          {!forgotMode && (
            <div className="form-group">
              <div className="flex justify-between items-center">
                <label className="form-label" htmlFor="login-password">Password</label>
                <button type="button" id="btn-forgot"
                  onClick={() => { setForgotMode(true); setError(''); }}
                  style={{ fontSize: '0.8rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>
              <div className="input-group">
                <Lock size={16} className="input-icon" />
                <input
                  id="login-password" name="password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input input-with-icon"
                  placeholder="Your password"
                  style={{ paddingRight: '2.75rem' }}
                  value={form.password} onChange={handleChange} required
                />
                <button type="button" className="password-toggle" id="login-toggle-pass"
                  onClick={() => setShowPass(s => !s)} aria-label="Toggle password visibility">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" id="login-submit" className="btn btn-primary btn-lg w-full mt-2" disabled={loading}>
            {loading ? <><span className="spinner" />&nbsp;{forgotMode ? 'Sending…' : 'Signing in…'}</> :
              forgotMode ? 'Send Reset Link' : <><LogIn size={18} />Sign In</>}
          </button>

          {!forgotMode && (
            <button
              type="button"
              id="btn-demo-login"
              className="btn btn-secondary w-full mt-2"
              onClick={handleDemo}
              disabled={loading}
              style={{ border: '1px dashed var(--gold)', color: 'var(--gold)' }}
            >
              ✨ Instant Demo Access (1-Click)
            </button>
          )}

          {forgotMode && (
            <button type="button" id="btn-back-login" className="btn btn-ghost w-full"
              onClick={() => { setForgotMode(false); setError(''); }}>
              ← Back to Sign In
            </button>
          )}
        </form>

        {!forgotMode && (
          <div className="auth-footer">
            Don't have an account? <Link to="/register" id="go-to-register">Create one</Link>
          </div>
        )}
      </div>
    </div>
  );
}
