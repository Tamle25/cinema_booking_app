'use client';

import SafeImage from '@/components/SafeImage';
import { useEffect, useId, useState } from 'react';
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

const POSTER_EXPECTED_RATIO = 2 / 3;
const POSTER_RATIO_TOLERANCE = 0.135;

const BANNER_EXPECTED_RATIO = 16 / 6;
const BANNER_RATIO_TOLERANCE = 0.533;

const CLIENT_RULES: Record<
  MovieImageType,
  {
    minWidth: number;
    minHeight: number;
    expectedRatio: number;
    tolerance: number;
    helper: string;
  }
> = {
  poster: {
    minWidth: 500,
    minHeight: 750,
    expectedRatio: POSTER_EXPECTED_RATIO,
    tolerance: POSTER_RATIO_TOLERANCE,
    helper: 'Tối thiểu 500x750px, tỉ lệ gần đúng 2:3 (chấp nhận sai số ±20%).',
  },
  banner: {
    minWidth: 800,
    minHeight: 300,
    expectedRatio: BANNER_EXPECTED_RATIO,
    tolerance: BANNER_RATIO_TOLERANCE,
    helper: 'Tối thiểu 800x300px, tỉ lệ gần đúng 16:6 (chấp nhận sai số ±20%).',
  },
};

const getImageDimensions = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Không đọc được kích thước ảnh'));
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
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [meta, setMeta] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

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
        `${label} quá nhỏ (${width}x${height}). Cần tối thiểu ${rules.minWidth}x${rules.minHeight}px để tránh bị nhòe.`,
      );
    }

    const diff = Math.abs(ratio - rules.expectedRatio);
    if (diff > rules.tolerance) {
      nextErrors.push(
        `Ảnh có tỷ lệ quá khác so với tỷ lệ khuyến nghị. Vui lòng chọn ảnh gần với tỷ lệ ${type === 'poster' ? '2:3' : '16:6'}.`,
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Chỉ chấp nhận file ảnh JPG, PNG hoặc WebP.');
      URL.revokeObjectURL(objectUrl);
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`File quá lớn (${formatBytes(file.size)}). Tối đa 8MB.`);
      URL.revokeObjectURL(objectUrl);
      event.target.value = '';
      return;
    }

    let dimensions: { width: number; height: number };
    try {
      dimensions = await getImageDimensions(objectUrl);
    } catch {
      setError('Không đọc được kích thước ảnh. Vui lòng chọn file khác.');
      URL.revokeObjectURL(objectUrl);
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
      URL.revokeObjectURL(objectUrl);
      event.target.value = '';
      return;
    }

    setSelectedFileName(file.name);
    setPreviewUrl((oldPreview) => {
      if (oldPreview?.startsWith('blob:')) URL.revokeObjectURL(oldPreview);
      return objectUrl;
    });

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
          : data.message || 'Upload ảnh thất bại.';
        throw new Error(message);
      }

      const uploaded = data as UploadedMovieImage;
      setWarnings(uploaded.warnings || nextWarnings);
      setMeta(
        `${uploaded.width}x${uploaded.height} - ${formatBytes(uploaded.bytes)} - ${uploaded.format.toUpperCase()}`,
      );
      onUploaded(type, uploaded);
      setPreviewUrl((oldPreview) => {
        if (oldPreview?.startsWith('blob:')) URL.revokeObjectURL(oldPreview);
        return null;
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Upload ảnh thất bại.',
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const displayUrl = previewUrl || value;
  const fileStatusText = selectedFileName
    ? `Đã chọn: ${selectedFileName}`
    : value
      ? 'Đang dùng ảnh hiện tại'
      : 'Chưa chọn ảnh mới';
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
          <span className="text-xs font-medium text-blue-600">Đang upload...</span>
        )}
      </div>

      <div
        className={`relative overflow-hidden rounded-lg border border-dashed bg-gray-50 ${type === 'poster' ? 'max-w-[220px] aspect-[2/3]' : 'w-full aspect-[16/6]'
          }`}
      >
        {displayUrl ? (
          <SafeImage
            src={previewSrc}
            alt={`${label} preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-gray-400">
            Chưa có ảnh
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <label
          htmlFor={inputId}
          className={`flex-shrink-0 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition ${
            isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-blue-700'
          }`}
        >
          Chọn ảnh
        </label>
        <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
          {fileStatusText}
        </span>
      </div>

      <input
        id={inputId}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        disabled={isUploading}
        onChange={handleFileChange}
        className="sr-only"
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
