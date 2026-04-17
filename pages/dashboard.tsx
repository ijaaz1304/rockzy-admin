import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getAuth, signOut } from 'firebase/auth';

export default function Dashboard() {
  const router = useRouter();
  const options = [
    {
      label: 'Posts',
      description: 'Review, edit, and moderate published content.',
      href: '/posts',
      icon: '📝',
    },
    {
      label: 'Comments',
      description: 'Moderate conversations and high-risk replies.',
      href: '/comments',
      icon: '💬',
    },
    {
      label: 'Create Post',
      description: 'Publish announcements and featured updates.',
      href: '/create-post',
      icon: '🚀',
    },
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
        <title>Rockzy Admin Dashboard</title>
      </Head>
      <main className="premium-shell">
        <div className="mx-auto max-w-6xl">
          <div className="premium-card mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h1 className="premium-title">Rockzy Dashboard</h1>
              <p className="premium-subtitle">
                Fast moderation controls with a cleaner, accessible workspace.
              </p>
            </div>
            <button onClick={handleLogout} className="danger-button">
              Logout
            </button>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {options.map(({ label, description, href, icon }) => (
              <Link href={href} key={label} className="group">
                <article className="premium-card h-full p-6 transition hover:-translate-y-1 hover:border-indigo-400/40">
                  <p className="mb-4 text-3xl">{icon}</p>
                  <h2 className="mb-2 text-xl font-semibold text-white">{label}</h2>
                  <p className="text-sm text-slate-300">{description}</p>
                  <p className="mt-5 text-sm font-medium text-indigo-300 group-hover:text-indigo-200">
                    Open section →
                  </p>
                </article>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
