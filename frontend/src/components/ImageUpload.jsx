// frontend/src/components/ImageUpload.jsx
//
// Reusable image upload component.
// Sends multipart/form-data to your Express backend — NOT directly to Cloudinary.
// The backend handles auth, ownership validation, and the Cloudinary SDK call.
//
// Props:
//   endpoint     — API path e.g. '/upload/restaurant' or '/upload/menu-item'
//   extraFields  — additional form fields e.g. { restaurant_id: 1 } or { menu_item_id: 3 }
//   currentUrl   — existing image_url from DB shown as initial preview
//   onSuccess    — callback(url: string) called with the Cloudinary URL after upload
//   label        — label text shown above the drop zone
//   aspectHint   — optional hint e.g. "Recommended: 16:9, min 800px wide"

import React, { useState, useRef } from 'react';
import axios from '../api/axios';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // must match backend limit

const ImageUpload = ({
  endpoint,
  extraFields  = {},
  currentUrl   = null,
  onSuccess,
  label        = 'Upload image',
  aspectHint   = '',
}) => {
  const [preview,   setPreview]   = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState('');
  const [dragOver,  setDragOver]  = useState(false);

  const inputRef = useRef(null);

  // Client-side validation mirrors backend rules
  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `Image must be smaller than ${MAX_SIZE_BYTES / (1024 * 1024)} MB.`;
    }
    return null;
  };

  const handleFile = async (file) => {
    setError('');

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Show a local blob preview immediately so the user has instant feedback
    const blobUrl = URL.createObjectURL(file);
    setPreview(blobUrl);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('image', file);

    // Attach extra fields (restaurant_id, menu_item_id) required by the backend
    Object.entries(extraFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      const response = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      const uploadedUrl = response.data.data.url;
      setPreview(uploadedUrl); // replace ephemeral blob URL with permanent Cloudinary URL
      onSuccess(uploadedUrl);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setPreview(currentUrl); // revert to original on failure
    } finally {
      setUploading(false);
      setProgress(0);
      URL.revokeObjectURL(blobUrl); // release memory
    }
  };

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ''; // reset so same file can be re-selected after error
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full">
      {label && (
        <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      )}

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'relative w-full rounded-xl border-2 border-dashed overflow-hidden',
          'transition-all duration-200',
          uploading  ? 'cursor-not-allowed opacity-70'
                     : 'cursor-pointer',
          dragOver   ? 'border-brand-400 bg-brand-50'
                     : 'border-gray-200 hover:border-brand-300 bg-gray-50',
        ].join(' ')}
        style={{ minHeight: '180px' }}
      >
        {preview ? (
          <div className="relative w-full h-48">
            <img
              src={preview}
              alt="Upload preview"
              className="w-full h-full object-cover"
            />
            {!uploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white text-sm font-medium">Click to change</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-44 gap-3 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                <span className="text-brand-500">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPEG, PNG, WebP · Max {MAX_SIZE_BYTES / (1024 * 1024)} MB
              </p>
              {aspectHint && (
                <p className="text-xs text-gray-400 mt-0.5">{aspectHint}</p>
              )}
            </div>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-3">
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-400 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 font-medium">Uploading {progress}%</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={onInputChange}
        disabled={uploading}
      />
    </div>
  );
};

export default ImageUpload;
