import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { adminFetch } from '../lib/adminFetch';
import { auth } from '../lib/firebase';
import ThemeToggle from '../components/ThemeToggle';

type ReportSummary = {
  id: string;
  reason: string;
  reportedBy: string;
  createdAt: number | null;
};

type ReportedPost = {
  id: string;
  title?: string;
  content?: string;
  reportCount: number;
  reports: ReportSummary[];
  imageUrl?: string;
  imageUrls?: string[];
  imageList?: string[];
  createdAt?: number;
  timestamp?: number;
};

export default function ReportedPosts() {
  const [posts, setPosts] = useState<ReportedPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    if (!auth) {
      setError('Firebase client is not configured.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setPosts([]);
        setError('Sign in again to load reported posts.');
        setLoading(false);
        return;
      }
      loadPosts({ search: searchTerm, page: 1 });
    });

    return unsubscribe;
  }, [searchTerm]);

  const loadPosts = async ({ search = '', page: nextPage = 1 }: { search?: string; page?: number }) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ reportedOnly: '1', page: String(nextPage) });
      if (search) params.set('search', search);
      const data = await adminFetch<{
        posts: ReportedPost[];
        totalCount?: number;
        page?: number;
        hasMore?: boolean;
      }>(`/api/posts/?${params}`);

      setPosts(data.posts || []);
      setSelected([]);
      setTotalCount(data.totalCount || 0);
      setPage(data.page || nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (fetchError) {
      console.error('Failed to fetch reported posts:', fetchError);
      setPosts([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load reported posts');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => loadPosts({ search: searchTerm, page: 1 });

  const getPostImages = (post: ReportedPost) => {
    if (Array.isArray(post.imageUrls) && post.imageUrls.length > 0) return post.imageUrls;
    if (Array.isArray(post.imageList) && post.imageList.length > 0) return post.imageList;
    if (typeof post.imageUrl === 'string' && post.imageUrl.length > 0) return [post.imageUrl];
    return [];
  };

  const visibleIds = posts.map((post) => post.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const toggleAll = () => {
    setSelected(allSelected ? [] : visibleIds);
  };

  const toggleOne = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reported post?')) return;
    try {
      await adminFetch(`/api/posts/?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete post');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} selected post${selected.length === 1 ? '' : 's'}?`)) return;
    try {
      await adminFetch('/api/posts/', {
        method: 'DELETE',
        body: JSON.stringify({ ids: selected }),
      });
      setSelected([]);
      refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete posts');
    }
  };

  return (
    <main className="premium-shell overflow-auto">
      {loading ? (
        <div className="mt-40 flex flex-col items-center justify-center gap-4">
          <svg className="h-10 w-10 animate-spin text-accent" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-lg font-semibold">Loading reported posts...</p>
        </div>
      ) : (
        <div className="premium-card mx-auto w-full max-w-7xl p-6">
          <div className="page-toolbar">
            <Link href="/dashboard" className="premium-button-secondary">
              ← Dashboard
            </Link>
            <ThemeToggle />
          </div>
          <div className="page-toolbar">
            <div>
              <h1 className="premium-title">Reported Posts</h1>
              <p className="premium-subtitle">Posts reported by users: {totalCount}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input className="check" type="checkbox" checked={allSelected} onChange={toggleAll} />
                Select page
              </label>
              <input
                type="text"
                placeholder="Search by title or content"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value.trim() === '') setSearchTerm('');
                }}
                className="premium-input"
              />
              <button onClick={() => setSearchTerm(searchInput.trim())} className="premium-button">
                Search
              </button>
            </div>
          </div>

          {error && <div className="notice">{error}</div>}

          {selected.length > 0 && (
            <div className="bulk-bar">
              <span className="text-sm font-medium">{selected.length} selected</span>
              <button onClick={handleBulkDelete} className="danger-button">Delete selected</button>
            </div>
          )}

          {posts.length === 0 && !error && (
            <div className="panel p-6 text-sm text-muted">No reported posts.</div>
          )}

          {posts.map((post) => (
            <div key={post.id} className={`panel mb-4 p-4 ${selected.includes(post.id) ? 'ring-2 ring-indigo-400/40' : ''}`}>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <input
                  className="check"
                  type="checkbox"
                  checked={selected.includes(post.id)}
                  onChange={() => toggleOne(post.id)}
                />
                {post.title || 'Untitled post'}
              </label>
              <p className="clamp-3">{post.content}</p>
              {getPostImages(post).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {getPostImages(post).map((url, index) => (
                    <img key={url} src={url} alt={`Reported post image ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-faint">Reports: {post.reportCount}</p>
              <div className="mt-3 space-y-2">
                {post.reports.slice(0, 3).map((report) => (
                  <div key={report.id} className="panel-2 px-3 py-2 text-sm">
                    <p>{report.reason}</p>
                    <p className="text-xs text-faint">
                      {report.reportedBy ? `Reported by ${report.reportedBy}` : 'Reporter not recorded'}
                      {report.createdAt ? ` · ${new Date(report.createdAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                ))}
                {post.reports.length > 3 && (
                  <p className="text-xs text-faint">{post.reports.length - 3} more report{post.reports.length - 3 === 1 ? '' : 's'}</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/post-detail/${post.id}?from=reported-posts`} className="premium-button-secondary">
                  View
                </Link>
                <button onClick={() => handleDelete(post.id)} className="danger-button">
                  Delete Post
                </button>
              </div>
            </div>
          ))}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => loadPosts({ search: searchTerm, page: page - 1 })}
              disabled={page <= 1 || loading}
              className="premium-button"
            >
              Previous
            </button>
            <span className="text-sm text-muted">Page {page}</span>
            <button
              onClick={() => loadPosts({ search: searchTerm, page: page + 1 })}
              disabled={!hasMore || loading}
              className="premium-button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
