// frontend/src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './auth.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (!form.email.includes('@')) return 'Enter a valid email address.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      await register(form.email, form.password, form.fullName.trim());
      navigate('/dashboard');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This email is already registered.'
        : err.code === 'auth/invalid-email'
          ? 'Invalid email address.'
          : err.message || 'Registration failed. Please try again.';
      setError(msg);
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

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Start your emotional wellness journey</p>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-fullName">Full Name</label>
            <div className="input-group">
              <User size={16} className="input-icon" />
              <input
                id="reg-fullName" name="fullName" type="text"
                className="form-input input-with-icon"
                placeholder="Your full name"
                value={form.fullName} onChange={handleChange} required autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email Address</label>
            <div className="input-group">
              <Mail size={16} className="input-icon" />
              <input
                id="reg-email" name="email" type="email"
                className="form-input input-with-icon"
                placeholder="you@example.com"
                value={form.email} onChange={handleChange} required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="input-group">
              <Lock size={16} className="input-icon" />
              <input
                id="reg-password" name="password" type={showPass ? 'text' : 'password'}
                className="form-input input-with-icon"
                placeholder="At least 8 characters"
                style={{ paddingRight: '2.75rem' }}
                value={form.password} onChange={handleChange} required
              />
              <button type="button" className="password-toggle" id="reg-toggle-pass"
                onClick={() => setShowPass(s => !s)} aria-label="Toggle password visibility">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
            <div className="input-group">
              <Lock size={16} className="input-icon" />
              <input
                id="reg-confirm" name="confirm" type={showPass ? 'text' : 'password'}
                className="form-input input-with-icon"
                placeholder="Repeat your password"
                value={form.confirm} onChange={handleChange} required
              />
            </div>
          </div>

          <button type="submit" id="reg-submit" className="btn btn-primary btn-lg w-full mt-2" disabled={loading}>
            {loading ? <><span className="spinner" />&nbsp;Creating account…</> : <><UserPlus size={18} />Create Account</>}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" id="go-to-login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
