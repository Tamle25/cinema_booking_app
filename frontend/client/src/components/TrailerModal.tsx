'use client';

import { useEffect, useMemo, useState } from 'react';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
}

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    const videoId = match[2];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  
  return url;
};

export default function TrailerModal({ isOpen, onClose, videoUrl }: TrailerModalProps) {
  const [isRendered, setIsRendered] = useState(false);
  const embedUrl = useMemo(() => getYouTubeEmbedUrl(videoUrl || ''), [videoUrl]);

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => setIsRendered(true), 0);
      return () => clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setIsRendered(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
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
    }
  }, [isOpen, onClose]);

  if (!isRendered && !isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      
      <div 
        className={`relative w-full max-w-5xl px-4 md:px-8 transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
        }`}
      >
        
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

        
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 ring-1 ring-black/50 group">
          
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
