import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminFailure, requireAdmin } from '../../lib/requireAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = await requireAdmin(req);
    if (isAdminFailure(admin)) {
      return res.status(admin.status).json({ isAdmin: false, error: admin.error });
    }
    return res.status(200).json({ isAdmin: true });
  } catch (error) {
    console.error('Error in check-admin API route.', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
