// frontend/src/contexts/AuthContext.jsx
// Firebase Auth context with seamless local/demo mode fallback.

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase is configured with real credentials, listen to auth state
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Demo mode fallback — check localStorage
      try {
        const saved = localStorage.getItem('serene_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCurrentUser({
            ...parsed,
            getIdToken: async () => 'demo-token-serene-user',
          });
        }
      } catch (e) {
        console.warn('Failed to parse saved user', e);
      }
      setLoading(false);
    }
  }, []);

  async function register(email, password, fullName) {
    if (isFirebaseConfigured && auth) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      const user = { ...cred.user, displayName: fullName };
      setCurrentUser(user);
      return cred;
    } else {
      // Demo registration
      const user = {
        uid: 'demo-' + Date.now(),
        email,
        displayName: fullName,
        getIdToken: async () => 'demo-token-serene-user',
      };
      localStorage.setItem('serene_user', JSON.stringify({ uid: user.uid, email, displayName: fullName }));
      setCurrentUser(user);
      return { user };
    }
  }

  async function login(email, password) {
    if (isFirebaseConfigured && auth) {
      return signInWithEmailAndPassword(auth, email, password);
    } else {
      // Demo login
      const user = {
        uid: 'demo-user-101',
        email,
        displayName: email.split('@')[0] || 'Demo User',
        getIdToken: async () => 'demo-token-serene-user',
      };
      localStorage.setItem('serene_user', JSON.stringify({ uid: user.uid, email, displayName: user.displayName }));
      setCurrentUser(user);
      return { user };
    }
  }

  async function demoLogin() {
    const user = {
      uid: 'demo-user-101',
      email: 'demo@serene.ai',
      displayName: 'Dr. Sai (Demo)',
      getIdToken: async () => 'demo-token-serene-user',
    };
    localStorage.setItem('serene_user', JSON.stringify({ uid: user.uid, email: user.email, displayName: user.displayName }));
    setCurrentUser(user);
    return { user };
  }

  async function logout() {
    if (isFirebaseConfigured && auth) {
      return signOut(auth);
    } else {
      localStorage.removeItem('serene_user');
      setCurrentUser(null);
    }
  }

  async function resetPassword(email) {
    if (isFirebaseConfigured && auth) {
      return sendPasswordResetEmail(auth, email);
    } else {
      return Promise.resolve();
    }
  }

  const value = {
    currentUser,
    loading,
    isFirebaseConfigured,
    register,
    login,
    demoLogin,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
