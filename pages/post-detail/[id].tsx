// pages/post-detail/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function PostDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchPostDetail(id as string);
  }, [id]);

  const fetchPostDetail = async (postId: string) => {
    setLoading(true);

    // Get reports
    const reportSnap = await getDocs(collection(db, 'report'));
    const reportData: Record<string, number> = {};
    reportSnap.docs.forEach(doc => {
      const r = doc.data();
      if (r.targetId) {
        reportData[r.targetId] = (reportData[r.targetId] || 0) + 1;
      }
    });
    setReportCounts(reportData);

    // Get post
    const postDoc = await getDoc(doc(db, 'all-posts', postId));
    if (!postDoc.exists()) return;
    setPost({ id: postDoc.id, ...postDoc.data() });

    // Get comments
    const commentQ = query(collection(db, 'comments'), where('postId', '==', postId));
    const commentSnap = await getDocs(commentQ);
    const commentData = [];
    for (const c of commentSnap.docs) {
      const comment = { id: c.id, ...c.data() };

      const replySnap = await getDocs(collection(db, 'comments', c.id, 'replies'));
      const replies = replySnap.docs.map(r => ({
        id: r.id,
        ...r.data(),
        reportCount: reportData[r.id] || 0
      })).sort((a, b) => b.reportCount - a.reportCount);

      commentData.push({
        ...comment,
        reportCount: reportData[comment.id] || 0,
        replies
      });
    }
    commentData.sort((a, b) => b.reportCount - a.reportCount);
    setComments(commentData);
    setLoading(false);
  };

  const handleDelete = async (target: 'post' | 'comment' | 'reply', ids: string[]) => {
    if (!confirm(`Delete this ${target}?`)) return;
    if (target === 'post') {
      await deleteDoc(doc(db, 'all-posts', ids[0]));
      router.push('/posts');
    } else if (target === 'comment') {
      await deleteDoc(doc(db, 'comments', ids[0]));
      fetchPostDetail(id as string);
    } else if (target === 'reply') {
      await deleteDoc(doc(db, 'comments', ids[0], 'replies', ids[1]));
      fetchPostDetail(id as string);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-blue-600">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p>Loading post details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md">
        <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
        <p className="text-sm text-gray-500">Post ID: {post.id}</p>
        <p className="text-gray-700 my-2">{post.content}</p>


        {Array.isArray(post.imageList) && post.imageList.length > 0 && (
            <div className="mt-5 flex gap-4 flex-wrap">
              {post.imageList.map((img: string, i: number) => (
                  <img
                      key={i}
                      src={img}
                      alt={`Post Image ${i + 1}`}
                      onError={(e) => (e.currentTarget.src = '/placeholder.png')}
                      className="w-40 h-40 object-cover rounded border"
                  />
              ))}
            </div>
        )}



        <p>👍 Likes: {post.likeCount || 0}</p>
        <p>🚩 Reports: {reportCounts[post.id] || 0}</p>


        <button
          onClick={() => handleDelete('post', [post.id])}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Delete Post
        </button>
      </div>

      <div className="mt-8 space-y-6">
        <h2 className="text-2xl font-semibold">Comments</h2>
        {comments.map((comment: any) => (
          <div key={comment.id} className="bg-white p-4 rounded shadow">
            <p className="text-gray-800">💬 {comment.content}</p>
            <p className="text-sm text-gray-500">
              👍 {comment.likeCount || 0} | 🚩 {comment.reportCount}
            </p>
            <button
              onClick={() => handleDelete('comment', [comment.id])}
              className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Delete Comment
            </button>

            {/* Replies */}
            {comment.replies.length > 0 && (
              <div className="ml-4 mt-4 border-l-2 border-purple-300 pl-4">
                <p className="font-medium">Replies:</p>
                {comment.replies.map((reply: any) => (
                  <div key={reply.id} className="bg-gray-100 p-3 my-2 rounded">
                    <p>{reply.content}</p>
                    <p className="text-sm text-gray-600">
                      👍 {reply.likeCount || 0} | 🚩 {reply.reportCount}
                    </p>
                    <button
                      onClick={() => handleDelete('reply', [comment.id, reply.id])}
                      className="mt-1 bg-red-500 text-white px-2 py-1 text-sm rounded hover:bg-red-600"
                    >
                      Delete Reply
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
