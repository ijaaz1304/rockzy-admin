import { auth } from './firebase';

export async function adminFetch<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('Sign in again.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data as T;
}
