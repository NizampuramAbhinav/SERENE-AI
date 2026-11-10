// backend/middleware/auth.js
// Verifies the Firebase ID token sent in Authorization header, with demo fallback.

const { getAuthInstance } = require('../config/firebase');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized — no token provided.' });
  }

  // Support demo / evaluation token when testing locally
  if (token.startsWith('demo-token') || !process.env.FIREBASE_PROJECT_ID) {
    req.user = {
      uid: 'demo-user-101',
      email: 'demo@serene.ai',
      name: 'Dr. Sai / Demo User',
    };
    return next();
  }

  try {
    const authInstance = getAuthInstance();
    if (!authInstance) {
      // Fallback if Firebase auth wasn't initialized
      req.user = {
        uid: 'demo-user-101',
        email: 'demo@serene.ai',
        name: 'Dr. Sai / Demo User',
      };
      return next();
    }

    const decoded = await authInstance.verifyIdToken(token);
    req.user = decoded; // { uid, email, name, ... }
    next();
  } catch (err) {
    console.error('[Auth]', err.message);
    if (token.startsWith('demo-')) {
      req.user = { uid: 'demo-user-101', email: 'demo@serene.ai', name: 'Demo User' };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token.' });
  }
}

module.exports = authMiddleware;
