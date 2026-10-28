import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { adminFetch } from '../../lib/adminFetch';
import { auth } from '../../lib/firebase';
import ThemeToggle from '../../components/ThemeToggle';
import Link from 'next/link';

export default function PostDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setError('Sign in again to load this post.');
        setLoading(false);
        return;
      }
      fetchPostDetail(id as string);
    });

    return unsubscribe;
  }, [id]);

  const fetchPostDetail = async (postId: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch<{ post: any; comments: any[]; reportCounts: Record<string, number> }>(
        `/api/posts/${postId}/`
      );
      setPost(data.post);
      setComments(data.comments || []);
      setReportCounts(data.reportCounts || {});
    } catch (fetchError) {
      console.error('Failed to fetch post detail:', fetchError);
      setPost(null);
      setComments([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (target: 'post' | 'comment' | 'reply', ids: string[]) => {
    if (!confirm(`Delete this ${target}?`)) return;
    try {
      if (target === 'post') {
        await adminFetch(`/api/posts/?id=${encodeURIComponent(ids[0])}`, { method: 'DELETE' });
        await router.push('/posts');
        return;
      }
      if (target === 'comment') {
        await adminFetch(`/api/comments/?id=${encodeURIComponent(ids[0])}`, { method: 'DELETE' });
      } else {
        const params = new URLSearchParams({ id: ids[0], replyId: ids[1] });
        await adminFetch(`/api/comments/?${params}`, { method: 'DELETE' });
      }
      fetchPostDetail(id as string);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Failed to delete ${target}`);
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
      <div className="premium-shell flex items-center justify-center text-accent">
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

  if (!post) {
    return (
      <main className="premium-shell">
        <div className="premium-card p-6">
          <div className="page-toolbar">
            <Link href="/posts" className="premium-button-secondary">← Posts</Link>
            <ThemeToggle />
          </div>
          <div className="notice">{error || 'Post not found'}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="premium-shell">
      <div className="mx-auto max-w-5xl">
      <div className="page-toolbar">
        <Link href="/posts" className="premium-button-secondary">← Posts</Link>
        <ThemeToggle />
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="premium-card p-6">
        <h1 className="premium-title mb-2">{post.title}</h1>
        <p className="text-sm text-faint">Post ID: {post.id}</p>
        <p className="my-2">{post.content}</p>

        {getPostImages(post).length > 0 && (
            <div className="mt-5 flex gap-4 flex-wrap">
              {getPostImages(post).map((img: string, i: number) => (
                  <img
                      key={i}
                      src={img}
                      alt={`Post Image ${i + 1}`}
                      onError={(e) => (e.currentTarget.src = '/placeholder.png')}
                      className="h-40 w-40 rounded-xl object-cover"
                  />
              ))}
            </div>
        )}

        <p>Likes: {post.likeCount || 0}</p>
        <p className="text-muted">Reports: {reportCounts[post.id] || 0}</p>

        <button
          onClick={() => handleDelete('post', [post.id])}
          className="danger-button mt-4"
        >
          Delete Post
        </button>
      </div>

      <div className="mt-8 space-y-6">
        <h2 className="text-2xl font-semibold">Comments</h2>
        {comments.map((comment: any) => (
          <div key={comment.id} className="premium-card p-4">
            <p>{comment.content}</p>
            <p className="text-sm text-muted">
              {comment.likeCount || 0} likes | {comment.reportCount} reports
            </p>
            <button
              onClick={() => handleDelete('comment', [comment.id])}
              className="danger-button mt-2 px-3 py-1.5"
            >
              Delete Comment
            </button>

            {comment.replies.length > 0 && (
              <div className="ml-4 mt-4 border-l-2 pl-4" style={{ borderColor: 'var(--accent)' }}>
                <p className="font-medium">Replies:</p>
                {comment.replies.map((reply: any) => (
                  <div key={reply.id} className="panel-2 my-2 p-3">
                    <p>{reply.content}</p>
                    <p className="text-sm text-muted">
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
      </div>
    </main>
  );
}
