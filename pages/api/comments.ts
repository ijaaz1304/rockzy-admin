import type { NextApiRequest, NextApiResponse } from 'next';
import type { Firestore, Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { isAdminFailure, requireAdmin } from '../../lib/requireAdmin';
import { serializeFirestore } from '../../lib/serializeFirestore';

const PAGE_SIZE = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const admin = await requireAdmin(req);
    if (isAdminFailure(admin)) {
      return res.status(admin.status).json({ error: admin.error });
    }

    if (req.method === 'GET') {
      return await listComments(admin.db, req, res);
    }
    if (req.method === 'DELETE') {
      return await deleteCommentOrReply(admin.db, req, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Comments API failed.', error);
    return res.status(500).json({ error: 'Failed to load comments' });
  }
}

async function listComments(db: Firestore, req: NextApiRequest, res: NextApiResponse) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
  const direction = req.query.direction === 'prev' ? 'prev' : 'next';
  const reportedOnly = req.query.reportedOnly === '1';

  const [totalSnap, reportSnap] = await Promise.all([
    db.collection('comments').get(),
    db.collection('reports').get(),
  ]);

  const replyReportCounts: Record<string, number> = {};
  const commentReportCounts: Record<string, number> = {};
  reportSnap.docs.forEach((report) => {
    const data = report.data();
    if (typeof data.targetId !== 'string') return;
    if (data.type === 'reply') {
      replyReportCounts[data.targetId] = (replyReportCounts[data.targetId] || 0) + 1;
    } else if (data.type === 'comment') {
      commentReportCounts[data.targetId] = (commentReportCounts[data.targetId] || 0) + 1;
    }
  });

  let pageDocs: QueryDocumentSnapshot[] = [];
  let hasMore = false;

  if (search) {
    const matches = totalSnap.docs.filter((comment) =>
      String(comment.data().content || '').toLowerCase().includes(search)
    );
    pageDocs = matches.slice(0, PAGE_SIZE);
    hasMore = matches.length > PAGE_SIZE;
  } else {
    let query: Query = db.collection('comments').orderBy('timestamp', 'desc');
    if (cursor) {
      const cursorDoc = await db.collection('comments').doc(cursor).get();
      if (cursorDoc.exists) {
        query = direction === 'prev' ? query.startAt(cursorDoc) : query.startAfter(cursorDoc);
      }
    }
    const snapshot = await query.limit(PAGE_SIZE + 1).get();
    hasMore = snapshot.docs.length > PAGE_SIZE;
    pageDocs = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;
  }

  const comments = [];
  for (const commentDoc of pageDocs) {
    const data = serializeFirestore(commentDoc.data()) as Record<string, unknown>;
    const reportCount = commentReportCounts[commentDoc.id] || 0;
    if (reportedOnly && reportCount === 0) continue;

    const repliesSnap = await db.collection('comments').doc(commentDoc.id).collection('replies').get();
    const replies = repliesSnap.docs
      .map((reply) => {
        const replyData = serializeFirestore(reply.data()) as Record<string, unknown>;
        return {
          id: reply.id,
          ...replyData,
          reportCount: replyReportCounts[reply.id] || 0,
        };
      })
      .sort((a, b) => b.reportCount - a.reportCount);

    comments.push({
      id: commentDoc.id,
      ...data,
      replies,
      reportCount,
    });
  }

  comments.sort((a, b) => b.reportCount - a.reportCount);

  return res.status(200).json({
    comments,
    totalCount: totalSnap.size,
    hasMore,
    firstId: pageDocs[0]?.id ?? null,
    lastId: pageDocs[pageDocs.length - 1]?.id ?? null,
  });
}

async function deleteCommentOrReply(db: Firestore, req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  const replyId = typeof req.query.replyId === 'string' ? req.query.replyId : '';
  const bulk = Array.isArray(req.body?.ids) ? req.body.ids.filter((item) => typeof item === 'string') : [];
  const ids = bulk.length > 0 ? bulk : id ? [id] : [];
  if (ids.length === 0) {
    return res.status(400).json({ error: 'Missing comment id' });
  }

  await Promise.all(ids.map(async (commentId) => {
    if (ids.length === 1 && replyId) {
      await db.collection('comments').doc(commentId).collection('replies').doc(replyId).delete();
      return;
    }
    await db.collection('comments').doc(commentId).delete();
  }));
  return res.status(200).json({ ok: true, deleted: ids.length });
}
