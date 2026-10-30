import type { NextApiRequest, NextApiResponse } from 'next';
import { postReportTargetId, summarizeReport } from '../../../lib/postReports';
import { isAdminFailure, requireAdmin } from '../../../lib/requireAdmin';
import { serializeFirestore } from '../../../lib/serializeFirestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const admin = await requireAdmin(req);
    if (isAdminFailure(admin)) {
      return res.status(admin.status).json({ error: admin.error });
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) {
      return res.status(400).json({ error: 'Missing post id' });
    }

    const db = admin.db;
    const postDoc = await db.collection('posts').doc(id).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const [reportSnap, commentSnap] = await Promise.all([
      db.collection('reports').get(),
      db.collection('comments').where('postId', '==', id).get(),
    ]);

    const reportCounts: Record<string, number> = {};
    const postReports = [];
    reportSnap.docs.forEach((report) => {
      const data = report.data();
      const postTarget = postReportTargetId(data);
      if (postTarget === id) postReports.push(summarizeReport(report));
      const targetId = typeof data.targetId === 'string' ? data.targetId : '';
      if (targetId) {
        reportCounts[targetId] = (reportCounts[targetId] || 0) + 1;
      }
      if (postTarget && postTarget !== targetId) {
        reportCounts[postTarget] = (reportCounts[postTarget] || 0) + 1;
      }
    });

    const comments = [];
    for (const commentDoc of commentSnap.docs) {
      const data = serializeFirestore(commentDoc.data()) as Record<string, unknown>;
      const repliesSnap = await db.collection('comments').doc(commentDoc.id).collection('replies').get();
      const replies = repliesSnap.docs
        .map((reply) => {
          const replyData = serializeFirestore(reply.data()) as Record<string, unknown>;
          const likeList = Array.isArray(replyData.likeList) ? replyData.likeList : [];
          return {
            id: reply.id,
            ...replyData,
            reportCount: reportCounts[reply.id] || 0,
            likeCount: likeList.length || Number(replyData.likeCount) || 0,
          };
        })
        .sort((a, b) => b.reportCount - a.reportCount);

      const likeList = Array.isArray(data.likeList) ? data.likeList : [];
      comments.push({
        id: commentDoc.id,
        ...data,
        replies,
        reportCount: reportCounts[commentDoc.id] || 0,
        likeCount: likeList.length || Number(data.likeCount) || 0,
      });
    }
    comments.sort((a, b) => b.reportCount - a.reportCount);

    const postData = serializeFirestore(postDoc.data()) as Record<string, unknown>;
    const postLikes = Array.isArray(postData.likeList) ? postData.likeList : [];

    return res.status(200).json({
      post: {
        id: postDoc.id,
        ...postData,
        likeCount: postLikes.length || Number(postData.likeCount) || 0,
        reportCount: postReports.length,
      },
      comments,
      reports: postReports,
      reportCounts,
    });
  } catch (error) {
    console.error('Post detail API failed.', error);
    return res.status(500).json({ error: 'Failed to load post' });
  }
}
