import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function Posts() {
  const router = useRouter();
  const postsPerPage = 10;

  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [updatedContent, setUpdatedContent] = useState('');
  const [loading, setLoading] = useState(true);

  const [pageSnapshots, setPageSnapshots] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSortField, setActiveSortField] = useState<'createdAt' | 'timestamp'>('createdAt');

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    if (searchTerm === '') {
      fetchFirstPage();
    } else {
      fetchSearchResults(searchTerm);
    }
  }, [searchTerm]);

  const fetchFirstPage = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const primaryQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(postsPerPage + 1)
      );
      const primarySnapshot = await getDocs(primaryQuery);

      if (primarySnapshot.empty) {
        const fallbackQuery = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          limit(postsPerPage + 1)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        setActiveSortField('timestamp');
        await processSnapshot(fallbackSnapshot, true, true);
      } else {
        setActiveSortField('createdAt');
        await processSnapshot(primarySnapshot, true, true);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setPosts([]);
      setLoading(false);
    }
  };

  const fetchSearchResults = async (term) => {
    if (!db) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'posts'));
      const filteredDocs = snapshot.docs.filter(doc =>
          doc.data().title?.toLowerCase().includes(term.toLowerCase())
      );
      const fakeSnapshot = { docs: filteredDocs.slice(0, postsPerPage + 1) };
      await processSnapshot(fakeSnapshot, true, true);
    } catch (error) {
      console.error('Failed to search posts:', error);
      setPosts([]);
      setLoading(false);
    }
  };

  const fetchPage = async (cursorDoc, direction = 'next') => {
    if (!cursorDoc || !db) return;
    setLoading(true);

    const q = query(
        collection(db, 'posts'),
        orderBy(activeSortField, 'desc'),
        direction === 'next' ? startAfter(cursorDoc) : endBefore(cursorDoc),
        limit(postsPerPage + 1)
    );

    try {
      const snapshot = await getDocs(q);
      await processSnapshot(snapshot, direction === 'next');
    } catch (error) {
      console.error('Failed to fetch paginated posts:', error);
      setLoading(false);
    }
  };

  const processSnapshot = async (snapshot, forward = true, isFirstPage = false) => {
    if (!db) return;
    const docs = snapshot.docs;
    const hasExtra = docs.length > postsPerPage;
    const slicedDocs = hasExtra ? docs.slice(0, postsPerPage) : docs;
    const newHasMore = hasExtra;

    const reportSnapshot = await getDocs(collection(db, 'reports'));
    const commentSnapshot = await getDocs(collection(db, 'comments'));

    const reportCounts = {};
    reportSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'post' && data.targetId) {
        reportCounts[data.targetId] = (reportCounts[data.targetId] || 0) + 1;
      }
    });

    const commentCounts = {};
    commentSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.postId) {
        commentCounts[data.postId] = (commentCounts[data.postId] || 0) + 1;
      }
    });

    const postsData = slicedDocs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      reportCount: reportCounts[doc.id] || 0,
      commentCount: commentCounts[doc.id] || 0,
      likeCount: doc.data().likeList?.length || 0
    }));

    postsData.sort((a, b) => b.reportCount - a.reportCount);
    setPosts(postsData);

    if (forward) {
      if (!isFirstPage) {
        setPageSnapshots(prev => [...prev, slicedDocs[slicedDocs.length - 1]]);
        setCurrentPageIndex(prev => prev + 1);
      } else {
        setPageSnapshots([slicedDocs[slicedDocs.length - 1]]);
        setCurrentPageIndex(1);
      }
      setHasMore(newHasMore);
    } else {
      setCurrentPageIndex(prev => Math.max(prev - 1, 1));
      setHasMore(true);
    }

    setLoading(false);
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
    if (!editingPost || !db) return;
    await updateDoc(doc(db, 'posts', editingPost.id), {
      title: updatedTitle,
      content: updatedContent,
    });
    setEditingPost(null);
    fetchFirstPage();
  };

  const handleDelete = async (id) => {
    if (!db) return;
    if (!confirm("Are you sure you want to delete this post?")) return;
    await deleteDoc(doc(db, 'posts', id));
    fetchFirstPage();
  };

  return (
      <main className="premium-shell relative overflow-auto">
        {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 text-white mt-40">
              <svg className="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-lg font-semibold">Loading posts...</p>
            </div>
        ) : (
            <div className="premium-card mx-auto max-w-7xl w-full p-6">
              <div className="mb-4 flex items-center justify-between">
                <Link href="/dashboard" className="premium-button-secondary">
                  ← Dashboard
                </Link>
              </div>
              <div className="flex justify-between items-center mb-4">
                <h1 className="premium-title">Rockzy Posts</h1>
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

              {!db && (
                <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Firebase client is not configured. Set `NEXT_PUBLIC_FIREBASE_*` environment variables.
                </div>
              )}

              <table className="w-full border-collapse overflow-hidden rounded-xl border border-white/10 text-sm">
                <thead>
                <tr className="bg-slate-800/70 text-left text-slate-200">
                  <th className="p-2 border border-white/10">Title</th>
                  <th className="p-2 border border-white/10">Content</th>
                  <th className="p-2 border border-white/10">Images</th>
                  <th className="p-2 border border-white/10">Date</th>
                  <th className="p-2 border border-white/10">Reports</th>
                  <th className="p-2 border border-white/10">Likes</th>
                  <th className="p-2 border border-white/10">Comments</th>
                  <th className="p-2 border border-white/10">Actions</th>
                </tr>
                </thead>
                <tbody>
                {posts.map(post => (
                    <tr key={post.id} className="align-top text-slate-200 hover:bg-slate-800/60">
                      <td className="p-2 border border-white/10">{post.title}</td>
                      <td className="p-2 border border-white/10">{post.content}</td>
                      <td className="p-2 border border-white/10">
                        {getPostImages(post).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {getPostImages(post).map((url, index) => (
                                  <img key={index} src={url} alt={`img-${index}`} className="h-16 w-16 rounded-lg border border-white/10 object-cover" />
                              ))}
                            </div>
                        ) : (
                            <span className="text-slate-500">No Images</span>
                        )}
                      </td>
                      <td className="p-2 border border-white/10">{getPostDate(post)}</td>
                      <td className="p-2 border border-white/10">{post.reportCount}</td>
                      <td className="p-2 border border-white/10">{post.likeCount}</td>
                      <td className="p-2 border border-white/10">{post.commentCount}</td>
                      <td className="p-2 border border-white/10">
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

              <div className="mt-6 flex items-center justify-between">
                <button
                    onClick={() => {
                      const prevCursor = pageSnapshots[currentPageIndex - 2];
                      if (prevCursor) fetchPage(prevCursor, 'prev');
                    }}
                    disabled={currentPageIndex <= 1 || loading}
                    className="premium-button"
                >
                  Previous
                </button>
                <button
                    onClick={() => {
                      const lastVisible = pageSnapshots[pageSnapshots.length - 1];
                      if (lastVisible) fetchPage(lastVisible, 'next');
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
                      <h2 className="text-lg font-bold text-white">Edit Post</h2>
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
