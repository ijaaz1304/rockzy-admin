import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (searchTerm === '') {
      fetchFirstPage();
    } else {
      fetchSearchResults(searchTerm);
    }
  }, [searchTerm]);

  const fetchFirstPage = async () => {
    setLoading(true);
    const q = query(collection(db, 'all-posts'), orderBy('timestamp', 'desc'), limit(postsPerPage + 1));
    const snapshot = await getDocs(q);
    await processSnapshot(snapshot, true, true);
  };

  const fetchSearchResults = async (term) => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, 'all-posts'));
    const filteredDocs = snapshot.docs.filter(doc =>
        doc.data().title?.toLowerCase().includes(term.toLowerCase())
    );
    const fakeSnapshot = { docs: filteredDocs.slice(0, postsPerPage + 1) };
    await processSnapshot(fakeSnapshot, true, true);
  };

  const fetchPage = async (cursorDoc, direction = 'next') => {
    if (!cursorDoc) return;
    setLoading(true);

    const q = query(
        collection(db, 'all-posts'),
        orderBy('timestamp', 'desc'),
        direction === 'next' ? startAfter(cursorDoc) : endBefore(cursorDoc),
        limit(postsPerPage + 1)
    );

    const snapshot = await getDocs(q);
    await processSnapshot(snapshot, direction === 'next');
  };

  const processSnapshot = async (snapshot, forward = true, isFirstPage = false) => {
    const docs = snapshot.docs;
    const hasExtra = docs.length > postsPerPage;
    const slicedDocs = hasExtra ? docs.slice(0, postsPerPage) : docs;
    const newHasMore = hasExtra;

    const reportSnapshot = await getDocs(collection(db, 'report'));
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

  const handleUpdate = async () => {
    if (!editingPost) return;
    await updateDoc(doc(db, 'all-posts', editingPost.id), {
      title: updatedTitle,
      content: updatedContent,
    });
    setEditingPost(null);
    fetchFirstPage();
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    await deleteDoc(doc(db, 'all-posts', id));
    fetchFirstPage();
  };

  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-700 to-orange-400 relative overflow-auto">
        {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 text-white mt-40">
              <svg className="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-lg font-semibold">Loading posts...</p>
            </div>
        ) : (
            <div className="max-w-7xl w-full bg-white rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">📄 All Posts</h1>
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
                      className="border px-2 py-1 rounded text-sm"
                  />
                  <button
                      onClick={() => setSearchTerm(searchInput.trim())}
                      className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>
              </div>

              <table className="w-full border-collapse border">
                <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">Title</th>
                  <th className="p-2 border">Content</th>
                  <th className="p-2 border">Images</th>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Reports</th>
                  <th className="p-2 border">Likes</th>
                  <th className="p-2 border">Comments</th>
                  <th className="p-2 border">Actions</th>
                </tr>
                </thead>
                <tbody>
                {posts.map(post => (
                    <tr key={post.id} className="hover:bg-gray-50 align-top">
                      <td className="p-2 border">{post.title}</td>
                      <td className="p-2 border">{post.content}</td>
                      <td className="p-2 border">
                        {post.imageList?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {post.imageList.map((url, index) => (
                                  <img key={index} src={url} alt={`img-${index}`} className="w-16 h-16 object-cover rounded border" />
                              ))}
                            </div>
                        ) : (
                            <span className="text-gray-400">No Images</span>
                        )}
                      </td>
                      <td className="p-2 border">{post.timestamp ? new Date(post.timestamp).toLocaleString() : '-'}</td>
                      <td className="p-2 border">{post.reportCount}</td>
                      <td className="p-2 border">{post.likeCount}</td>
                      <td className="p-2 border">{post.commentCount}</td>
                      <td className="p-2 border">
                        <div className="flex gap-2">
                          <button onClick={() => handleView(post.id)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">View</button>
                          <button onClick={() => handleEdit(post)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">Edit</button>
                          <button onClick={() => handleDelete(post.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Delete</button>
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
                    className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                    onClick={() => {
                      const lastVisible = pageSnapshots[pageSnapshots.length - 1];
                      if (lastVisible) fetchPage(lastVisible, 'next');
                    }}
                    disabled={!hasMore || loading}
                    className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              {editingPost && (
                  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl space-y-4">
                      <h2 className="text-lg font-bold mb-2">Edit Post</h2>
                      <input
                          value={updatedTitle}
                          onChange={(e) => setUpdatedTitle(e.target.value)}
                          className="w-full border p-2 rounded"
                          placeholder="Title"
                      />
                      <textarea
                          value={updatedContent}
                          onChange={(e) => setUpdatedContent(e.target.value)}
                          className="w-full border p-2 rounded"
                          placeholder="Content"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingPost(null)} className="px-4 py-1 rounded bg-gray-300 hover:bg-gray-400">Cancel</button>
                        <button onClick={handleUpdate} className="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
                      </div>
                    </div>
                  </div>
              )}
            </div>
        )}
      </div>
  );
}
