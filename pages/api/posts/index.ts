import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Firestore, Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '../../../lib/firebaseAdmin';
import { isAdminFailure, requireAdmin } from '../../../lib/requireAdmin';
import { serializeFirestore } from '../../../lib/serializeFirestore';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

const PAGE_SIZE = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const admin = await requireAdmin(req);
    if (isAdminFailure(admin)) {
      return res.status(admin.status).json({ error: admin.error });
    }

    if (req.method === 'GET') {
      return await listPosts(admin.db, req, res);
    }
    if (req.method === 'POST') {
      return await createPost(admin.db, req, res);
    }
    if (req.method === 'PATCH') {
      return await updatePost(admin.db, req, res);
    }
    if (req.method === 'DELETE') {
      return await deletePost(admin.db, req, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Posts API failed.', error);
    return res.status(500).json({ error: 'Failed to load posts' });
  }
}

async function listPosts(db: Firestore, req: NextApiRequest, res: NextApiResponse) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
  const direction = req.query.direction === 'prev' ? 'prev' : 'next';
  const requestedSort = req.query.sort === 'timestamp' ? 'timestamp' : 'createdAt';

  const [reportSnap, commentSnap] = await Promise.all([
    db.collection('reports').get(),
    db.collection('comments').get(),
  ]);

  const reportCounts: Record<string, number> = {};
  reportSnap.docs.forEach((report) => {
    const data = report.data();
    if (data.type === 'post' && typeof data.targetId === 'string') {
      reportCounts[data.targetId] = (reportCounts[data.targetId] || 0) + 1;
    }
  });

  const commentCounts: Record<string, number> = {};
  commentSnap.docs.forEach((comment) => {
    const postId = comment.data().postId;
    if (typeof postId === 'string') {
      commentCounts[postId] = (commentCounts[postId] || 0) + 1;
    }
  });

  if (search) {
    const snapshot = await db.collection('posts').get();
    const matches = snapshot.docs.filter((post) =>
      String(post.data().title || '').toLowerCase().includes(search)
    );
    const page = matches.slice(0, PAGE_SIZE);
    return res.status(200).json({
      posts: page.map((post) => toPost(post, reportCounts, commentCounts)),
      hasMore: matches.length > PAGE_SIZE,
      sortField: requestedSort,
      firstId: page[0]?.id ?? null,
      lastId: page[page.length - 1]?.id ?? null,
    });
  }

  const sortField = await resolveSortField(db, requestedSort, cursor);
  let query: Query = db.collection('posts').orderBy(sortField, 'desc');

  if (cursor) {
    const cursorDoc = await db.collection('posts').doc(cursor).get();
    if (cursorDoc.exists) {
      query = direction === 'prev' ? query.startAt(cursorDoc) : query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.limit(PAGE_SIZE + 1).get();
  const hasMore = snapshot.docs.length > PAGE_SIZE;
  const page = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;

  return res.status(200).json({
    posts: page.map((post) => toPost(post, reportCounts, commentCounts)).sort((a, b) => b.reportCount - a.reportCount),
    hasMore,
    sortField,
    firstId: page[0]?.id ?? null,
    lastId: page[page.length - 1]?.id ?? null,
  });
}

async function resolveSortField(
  db: Firestore,
  requestedSort: 'createdAt' | 'timestamp',
  cursor: string
) {
  if (cursor || requestedSort === 'timestamp') return requestedSort;
  const probe = await db.collection('posts').orderBy('createdAt', 'desc').limit(1).get();
  return probe.empty ? 'timestamp' : 'createdAt';
}

function toPost(
  post: QueryDocumentSnapshot,
  reportCounts: Record<string, number>,
  commentCounts: Record<string, number>
) {
  const data = serializeFirestore(post.data()) as Record<string, unknown>;
  const likeList = Array.isArray(data.likeList) ? data.likeList : [];
  return {
    id: post.id,
    ...data,
    reportCount: reportCounts[post.id] || 0,
    commentCount: commentCounts[post.id] || 0,
    likeCount: likeList.length || Number(data.likeCount) || 0,
  };
}

async function createPost(db: Firestore, req: NextApiRequest, res: NextApiResponse) {
  const title = req.body?.title;
  const content = req.body?.content;
  const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 2) : [];
  if (typeof title !== 'string' || !title.trim() || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const imageUrls = await uploadImages(images);
  const now = Date.now();
  const created = await db.collection('posts').add({
    title: title.trim(),
    content: content.trim(),
    caption: content.trim(),
    imageUrl: imageUrls[0] ?? '',
    imageUrls,
    imageList: imageUrls,
    createdAt: now,
    updatedAt: now,
    timestamp: now,
    likes: [],
    comments: 0,
    shares: 0,
    likeCount: 0,
    commentCount: 0,
    likeList: [],
    stability: 0,
    userId: 'rockzy_admin',
    userName: 'Rockzy Official',
    user: {
      id: 'rockzy_admin',
      name: 'Rockzy Official',
      userId: 'rockzy_admin',
      profilePictureUrl: null,
      stability: 0,
    },
  });

  return res.status(200).json({ id: created.id });
}

async function uploadImages(images: Array<{ name?: string; contentType?: string; data?: string }>) {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('Storage bucket is not configured');
  }
  if (images.length === 0) return [];

  const bucket = getStorage(adminApp).bucket(bucketName);
  const urls: string[] = [];

  for (const image of images) {
    if (!image?.data || !image.name) continue;
    const safeName = image.name.replace(/[^\w.\-]+/g, '_');
    const path = `posts/${randomUUID()}-${safeName}`;
    const token = randomUUID();
    const file = bucket.file(path);
    await file.save(Buffer.from(image.data, 'base64'), {
      metadata: {
        contentType: image.contentType || 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    urls.push(
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
    );
  }

  return urls;
}

async function updatePost(db: Firestore, req: NextApiRequest, res: NextApiResponse) {
  const { id, title, content } = req.body || {};
  if (typeof id !== 'string' || typeof title !== 'string' || typeof content !== 'string') {
    return res.status(400).json({ error: 'Invalid post update' });
  }
  await db.collection('posts').doc(id).update({ title, content });
  return res.status(200).json({ ok: true });
}

async function deletePost(db: Firestore, req: NextApiRequest, res: NextApiResponse) {
  const single = typeof req.query.id === 'string' ? req.query.id : '';
  const bulk = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => typeof id === 'string') : [];
  const ids = bulk.length > 0 ? bulk : single ? [single] : [];
  if (ids.length === 0) {
    return res.status(400).json({ error: 'Missing post id' });
  }
  await Promise.all(ids.map((id) => db.collection('posts').doc(id).delete()));
  return res.status(200).json({ ok: true, deleted: ids.length });
}
