export interface CloudinaryImageOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'thumb';
  gravity?: string;
  quality?: string;
  format?: string;
}

export const movieImagePresets = {
  posterThumb: { width: 160, height: 240, crop: 'fill' },
  posterCard: { width: 420, height: 630, crop: 'fill' },
  posterDetail: { width: 640, height: 960, crop: 'fill' },
  posterAdminPreview: { width: 360, height: 540, crop: 'fill' },
  bannerCard: { width: 720, height: 320, crop: 'fill', gravity: 'auto' },
  bannerHero: { width: 1600, height: 600, crop: 'fill', gravity: 'auto' },
  bannerAdminPreview: { width: 900, height: 360, crop: 'fill', gravity: 'auto' },
} satisfies Record<string, CloudinaryImageOptions>;

export const isCloudinaryImageUrl = (src?: string | null) => {
  return Boolean(src && /^https?:\/\/res\.cloudinary\.com\//.test(src));
};

export const getCloudinaryImageUrl = (
  src?: string | null,
  options: CloudinaryImageOptions = {},
) => {
  if (!src || !isCloudinaryImageUrl(src)) return src || '';

  const uploadMarker = '/image/upload/';
  const [baseUrl, queryString] = src.split('?');
  const markerIndex = baseUrl.indexOf(uploadMarker);
  if (markerIndex === -1) return src;

  const transformations = [
    `f_${options.format || 'auto'}`,
    `q_${options.quality || 'auto'}`,
  ];

  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.gravity) transformations.push(`g_${options.gravity}`);

  const prefix = baseUrl.slice(0, markerIndex + uploadMarker.length);
  const suffix = baseUrl.slice(markerIndex + uploadMarker.length);
  const transformed = `${prefix}${transformations.join(',')}/${suffix}`;

  return queryString ? `${transformed}?${queryString}` : transformed;
};
