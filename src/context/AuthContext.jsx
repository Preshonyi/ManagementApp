import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { firebaseLogin, firebaseRegister, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);
const DEMO_USER_KEY = 'pcp_demo_user';
const FIREBASE_USER_KEY = 'pcp_firebase_user';

function buildDemoUser(email, name) {
  return {
    uid: `demo-${email.toLowerCase()}`,
    email,
    displayName: name || email.split('@')[0],
    isDemo: true,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      const savedUser = localStorage.getItem(DEMO_USER_KEY);
      setUser(savedUser ? JSON.parse(savedUser) : null);
      setLoading(false);
      return;
    }

    const savedUser = localStorage.getItem(FIREBASE_USER_KEY);
    setUser(savedUser ? JSON.parse(savedUser) : null);
    setLoading(false);
  }, []);

  async function register({ name, email, password }) {
    if (!isFirebaseConfigured) {
      const demoUser = buildDemoUser(email, name);
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return demoUser;
    }

    const firebaseUser = await firebaseRegister({ name, email, password });
    localStorage.setItem(FIREBASE_USER_KEY, JSON.stringify(firebaseUser));
    setUser(firebaseUser);
    return firebaseUser;
  }

  async function login({ email, password }) {
    if (!isFirebaseConfigured) {
      const demoUser = buildDemoUser(email);
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return demoUser;
    }

    const firebaseUser = await firebaseLogin({ email, password });
    localStorage.setItem(FIREBASE_USER_KEY, JSON.stringify(firebaseUser));
    setUser(firebaseUser);
    return firebaseUser;
  }

  async function logout() {
    localStorage.removeItem(DEMO_USER_KEY);
    localStorage.removeItem(FIREBASE_USER_KEY);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      register,
      authMode: isFirebaseConfigured ? 'firebase' : 'demo',
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
