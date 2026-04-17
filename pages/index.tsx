import Head from 'next/head';
import {useEffect, useState} from 'react';
import { useRouter } from 'next/router';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { app, auth } from '../lib/firebase';

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

  type CheckAdminResponse = {
    isAdmin: boolean;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      console.log("token - "+token);
      /*const res = await fetch('/api/check-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();*/

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


  /*const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("login------------ -","Success");
      // 2. Get the ID token
      const token = await userCredential.user.getIdToken();

      console.log(token);
      console.log(email);
      // 3. Call the protected API
      const res = await fetch(
          process.env.NEXT_PUBLIC_CHECK_ADMIN_URL as string,
          {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({})
          }
      );


      console.log("res====",res);
      const result = await res.json();

      console.log("checkAdmin====",result);

      // 4. Redirect or show error
      if (result.isAdmin) {
        localStorage.setItem('isAdmin', 'true');
        await router.push('/dashboard');
      } else {
        alert("Access denied. You are not an admin.");
      }
    } catch (err) {
      console.error(err);
      alert(`Login failed. Check credentials.${err.message}`);
    } finally {
      setLoading(false);
    }
  };*/

  return (
      <>
        <Head>
          <title>Coinzy Admin Login</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-700 to-orange-400 relative overflow-hidden">
          <div className="z-10 bg-[#ffffff0f] backdrop-blur-md p-10 rounded-2xl w-full max-w-md shadow-xl text-white">
            <h1 className="text-3xl font-bold mb-1 flex items-center justify-center gap-2">
              <span>👑</span> Coinzy Admin
            </h1>
            <p className="text-sm mb-6 text-center">Secure access for administrators only</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm">Email</label>
                <input
                    type="email"
                    className="w-full px-4 py-2 rounded-md bg-[#3b2f4c] text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm">Password</label>
                <input
                    type="password"
                    className="w-full px-4 py-2 rounded-md bg-[#3b2f4c] text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
              </div>
              <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 rounded-md transition duration-200"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <p className="text-xs text-center mt-6 text-gray-300">
              © 2025 Coinzy Admin Panel.<br />All rights reserved.
            </p>
          </div>
        </div>
      </>
  );
}
