import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../lib/firebase';
import { storage } from '../lib/firebase';
import { useRouter } from 'next/router';
import { v4 as uuid } from 'uuid';

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

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

    try {
      const imageUrls: string[] = [];

      for (const image of images) {
        const imageRef = ref(storage, `posts/${uuid()}-${image.name}`);
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      }

      await addDoc(collection(db, 'all-posts'), {
        title,
        content,
        imageList: imageUrls,
        timestamp: Date.now(),
        likeCount: 0,
        commentCount: 0,
        likeList: [],
        stability: 0,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-700 to-orange-400 p-6">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">📝 Create New Post</h1>

          {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 text-blue-700">
                <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p>Uploading post...</p>
              </div>
          ) : (
              <>
                {successMessage && (
                    <div className="mb-4 text-green-600 font-medium">
                      {successMessage}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                      type="text"
                      placeholder="Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border rounded"
                  />
                  <textarea
                      placeholder="Content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-4 py-2 border rounded"
                  />
                  <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="w-full"
                  />
                  <p className="text-sm text-gray-500">
                    {images.length}/2 image(s) selected
                  </p>

                  <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  >
                    Submit
                  </button>
                </form>
              </>
          )}
        </div>
      </div>
  );
}
