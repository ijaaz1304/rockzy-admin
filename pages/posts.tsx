import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { adminFetch } from '../lib/adminFetch';
import { auth } from '../lib/firebase';
import ThemeToggle from '../components/ThemeToggle';
import { useRouter } from 'next/router';

export default function Posts() {
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [updatedContent, setUpdatedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const [pageStarts, setPageStarts] = useState<string[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSortField, setActiveSortField] = useState<'createdAt' | 'timestamp'>('createdAt');

  useEffect(() => {
    if (!auth) {
      setError('Firebase client is not configured.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setPosts([]);
        setError('Sign in again to load posts.');
        setLoading(false);
        return;
      }
      loadPosts({ search: searchTerm, forward: true, isFirstPage: true });
    });

    return unsubscribe;
  }, [searchTerm]);

  const loadPosts = async ({
    search = '',
    cursor = '',
    direction = 'next',
    forward = true,
    isFirstPage = false,
  }: {
    search?: string;
    cursor?: string;
    direction?: 'next' | 'prev';
    forward?: boolean;
    isFirstPage?: boolean;
  }) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ sort: activeSortField });
      if (search) params.set('search', search);
      if (cursor) {
        params.set('cursor', cursor);
        params.set('direction', direction);
      }
      const data = await adminFetch<{
        posts: never[];
        sortField?: 'createdAt' | 'timestamp';
        lastId?: string | null;
        firstId?: string | null;
        hasMore?: boolean;
      }>(`/api/posts/?${params}`);

      setPosts(data.posts || []);
      setSelected([]);
      setActiveSortField(data.sortField || 'createdAt');
      setLastId(data.lastId || null);
      setHasMore(Boolean(data.hasMore));

      if (forward) {
        if (isFirstPage) {
          setPageStarts(data.firstId ? [data.firstId] : []);
          setCurrentPageIndex(data.firstId ? 1 : 0);
        } else if (data.firstId) {
          setPageStarts((prev) => [...prev, data.firstId]);
          setCurrentPageIndex((prev) => prev + 1);
        }
      } else {
        setPageStarts((prev) => prev.slice(0, -1));
        setCurrentPageIndex((prev) => Math.max(prev - 1, 1));
        setHasMore(true);
      }
    } catch (fetchError) {
      console.error('Failed to fetch posts:', fetchError);
      setPosts([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setUpdatedTitle(post.title);
    setUpdatedContent(post.content);
  };

  const handleView = (id) => router.push(`/post-detail/${id}`);

  const getPostDate = (post) => {
    const value = post.createdAt ?? post.timestamp;
    if (!value) return '-';
    if (typeof value === 'number') return new Date(value).toLocaleString();
    if (typeof value?.toDate === 'function') return value.toDate().toLocaleString();
    return '-';
  };

  const getPostImages = (post) => {
    if (Array.isArray(post.imageUrls) && post.imageUrls.length > 0) return post.imageUrls;
    if (Array.isArray(post.imageList) && post.imageList.length > 0) return post.imageList;
    if (typeof post.imageUrl === 'string' && post.imageUrl.length > 0) return [post.imageUrl];
    return [];
  };

  const handleUpdate = async () => {
    if (!editingPost) return;
    try {
      await adminFetch('/api/posts/', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editingPost.id,
          title: updatedTitle,
          content: updatedContent,
        }),
      });
      setEditingPost(null);
      loadPosts({ search: searchTerm, forward: true, isFirstPage: true });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update post');
    }
  };

  const visibleIds = posts.map((post) => post.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const toggleAll = () => {
    setSelected(allSelected ? [] : visibleIds);
  };

  const toggleOne = (id) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
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
      loadPosts({ search: searchTerm, forward: true, isFirstPage: true });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete posts');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await adminFetch(`/api/posts/?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      loadPosts({ search: searchTerm, forward: true, isFirstPage: true });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete post');
    }
  };

  return (
      <main className="premium-shell relative overflow-auto">
        {loading ? (
            <div className="mt-40 flex flex-col items-center justify-center gap-4">
              <svg className="h-10 w-10 animate-spin text-accent" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-lg font-semibold">Loading posts...</p>
            </div>
        ) : (
            <div className="premium-card mx-auto max-w-7xl w-full p-6">
              <div className="page-toolbar">
                <Link href="/dashboard" className="premium-button-secondary">
                  ← Dashboard
                </Link>
                <ThemeToggle />
              </div>
              <div className="page-toolbar">
                <div>
                  <h1 className="premium-title">Rockzy Posts</h1>
                  <p className="premium-subtitle">Review, edit, and remove published posts.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                      type="text"
                      placeholder="Search by title"
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        if (e.target.value.trim() === '') {
                          setSearchTerm('');
                        }
                      }}
                      className="premium-input py-2"
                  />
                  <button
                      onClick={() => setSearchTerm(searchInput.trim())}
                      className="premium-button"
                  >
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

              <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                <tr>
                  <th>
                    <input className="check" type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all posts" />
                  </th>
                  <th>Title</th>
                  <th>Content</th>
                  <th>Images</th>
                  <th>Date</th>
                  <th>Reports</th>
                  <th>Likes</th>
                  <th>Comments</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {posts.map(post => (
                    <tr key={post.id} className={selected.includes(post.id) ? 'selected' : undefined}>
                      <td>
                        <input
                          className="check"
                          type="checkbox"
                          checked={selected.includes(post.id)}
                          onChange={() => toggleOne(post.id)}
                          aria-label={`Select ${post.title || 'post'}`}
                        />
                      </td>
                      <td className="font-medium">{post.title}</td>
                      <td className="clamp-3 max-w-xs">{post.content}</td>
                      <td>
                        {getPostImages(post).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {getPostImages(post).map((url, index) => (
                                  <img key={index} src={url} alt={`img-${index}`} className="h-16 w-16 rounded-lg object-cover" />
                              ))}
                            </div>
                        ) : (
                            <span className="text-faint">No images</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-muted">{getPostDate(post)}</td>
                      <td>{post.reportCount}</td>
                      <td>{post.likeCount}</td>
                      <td>{post.commentCount}</td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => handleView(post.id)} className="premium-button-secondary">View</button>
                          <button onClick={() => handleEdit(post)} className="premium-button">Edit</button>
                          <button onClick={() => handleDelete(post.id)} className="danger-button">Delete</button>
                        </div>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                    onClick={() => {
                      const prevCursor = pageStarts[currentPageIndex - 2];
                      if (prevCursor) {
                        loadPosts({ search: searchTerm, cursor: prevCursor, direction: 'prev', forward: false });
                      }
                    }}
                    disabled={currentPageIndex <= 1 || loading}
                    className="premium-button"
                >
                  Previous
                </button>
                <button
                    onClick={() => {
                      if (lastId) {
                        loadPosts({ search: searchTerm, cursor: lastId, direction: 'next', forward: true });
                      }
                    }}
                    disabled={!hasMore || loading}
                    className="premium-button"
                >
                  Next
                </button>
              </div>

              {editingPost && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="premium-card w-full max-w-md space-y-4 p-6">
                      <h2 className="text-lg font-bold">Edit Post</h2>
                      <input
                          value={updatedTitle}
                          onChange={(e) => setUpdatedTitle(e.target.value)}
                          className="premium-input"
                          placeholder="Title"
                      />
                      <textarea
                          value={updatedContent}
                          onChange={(e) => setUpdatedContent(e.target.value)}
                          className="premium-input min-h-32"
                          placeholder="Content"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingPost(null)} className="premium-button-secondary">Cancel</button>
                        <button onClick={handleUpdate} className="premium-button">Save</button>
                      </div>
                    </div>
                  </div>
              )}
            </div>
        )}
      </main>
  );
}
