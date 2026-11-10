// backend/config/firebase.js
// Firebase Admin SDK initialization for server-side operations (compatible with firebase-admin v14).

const admin = require('firebase-admin');
const { getDatabase } = require('firebase-admin/database');
const { getAuth } = require('firebase-admin/auth');

let db = null;
let authInstance = null;

function initFirebase() {
  const apps = typeof admin.getApps === 'function' ? admin.getApps() : (admin.apps || []);
  if (apps.length > 0) {
    db = getDatabase();
    authInstance = getAuth();
    return;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey ||
    !process.env.FIREBASE_DATABASE_URL
  ) {
    console.warn(
      '[Firebase] Environment variables not fully configured. Operating in local in-memory mode.'
    );
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    db = getDatabase();
    authInstance = getAuth();
    console.log('[Firebase] Admin SDK initialised successfully.');
  } catch (err) {
    console.warn('[Firebase] Init notice:', err.message);
  }
}

initFirebase();

module.exports = {
  admin,
  getDb: () => db,
  getAuthInstance: () => authInstance,
};
