import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { serializeFirestore } from './serializeFirestore';

export function postReportTargetId(data: Record<string, unknown>): string | null {
  const type = typeof data.type === 'string' ? data.type : '';
  if (type === 'comment' || type === 'reply') return null;

  const targetId = typeof data.targetId === 'string' ? data.targetId : '';
  const postId = typeof data.postId === 'string' ? data.postId : '';

  if (type === 'post') return targetId || postId || null;
  if (!type && postId && !data.commentId && !data.replyId) return postId;
  return null;
}

export function summarizeReport(report: QueryDocumentSnapshot) {
  const data = serializeFirestore(report.data()) as Record<string, unknown>;
  const reason = [data.reason, data.reportReason, data.message, data.text, data.category, data.description]
    .find((value) => typeof value === 'string' && value.trim());

  return {
    id: report.id,
    reason: typeof reason === 'string' ? reason : 'No reason given',
    reportedBy:
      (typeof data.reportedBy === 'string' && data.reportedBy) ||
      (typeof data.userId === 'string' && data.userId) ||
      '',
    createdAt: data.createdAt ?? data.timestamp ?? null,
  };
}
