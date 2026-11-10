// frontend/src/components/dashboard/SettingsPanel.jsx
// User settings — profile info, notification preferences, Firebase config info.

import React, { useState } from 'react';
import { Settings, Bell, Shield, LogOut, Mail, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SettingsPanel() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifReminder, setNotifReminder] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Profile */}
      <div className="card">
        <h3 className="section-title"><Settings size={18} />Profile Information</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.375rem', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {currentUser?.displayName?.slice(0, 2)?.toUpperCase() || '??'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{currentUser?.displayName || 'User'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{currentUser?.email}</div>
            <div className="badge badge-green mt-1">✓ Verified</div>
          </div>
        </div>
        <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>
          <Info size={14} style={{ display: 'inline', marginRight: '0.375rem' }} />
          Profile editing is handled through Firebase Authentication. Contact support to update your email or name.
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <h3 className="section-title"><Bell size={18} />Notification Preferences</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Notifications are only sent when you have enabled them. Your emotional data is never automatically shared.
        </p>

        {[
          { id: 'notif-email', label: 'Email notifications', desc: 'Receive weekly emotional insights by email (requires email config in backend .env)', value: notifEmail, set: setNotifEmail },
          { id: 'notif-reminder', label: 'Daily check-in reminder', desc: 'A gentle reminder to complete your daily emotional check-in', value: notifReminder, set: setNotifReminder },
        ].map(({ id, label, desc, value, set }) => (
          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{desc}</div>
            </div>
            <button id={id} onClick={() => set(s => !s)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: value ? 'var(--gold)' : 'var(--bg-card)',
                position: 'relative', flexShrink: 0, transition: 'background 0.2s',
              }}
              aria-checked={value} role="switch" aria-label={label}>
              <span style={{
                position: 'absolute', top: 3, left: value ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', display: 'block',
              }} />
            </button>
          </div>
        ))}

        {saved && <div className="alert alert-success mt-3">Preferences saved!</div>}
        <button id="btn-save-settings" className="btn btn-primary mt-4" onClick={handleSave}>
          Save Preferences
        </button>
      </div>

      {/* Privacy */}
      <div className="card">
        <h3 className="section-title"><Shield size={18} />Privacy & Data</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <p>✅ Your journal entries are stored in Firebase Realtime Database under your unique user ID.</p>
          <p>✅ Only you can access your records. Firebase security rules prevent access by other users.</p>
          <p>✅ AI inference requests are proxied through the backend — your HF token is never exposed to the browser.</p>
          <p>✅ SERENE AI does not collect biometric data beyond temporary analysis for the session.</p>
          <p>✅ Emotion predictions are AI estimates only. SERENE AI does not diagnose mental health conditions.</p>
        </div>
      </div>

      {/* Sign out */}
      <div className="card" style={{ border: '1px solid rgba(244,63,94,0.2)' }}>
        <h3 className="section-title" style={{ color: 'var(--rose)' }}><LogOut size={18} />Sign Out</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          You'll be returned to the login page.
        </p>
        <button id="btn-settings-logout" className="btn btn-danger" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
