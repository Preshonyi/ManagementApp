import { getEnvValue } from './env';

export const firebaseConfig = {
  apiKey: getEnvValue('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvValue('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvValue('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvValue('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvValue('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvValue('VITE_FIREBASE_APP_ID'),
  measurementId: getEnvValue('VITE_FIREBASE_MEASUREMENT_ID'),
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

async function firebaseAuthRequest(path, payload) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message?.replaceAll('_', ' ').toLowerCase() || 'Firebase authentication failed';
    throw new Error(message.charAt(0).toUpperCase() + message.slice(1));
  }

  return data;
}

export async function firebaseRegister({ name, email, password }) {
  const created = await firebaseAuthRequest('accounts:signUp', {
    email,
    password,
    returnSecureToken: true,
  });

  const updated = await firebaseAuthRequest('accounts:update', {
    idToken: created.idToken,
    displayName: name,
    returnSecureToken: true,
  });

  return {
    uid: updated.localId,
    email: updated.email,
    displayName: updated.displayName || name,
    idToken: updated.idToken,
    refreshToken: updated.refreshToken,
  };
}

export async function firebaseLogin({ email, password }) {
  const data = await firebaseAuthRequest('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });

  return {
    uid: data.localId,
    email: data.email,
    displayName: data.displayName || data.email.split('@')[0],
    idToken: data.idToken,
    refreshToken: data.refreshToken,
  };
}

export function initAnalytics() {
  return null;
}
