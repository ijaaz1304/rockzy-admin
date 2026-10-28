import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { adminFetch } from '../lib/adminFetch';
import { auth } from '../lib/firebase';
import ThemeToggle from '../components/ThemeToggle';

export default function Comments() {
    const [comments, setComments] = useState([]);
    const [pageStarts, setPageStarts] = useState<string[]>([]);
    const [lastId, setLastId] = useState<string | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [reportedOnly, setReportedOnly] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');

    useEffect(() => {
        if (searchInput === '') {
            setSearchTerm('');
        }
    }, [searchInput]);

    useEffect(() => {
        if (!auth) {
            setError('Firebase client is not configured.');
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setComments([]);
                setError('Sign in again to load comments.');
                setLoading(false);
                return;
            }
            loadComments({ search: searchTerm, reportedOnly, forward: true, isFirstPage: true });
        });

        return unsubscribe;
    }, [reportedOnly, searchTerm]);

    const loadComments = async ({
        search = '',
        reportedOnly: onlyReported = false,
        cursor = '',
        direction = 'next',
        forward = true,
        isFirstPage = false,
    }: {
        search?: string;
        reportedOnly?: boolean;
        cursor?: string;
        direction?: 'next' | 'prev';
        forward?: boolean;
        isFirstPage?: boolean;
    }) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (onlyReported) params.set('reportedOnly', '1');
            if (cursor) {
                params.set('cursor', cursor);
                params.set('direction', direction);
            }
            const data = await adminFetch<{
                comments: never[];
                totalCount?: number;
                lastId?: string | null;
                firstId?: string | null;
                hasMore?: boolean;
            }>(`/api/comments/?${params}`);

            setComments(data.comments || []);
            setSelected([]);
            setTotalCount(data.totalCount || 0);
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
            console.error('Failed to fetch comments:', fetchError);
            setComments([]);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load comments');
        } finally {
            setLoading(false);
        }
    };

    const refresh = () => loadComments({ search: searchTerm, reportedOnly, forward: true, isFirstPage: true });

    const handleDeleteComment = async (id) => {
        if (!confirm('Delete this comment?')) return;
        try {
            await adminFetch(`/api/comments/?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            refresh();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete comment');
        }
    };

    const handleDeleteReply = async (commentId, replyId) => {
        if (!confirm('Delete this reply?')) return;
        try {
            const params = new URLSearchParams({ id: commentId, replyId });
            await adminFetch(`/api/comments/?${params}`, { method: 'DELETE' });
            refresh();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete reply');
        }
    };

    const visibleIds = comments.map((comment) => comment.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

    const toggleAll = () => {
        setSelected(allSelected ? [] : visibleIds);
    };

    const toggleOne = (id) => {
        setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    };

    const handleBulkDelete = async () => {
        if (selected.length === 0) return;
        if (!confirm(`Delete ${selected.length} selected comment${selected.length === 1 ? '' : 's'}?`)) return;
        try {
            await adminFetch('/api/comments/', {
                method: 'DELETE',
                body: JSON.stringify({ ids: selected }),
            });
            setSelected([]);
            refresh();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete comments');
        }
    };

    const handleSearch = () => {
        setSearchTerm(searchInput.trim());
    };

    return (
        <main className="premium-shell overflow-auto">
            {loading ? (
                <div className="mt-40 flex flex-col items-center justify-center gap-4">
                    <svg className="h-10 w-10 animate-spin text-accent" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-lg font-semibold">Loading comments...</p>
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
                            <h1 className="premium-title">Rockzy Comments & Replies</h1>
                            <p className="premium-subtitle">Total comments: {totalCount}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input className="check" type="checkbox" checked={allSelected} onChange={toggleAll} />
                                Select page
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    className="check"
                                    type="checkbox"
                                    checked={reportedOnly}
                                    onChange={() => setReportedOnly(prev => !prev)}
                                />
                                Reported Only
                            </label>
                            <input
                                type="text"
                                placeholder="Search by content"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="premium-input"
                            />
                            <button
                                onClick={handleSearch}
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

                    {comments.map(comment => (
                        <div key={comment.id} className={`panel mb-4 p-4 ${selected.includes(comment.id) ? 'ring-2 ring-indigo-400/40' : ''}`}>
                            <div className="mb-2">
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                                    <input
                                        className="check"
                                        type="checkbox"
                                        checked={selected.includes(comment.id)}
                                        onChange={() => toggleOne(comment.id)}
                                    />
                                    Post ID: {comment.postId}
                                </label>
                                <p>{comment.content}</p>
                                <p className="text-sm text-muted">
                                    User: {comment.user?.name || 'Anonymous'} | {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : '-'}
                                </p>
                                <p className="text-xs text-faint">Reports: {comment.reportCount}</p>
                                <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="danger-button mt-2"
                                >
                                    Delete Comment
                                </button>
                            </div>

                            {comment.replies.length > 0 && (
                                <div className="ml-6 mt-4 border-l-2 pl-4" style={{ borderColor: 'var(--accent)' }}>
                                    <p className="mb-2 font-medium">Replies (sorted by reports):</p>
                                    {comment.replies.map((reply) => (
                                        <div key={reply.id} className="panel-2 mb-3 p-3">
                                            <p className="text-sm">{reply.content}</p>
                                            <p className="text-xs text-muted">
                                                {reply.user?.name || 'Anonymous'} | {reply.timestamp ? new Date(reply.timestamp).toLocaleString() : '-'}
                                            </p>
                                            <p className="text-xs text-faint">Reports: {reply.reportCount}</p>
                                            <button
                                                onClick={() => handleDeleteReply(comment.id, reply.id)}
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

                    <div className="mt-6 flex items-center justify-between">
                        <button
                            onClick={() => {
                                const prevCursor = pageStarts[currentPageIndex - 2];
                                if (prevCursor) {
                                    loadComments({
                                        search: searchTerm,
                                        reportedOnly,
                                        cursor: prevCursor,
                                        direction: 'prev',
                                        forward: false,
                                    });
                                }
                            }}
                            disabled={currentPageIndex <= 1 || loading}
                            className="premium-button"
                        >
                            Previous
                        </button>

                        <span className="text-sm text-muted">Page {currentPageIndex}</span>

                        <button
                            onClick={() => {
                                if (lastId) {
                                    loadComments({
                                        search: searchTerm,
                                        reportedOnly,
                                        cursor: lastId,
                                        direction: 'next',
                                        forward: true,
                                    });
                                }
                            }}
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
