import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getAuth, signOut } from 'firebase/auth';

export default function Dashboard() {
  const router = useRouter();
  const options = [
    { label: 'All Posts', href: '/posts' },
    { label: 'All Comments', href: '/comments' },
    { label: 'Create Post', href: '/create-post' },
  ];

  const handleLogout = async () => {
    try {
      localStorage.removeItem('isAdmin');
      await signOut(getAuth()); // optional, for clearing Firebase session
      await router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
      <>
        <Head>
          <title>Coinzy Admin Dashboard</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-700 to-orange-400 relative overflow-hidden">
          <button
              onClick={handleLogout}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>

          <div className="z-10 bg-[#ffffff0f] backdrop-blur-md p-10 rounded-2xl w-full max-w-md shadow-xl text-white">
            <h1 className="text-4xl font-bold text-gray-800 mb-12">📋 Admin Dashboard</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
              {options.map(({ label, href }) => (
                  <Link href={href} key={label}>
                    <div className="cursor-pointer bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 text-center text-xl font-medium text-gray-700">
                      {label}
                    </div>
                  </Link>
              ))}
            </div>
          </div>
        </div>
      </>
  );
}
