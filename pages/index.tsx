import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        throw new Error(
          'Firebase client config is missing. Set NEXT_PUBLIC_FIREBASE_* variables for the frontend.'
        );
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      const res = await fetch('/api/check-admin', {
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
          <p className="mb-3 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
            Rockzy Admin Portal
          </p>
          <h1 className="premium-title mb-1">Welcome back</h1>
          <p className="premium-subtitle mb-8">
            Sign in to manage posts, comments, and moderation actions.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Email</label>
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
              <label className="mb-2 block text-sm font-medium text-slate-200">Password</label>
              <input
                type="password"
                className="premium-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="premium-button w-full">
              {loading ? 'Signing in...' : 'Sign in to dashboard'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            © 2026 Rockzy Admin Panel. All rights reserved.
          </p>
        </div>
      </main>
    </>
  );
}
