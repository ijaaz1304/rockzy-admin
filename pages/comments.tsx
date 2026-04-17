import { useEffect, useState } from 'react';
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    limit,
    startAfter,
    endBefore,
} from 'firebase/firestore';

export default function Comments() {
    const commentsPerPage = 10;
    const [db, setDb] = useState(null);
    const [comments, setComments] = useState([]);
    const [pageSnapshots, setPageSnapshots] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [reportedOnly, setReportedOnly] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Dynamically import firebase only in browser
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('../lib/firebase').then(({ db }) => {
                setDb(db);
            });
        }
    }, []);

    useEffect(() => {
        if (!db) return;
        if (searchTerm === '') {
            fetchFirstPage();
        } else {
            fetchSearchResults(searchTerm);
        }
        fetchTotalCount();
    }, [db, reportedOnly, searchTerm]);

    useEffect(() => {
        if (searchInput === '') {
            setSearchTerm('');
        }
    }, [searchInput]);

    const fetchTotalCount = async () => {
        const snapshot = await getDocs(collection(db, 'comments'));
        setTotalCount(snapshot.size);
    };

    const fetchFirstPage = async () => {
        setLoading(true);
        const q = query(
            collection(db, 'comments'),
            orderBy('timestamp', 'desc'),
            limit(commentsPerPage + 1)
        );
        const snapshot = await getDocs(q);
        await processSnapshot(snapshot, true, true);
    };

    const fetchSearchResults = async (term) => {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'comments'));
        const filteredDocs = snapshot.docs.filter(doc =>
            doc.data().content?.toLowerCase().includes(term.toLowerCase())
        );
        const fakeSnapshot = { docs: filteredDocs.slice(0, commentsPerPage + 1) };
        await processSnapshot(fakeSnapshot, true, true);
    };

    const fetchPage = async (cursorDoc, direction = 'next') => {
        if (!cursorDoc || !db) return;
        setLoading(true);

        const q = query(
            collection(db, 'comments'),
            orderBy('timestamp', 'desc'),
            direction === 'next' ? startAfter(cursorDoc) : endBefore(cursorDoc),
            limit(commentsPerPage + 1)
        );

        const snapshot = await getDocs(q);
        await processSnapshot(snapshot, direction === 'next');
    };

    const processSnapshot = async (snapshot, forward = true, isFirstPage = false) => {
        const docs = snapshot.docs;
        const hasExtra = docs.length > commentsPerPage;
        const slicedDocs = hasExtra ? docs.slice(0, commentsPerPage) : docs;
        const newHasMore = hasExtra;

        const reportSnapshot = await getDocs(collection(db, 'report'));
        const replyReportCounts = {};
        const commentReportCounts = {};

        reportSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.type === 'reply' && data.targetId) {
                replyReportCounts[data.targetId] = (replyReportCounts[data.targetId] || 0) + 1;
            } else if (data.type === 'comment' && data.targetId) {
                commentReportCounts[data.targetId] = (commentReportCounts[data.targetId] || 0) + 1;
            }
        });

        const commentsData = [];

        for (const docSnap of slicedDocs) {
            const commentData = { id: docSnap.id, ...docSnap.data() };

            const repliesSnapshot = await getDocs(collection(db, 'comments', docSnap.id, 'replies'));
            const replies = repliesSnapshot.docs.map(replyDoc => ({
                id: replyDoc.id,
                ...replyDoc.data(),
                reportCount: replyReportCounts[replyDoc.id] || 0,
            })).sort((a, b) => b.reportCount - a.reportCount);

            const reportCount = commentReportCounts[commentData.id] || 0;

            if (!reportedOnly || reportCount > 0) {
                commentsData.push({
                    ...commentData,
                    replies,
                    reportCount,
                });
            }
        }

        commentsData.sort((a, b) => b.reportCount - a.reportCount);
        setComments(commentsData);

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
            setPageSnapshots(prev => prev.slice(0, prev.length - 1));
            setHasMore(true);
        }

        setLoading(false);
    };

    const handleDeleteComment = async (id) => {
        if (!confirm('Delete this comment?')) return;
        await deleteDoc(doc(db, 'comments', id));
        fetchFirstPage();
    };

    const handleDeleteReply = async (commentId, replyId) => {
        if (!confirm('Delete this reply?')) return;
        await deleteDoc(doc(db, 'comments', commentId, 'replies', replyId));
        fetchFirstPage();
    };

    const handleSearch = () => {
        setSearchTerm(searchInput.trim());
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-700 to-orange-400 overflow-auto">
            {loading ? (
                <div className="flex flex-col items-center justify-center gap-4 text-white mt-40">
                    <svg className="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-lg font-semibold">Loading comments...</p>
                </div>
            ) : (
                <div className="max-w-7xl w-full bg-white rounded-xl p-6 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">💬 All Comments & Replies</h1>
                        <div className="flex gap-4 items-center">
                            <span className="text-sm text-gray-600">Total Comments: {totalCount}</span>
                            <label className="flex items-center gap-1 text-sm">
                                <input
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
                                className="border px-2 py-1 rounded text-sm"
                            />
                            <button
                                onClick={handleSearch}
                                className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {comments.map(comment => (
                        <div key={comment.id} className="mb-10 border rounded p-4 shadow">
                            <div className="mb-2">
                                <p className="font-semibold">Post ID: {comment.postId}</p>
                                <p className="text-gray-700">Comment: {comment.content}</p>
                                <p className="text-sm text-gray-500">
                                    User: {comment.user?.name || 'Anonymous'} | {new Date(comment.timestamp).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">🚩 Reports: {comment.reportCount}</p>
                                <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="mt-2 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                >
                                    Delete Comment
                                </button>
                            </div>

                            {comment.replies.length > 0 && (
                                <div className="ml-6 mt-4 border-l-4 border-purple-300 pl-4">
                                    <p className="font-medium mb-2">Replies (sorted by reports):</p>
                                    {comment.replies.map(reply => (
                                        <div key={reply.id} className="mb-3 border p-3 rounded shadow-sm bg-gray-50">
                                            <p className="text-sm">💬 {reply.content}</p>
                                            <p className="text-xs text-gray-500">
                                                👤 {reply.user?.name || 'Anonymous'} | 🕒 {new Date(reply.timestamp).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-gray-500">🚩 Reports: {reply.reportCount}</p>
                                            <button
                                                onClick={() => handleDeleteReply(comment.id, reply.id)}
                                                className="mt-1 bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600"
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
                                const prevCursor = pageSnapshots[currentPageIndex - 2];
                                if (prevCursor) fetchPage(prevCursor, 'prev');
                            }}
                            disabled={currentPageIndex <= 1 || loading}
                            className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
                        >
                            Previous
                        </button>

                        <span className="text-sm text-gray-700">Page {currentPageIndex}</span>

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
                </div>
            )}
        </div>
    );
}
