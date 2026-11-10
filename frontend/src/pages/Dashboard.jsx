// frontend/src/pages/Dashboard.jsx
// Main dashboard page — renders sidebar + content area for the active section.

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, LayoutDashboard, FileText, Mic, Camera, Layers,
  BookOpen, BarChart2, Music2, Settings, LogOut, Menu, X, Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Overview from '../components/dashboard/Overview';
import TextEmotion from '../components/emotion/TextEmotion';
import FaceEmotion from '../components/emotion/FaceEmotion';
import VoiceEmotion from '../components/emotion/VoiceEmotion';
import MultimodalFusion from '../components/emotion/MultimodalFusion';
import DailyCheckin from '../components/dashboard/DailyCheckin';
import JournalHistory from '../components/journal/JournalHistory';
import MoodTrends from '../components/charts/MoodTrends';
import Recommendations from '../components/dashboard/Recommendations';
import MusicRecommendations from '../components/dashboard/MusicRecommendations';
import SettingsPanel from '../components/dashboard/SettingsPanel';
import './Dashboard.css';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Emotion Analysis',
    items: [
      { id: 'text', label: 'Text Analysis', icon: FileText },
      { id: 'face', label: 'Face Recognition', icon: Camera },
      { id: 'voice', label: 'Voice Analysis', icon: Mic },
      { id: 'fusion', label: 'Multimodal Fusion', icon: Layers },
    ],
  },
  {
    label: 'Wellness',
    items: [
      { id: 'checkin', label: 'Daily Check-in', icon: Sparkles },
      { id: 'journal', label: 'Journal', icon: BookOpen },
      { id: 'trends', label: 'Mood Trends', icon: BarChart2 },
      { id: 'recommendations', label: 'Activities', icon: Brain },
      { id: 'music', label: 'Music', icon: Music2 },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const SECTION_TITLES = {
  overview: 'Dashboard Overview',
  text: 'Text Emotion Analysis',
  face: 'Facial Expression Recognition',
  voice: 'Voice Emotion Recognition',
  fusion: 'Multimodal Fusion Engine',
  checkin: 'Daily Emotional Check-in',
  journal: 'Emotional Journal',
  trends: 'Mood Trends & Analytics',
  recommendations: 'Well-being Activities',
  music: 'Music for Well-being',
  settings: 'Settings',
};

function SectionContent({ section }) {
  switch (section) {
    case 'overview': return <Overview />;
    case 'text': return <TextEmotion />;
    case 'face': return <FaceEmotion />;
    case 'voice': return <VoiceEmotion />;
    case 'fusion': return <MultimodalFusion />;
    case 'checkin': return <DailyCheckin />;
    case 'journal': return <JournalHistory />;
    case 'trends': return <MoodTrends />;
    case 'recommendations': return <Recommendations />;
    case 'music': return <MusicRecommendations />;
    case 'settings': return <SettingsPanel />;
    default: return <Overview />;
  }
}

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigateTo = useCallback((id) => {
    setActive(id);
    setSidebarOpen(false);
  }, []);

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Brain size={22} color="#0b1120" />
          </div>
          <div className="sidebar-logo-text">
            SERENE <span>AI</span>
          </div>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  id={`nav-${id}`}
                  className={`nav-item ${active === id ? 'active' : ''}`}
                  onClick={() => navigateTo(id)}
                  aria-current={active === id ? 'page' : undefined}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{currentUser?.displayName || 'User'}</div>
            <div className="user-email">{currentUser?.email}</div>
          </div>
          <button id="btn-logout" className="btn btn-icon btn-ghost" onClick={handleLogout}
            data-tooltip="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button className="hamburger btn btn-icon btn-ghost" id="btn-hamburger"
              onClick={() => setSidebarOpen(s => !s)} aria-label="Toggle menu">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="topbar-title">{SECTION_TITLES[active]}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge badge-gold hide-mobile">
              {currentUser?.displayName?.split(' ')[0] || 'User'}
            </span>
          </div>
        </header>

        <div className="content-area">
          <SectionContent section={active} />
        </div>
      </main>
    </div>
  );
}
