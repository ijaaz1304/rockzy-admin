import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, missingClientFirebaseEnvVars } from '../lib/firebase';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ✅ Redirect to dashboard if already logged in
  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (isAdmin === 'true') {
      router.replace('/dashboard');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!auth) {
        const missingVars = missingClientFirebaseEnvVars.join(', ');
        throw new Error(
          missingVars
            ? `Firebase client config is missing: ${missingVars}. Add them to your deployment environment and rebuild/redeploy the app.`
            : 'Firebase client config is missing. Set NEXT_PUBLIC_FIREBASE_* variables for the frontend and rebuild/redeploy the app.'
        );
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      const res = await fetch('/api/check-admin/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();

      if (result.isAdmin) {
        localStorage.setItem('isAdmin', 'true');
        await router.push('/dashboard');
      } else {
        await signOut(auth);
        alert('Access denied. You are not an admin.');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Rockzy Admin Login</title>
      </Head>
      <main className="premium-shell flex items-center justify-center">
        <div className="premium-card w-full max-w-md p-8 sm:p-10">
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="chip">Rockzy Admin Portal</p>
            <ThemeToggle />
          </div>
          <h1 className="premium-title mb-1">Welcome back</h1>
          <p className="premium-subtitle mb-8">
            Sign in to manage posts, comments, and moderation actions.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <input
                type="email"
                className="premium-input"
                placeholder="admin@rockzy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="password">
                Password
              </label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="premium-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="premium-button w-full">
              {loading ? 'Signing in...' : 'Sign in to dashboard'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-faint">
            © 2026 Rockzy Admin Panel. All rights reserved.
          </p>
        </div>
      </main>
    </>
  );
}
