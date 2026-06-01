'use client';

import { useEffect, useState } from 'react';
import { API_URL, authHeaders } from '@/lib/api';
import { getCloudinaryImageUrl, movieImagePresets } from '@/lib/cloudinary';

export interface UploadedMovieImage {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  warnings?: string[];
}

type MovieImageType = 'poster' | 'banner';

interface MovieImageUploadProps {
  type: MovieImageType;
  label: string;
  value: string;
  required?: boolean;
  onUploaded: (type: MovieImageType, image: UploadedMovieImage) => void;
  onUploadingChange?: (type: MovieImageType, isUploading: boolean) => void;
}

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CLIENT_RULES: Record<
  MovieImageType,
  {
    minWidth: number;
    minHeight: number;
    minRatio: number;
    maxRatio: number;
    helper: string;
  }
> = {
  poster: {
    minWidth: 600,
    minHeight: 900,
    minRatio: 0.58,
    maxRatio: 0.75,
    helper: 'Toi thieu 600x900px, phu hop layout poster 2:3.',
  },
  banner: {
    minWidth: 1280,
    minHeight: 480,
    minRatio: 1.6,
    maxRatio: 3.4,
    helper: 'Toi thieu 1280x480px, phu hop hero/banner ngang hien tai.',
  },
};

const getImageDimensions = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Khong doc duoc kich thuoc anh'));
    image.src = src;
  });

const formatBytes = (bytes: number) => {
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
};

export default function MovieImageUpload({
  type,
  label,
  value,
  required,
  onUploaded,
  onUploadingChange,
}: MovieImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [meta, setMeta] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const setUploading = (nextValue: boolean) => {
    setIsUploading(nextValue);
    onUploadingChange?.(type, nextValue);
  };

  const validateDimensions = (width: number, height: number) => {
    const rules = CLIENT_RULES[type];
    const ratio = height > 0 ? width / height : 0;
    const nextErrors: string[] = [];
    const nextWarnings: string[] = [];

    if (width < rules.minWidth || height < rules.minHeight) {
      nextErrors.push(
        `${label} qua nho (${width}x${height}). Can toi thieu ${rules.minWidth}x${rules.minHeight}px de tranh bi nhoe.`,
      );
    }

    if (ratio < rules.minRatio || ratio > rules.maxRatio) {
      nextWarnings.push(
        `Ty le ${width}x${height} khac nhieu so voi layout hien tai; anh co the bi crop xau.`,
      );
    }

    return { nextErrors, nextWarnings };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setWarnings([]);
    setMeta('');

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((oldPreview) => {
      if (oldPreview?.startsWith('blob:')) URL.revokeObjectURL(oldPreview);
      return objectUrl;
    });

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Chi chap nhan file anh JPG, PNG hoac WebP.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`File qua lon (${formatBytes(file.size)}). Toi da 8MB.`);
      event.target.value = '';
      return;
    }

    let dimensions: { width: number; height: number };
    try {
      dimensions = await getImageDimensions(objectUrl);
    } catch {
      setError('Khong doc duoc kich thuoc anh. Vui long chon file khac.');
      event.target.value = '';
      return;
    }

    const { nextErrors, nextWarnings } = validateDimensions(
      dimensions.width,
      dimensions.height,
    );

    setMeta(`${dimensions.width}x${dimensions.height} - ${formatBytes(file.size)}`);
    setWarnings(nextWarnings);

    if (nextErrors.length > 0) {
      setError(nextErrors.join(' '));
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    setUploading(true);
    try {
      const response = await fetch(`${API_URL}/uploads/movie-image`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(' ')
          : data.message || 'Upload anh that bai.';
        throw new Error(message);
      }

      const uploaded = data as UploadedMovieImage;
      setWarnings(uploaded.warnings || nextWarnings);
      setMeta(
        `${uploaded.width}x${uploaded.height} - ${formatBytes(uploaded.bytes)} - ${uploaded.format.toUpperCase()}`,
      );
      onUploaded(type, uploaded);
      setPreviewUrl(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Upload anh that bai.',
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const displayUrl = previewUrl || value;
  const previewSrc =
    previewUrl ||
    getCloudinaryImageUrl(
      value,
      type === 'poster'
        ? movieImagePresets.posterAdminPreview
        : movieImagePresets.bannerAdminPreview,
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {isUploading && (
          <span className="text-xs font-medium text-blue-600">Dang upload...</span>
        )}
      </div>

      <div
        className={`relative overflow-hidden rounded-lg border border-dashed bg-gray-50 ${
          type === 'poster' ? 'max-w-[220px] aspect-[2/3]' : 'w-full aspect-[16/6]'
        }`}
      >
        {displayUrl ? (
          <img
            src={previewSrc}
            alt={`${label} preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-gray-400">
            Chua co anh
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      <input
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        disabled={isUploading}
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-700 file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 disabled:opacity-60"
      />

      <p className="text-xs text-gray-500">{CLIENT_RULES[type].helper}</p>
      {meta && <p className="text-xs text-gray-500">Anh: {meta}</p>}
      {warnings.map((warning) => (
        <p key={warning} className="text-xs text-amber-600">
          {warning}
        </p>
      ))}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
