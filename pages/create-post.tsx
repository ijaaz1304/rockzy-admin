import { useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '../lib/adminFetch';
import ThemeToggle from '../components/ThemeToggle';

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

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

    setLoading(true);
    setSuccessMessage('');
    setError('');

    try {
      const imagePayloads = await Promise.all(images.map(readImage));
      await adminFetch('/api/posts/', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          images: imagePayloads,
        }),
      });

      setTitle('');
      setContent('');
      setImages([]);
      setSuccessMessage('Post created successfully.');
    } catch (err) {
      console.error('Error adding post:', err);
      setError(err instanceof Error ? err.message : 'Error submitting post.');
    } finally {
      setLoading(false);
    }
  };

  const readImage = (image: File) =>
    new Promise<{ name: string; contentType: string; data: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve({
          name: image.name,
          contentType: image.type || 'image/jpeg',
          data: result.split(',')[1] || '',
        });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(image);
    });

  return (
      <main className="premium-shell flex items-center justify-center">
        <div className="premium-card w-full max-w-3xl p-6 sm:p-8">
          <div className="page-toolbar">
            <Link href="/dashboard" className="premium-button-secondary">
              ← Dashboard
            </Link>
            <ThemeToggle />
          </div>
          <h1 className="premium-title mb-2">Create a Rockzy Post</h1>
          <p className="premium-subtitle mb-6">
            Publish premium-quality updates with optional images.
          </p>

          {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 text-accent">
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
                {error && (
                    <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                      {error}
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
                  <p className="text-sm text-faint">
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
