import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../lib/firebase';
import { storage } from '../lib/firebase';
import Link from 'next/link';
import { v4 as uuid } from 'uuid';

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      if (fileArray.length > 2) {
        alert('You can upload a maximum of 2 images.');
        return;
      }
      setImages(fileArray);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    if (!db || !storage) {
      alert('Firebase client is not configured. Check NEXT_PUBLIC_FIREBASE_* variables.');
      return;
    }

    setLoading(true);
    setSuccessMessage('');

    try {
      const imageUrls: string[] = [];

      for (const image of images) {
        const imageRef = ref(storage, `posts/${uuid()}-${image.name}`);
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      }

      await addDoc(collection(db, 'posts'), {
        title,
        content,
        caption: content,
        imageUrl: imageUrls[0] ?? '',
        imageUrls: imageUrls,
        imageList: imageUrls,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        timestamp: Date.now(),
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
          stability: 0
        }
      });

      setTitle('');
      setContent('');
      setImages([]);
      setSuccessMessage('✅ Post created successfully!');
    } catch (err) {
      console.error('Error adding post:', err);
      alert('Error submitting post.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <main className="premium-shell flex items-center justify-center">
        <div className="premium-card w-full max-w-3xl p-6 sm:p-8">
          <div className="mb-4">
            <Link href="/dashboard" className="premium-button-secondary">
              ← Dashboard
            </Link>
          </div>
          <h1 className="premium-title mb-2">Create a Rockzy Post</h1>
          <p className="premium-subtitle mb-6">
            Publish premium-quality updates with optional images.
          </p>

          {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 text-indigo-300">
                <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p>Uploading post...</p>
              </div>
          ) : (
              <>
                {successMessage && (
                    <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
                      {successMessage}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                      type="text"
                      placeholder="Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="premium-input"
                      required
                  />
                  <textarea
                      placeholder="Content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="premium-input min-h-40"
                      required
                  />
                  <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="premium-input file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  />
                  <p className="text-sm text-slate-400">
                    {images.length}/2 image(s) selected
                  </p>

                  <button type="submit" className="premium-button">
                    Submit
                  </button>
                </form>
              </>
          )}
        </div>
      </main>
  );
}
