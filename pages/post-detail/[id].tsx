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
    const reportSnap = await getDocs(collection(db, 'reports'));
    const reportData: Record<string, number> = {};
    reportSnap.docs.forEach(doc => {
      const r = doc.data();
      if (r.targetId) {
        reportData[r.targetId] = (reportData[r.targetId] || 0) + 1;
      }
    });
    setReportCounts(reportData);

    // Get post
    const postDoc = await getDoc(doc(db, 'posts', postId));
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
      await deleteDoc(doc(db, 'posts', ids[0]));
      router.push('/posts');
    } else if (target === 'comment') {
      await deleteDoc(doc(db, 'comments', ids[0]));
      fetchPostDetail(id as string);
    } else if (target === 'reply') {
      await deleteDoc(doc(db, 'comments', ids[0], 'replies', ids[1]));
      fetchPostDetail(id as string);
    }
  };

  const getPostImages = (postData: any) => {
    if (!postData) return [];
    if (Array.isArray(postData.imageUrls) && postData.imageUrls.length > 0) return postData.imageUrls;
    if (Array.isArray(postData.imageList) && postData.imageList.length > 0) return postData.imageList;
    if (typeof postData.imageUrl === 'string' && postData.imageUrl.length > 0) return [postData.imageUrl];
    return [];
  };

  if (loading) {
    return (
      <div className="premium-shell flex items-center justify-center text-indigo-200">
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
    <main className="premium-shell">
      <div className="premium-card p-6">
        <h1 className="premium-title mb-2">{post.title}</h1>
        <p className="text-sm text-slate-400">Post ID: {post.id}</p>
        <p className="my-2 text-slate-200">{post.content}</p>


        {getPostImages(post).length > 0 && (
            <div className="mt-5 flex gap-4 flex-wrap">
              {getPostImages(post).map((img: string, i: number) => (
                  <img
                      key={i}
                      src={img}
                      alt={`Post Image ${i + 1}`}
                      onError={(e) => (e.currentTarget.src = '/placeholder.png')}
                      className="h-40 w-40 rounded-xl border border-white/10 object-cover"
                  />
              ))}
            </div>
        )}



        <p className="text-slate-200">Likes: {post.likeCount || 0}</p>
        <p className="text-slate-300">Reports: {reportCounts[post.id] || 0}</p>


        <button
          onClick={() => handleDelete('post', [post.id])}
          className="danger-button mt-4"
        >
          Delete Post
        </button>
      </div>

      <div className="mt-8 space-y-6">
        <h2 className="text-2xl font-semibold text-white">Comments</h2>
        {comments.map((comment: any) => (
          <div key={comment.id} className="premium-card p-4">
            <p className="text-slate-100">{comment.content}</p>
            <p className="text-sm text-slate-400">
              {comment.likeCount || 0} likes | {comment.reportCount} reports
            </p>
            <button
              onClick={() => handleDelete('comment', [comment.id])}
              className="danger-button mt-2 px-3 py-1.5"
            >
              Delete Comment
            </button>

            {/* Replies */}
            {comment.replies.length > 0 && (
              <div className="ml-4 mt-4 border-l-2 border-indigo-400/50 pl-4">
                <p className="font-medium text-slate-200">Replies:</p>
                {comment.replies.map((reply: any) => (
                  <div key={reply.id} className="my-2 rounded-xl border border-white/10 bg-slate-900/80 p-3">
                    <p className="text-slate-100">{reply.content}</p>
                    <p className="text-sm text-slate-400">
                      {reply.likeCount || 0} likes | {reply.reportCount} reports
                    </p>
                    <button
                      onClick={() => handleDelete('reply', [comment.id, reply.id])}
                      className="danger-button mt-1 px-3 py-1.5 text-xs"
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
    </main>
  );
}
