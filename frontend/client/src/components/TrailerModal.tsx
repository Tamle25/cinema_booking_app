'use client';

import { useEffect, useState } from 'react';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
}

// Hàm hỗ trợ để chuyển đổi URL YouTube thường thành dạng nhúng (embed)
const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  
  // Xử lý link dạng https://www.youtube.com/watch?v=ID hoặc https://youtu.be/ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    const videoId = match[2];
    // Thêm ?autoplay=1 để tự động chạy khi mở
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  
  // Fallback trả về nguyên gốc nếu không parse được (hoặc đã là link embed sẵn)
  return url;
};

export default function TrailerModal({ isOpen, onClose, videoUrl }: TrailerModalProps) {
  const [embedUrl, setEmbedUrl] = useState('');
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      if (videoUrl) {
        setEmbedUrl(getYouTubeEmbedUrl(videoUrl));
      }
      
      // Khóa body scroll
      document.body.style.overflow = 'hidden';
      
      // Lắng nghe sự kiện ESC
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.body.style.overflow = 'auto';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Khi đóng modal, chờ một chút cho hiệu ứng fade out rồi mới unmount hoàn toàn
      const timer = setTimeout(() => {
        setIsRendered(false);
        setEmbedUrl(''); // Reset url để video dừng chạy
      }, 300); // 300ms tương đương với duration của hiệu ứng tailwind
      return () => clearTimeout(timer);
    }
  }, [isOpen, videoUrl, onClose]);

  if (!isRendered && !isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Dark Overlay với backdrop blur */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className={`relative w-full max-w-5xl px-4 md:px-8 transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
        }`}
      >
        {/* Nút Đóng (X) */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-4 md:right-8 text-white/70 hover:text-white transition-colors p-2 flex items-center gap-2 group cursor-pointer z-10"
          title="Đóng (ESC)"
        >
          <span className="text-sm font-bold uppercase tracking-widest hidden sm:block group-hover:text-red-500 transition-colors">Đóng</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Video Container (Tỷ lệ 16:9) */}
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 ring-1 ring-black/50 group">
          {/* Skeleton Loading giả lập khi iframe đang tải */}
          {!embedUrl ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title="Movie Trailer"
            />
          )}
        </div>
      </div>
    </div>
  );
}
