import type { ImgHTMLAttributes } from 'react';

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> & {
  alt: string;
};

export default function SafeImage(props: SafeImageProps) {
  const { alt, ...imageProps } = props;

  // Dynamic image URLs come from the API and Cloudinary; keep native img behavior to preserve existing layouts.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} {...imageProps} />;
}
