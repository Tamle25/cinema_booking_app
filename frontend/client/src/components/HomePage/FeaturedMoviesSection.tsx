"use client";

import SafeImage from '@/components/SafeImage';
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { IMovie } from "@/types";
import TrailerModal from "@/components/TrailerModal";
import { getCloudinaryImageUrl, movieImagePresets } from "@/lib/cloudinary";

interface FeaturedMoviesSectionProps {
  movies: IMovie[];
}

const FeaturedMoviesSection = ({ movies }: FeaturedMoviesSectionProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const featuredMovies = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const comingSoon = movies.filter((m) => {
      const rd = new Date(m.release_date);
      rd.setHours(0, 0, 0, 0);
      return rd > today;
    });

    const nowShowing = movies.filter((m) => {
      const rd = new Date(m.release_date);
      rd.setHours(0, 0, 0, 0);
      return rd <= today;
    });

    if (comingSoon.length >= 3) return comingSoon.slice(0, 6);
    return [...comingSoon, ...nowShowing].slice(0, 6);
  })();

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex(index);
      setTimeout(() => setIsTransitioning(false), 600);
    },
    [isTransitioning]
  );

  const goNext = useCallback(() => {
    if (featuredMovies.length === 0) return;
    goToSlide((currentIndex + 1) % featuredMovies.length);
  }, [currentIndex, featuredMovies.length, goToSlide]);

  const goPrev = useCallback(() => {
    if (featuredMovies.length === 0) return;
    goToSlide(
      currentIndex === 0 ? featuredMovies.length - 1 : currentIndex - 1
    );
  }, [currentIndex, featuredMovies.length, goToSlide]);

  useEffect(() => {
    if (!isAutoPlaying || featuredMovies.length <= 1) return;

    intervalRef.current = setInterval(goNext, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAutoPlaying, goNext, featuredMovies.length]);

  if (movies.length === 0) {
    return (
      <div className="relative w-full h-[500px] md:h-[550px] lg:h-[600px] bg-gray-900 animate-pulse">
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-48 h-72 bg-gray-800 rounded-2xl" />
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-gray-800 rounded w-3/4" />
                <div className="h-4 bg-gray-800 rounded w-1/2" />
                <div className="h-4 bg-gray-800 rounded w-2/3" />
                <div className="h-20 bg-gray-800 rounded w-full" />
                <div className="flex gap-4">
                  <div className="h-12 w-36 bg-gray-800 rounded-full" />
                  <div className="h-12 w-36 bg-gray-800 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (featuredMovies.length === 0) return null;

  const currentMovie = featuredMovies[currentIndex];

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/
    );
    return match ? match[1] : null;
  };

  const trailerUrl = currentMovie.trailer_url
    ? getYouTubeId(currentMovie.trailer_url)
      ? `https://www.youtube.com/watch?v=${getYouTubeId(currentMovie.trailer_url)}`
      : currentMovie.trailer_url
    : null;

  return (
    <section
      id="featured-hero"
      className="relative w-full h-[500px] md:h-[550px] lg:h-[600px] overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      
      {featuredMovies.map((movie, index) => (
        <div
          key={movie._id}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: index === currentIndex ? 1 : 0, zIndex: index === currentIndex ? 1 : 0 }}
        >
          <SafeImage
            src={getCloudinaryImageUrl(
              movie.banner_url || movie.poster_url,
              movieImagePresets.bannerHero,
            )}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}

      
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 40%, rgba(229,9,20,0.15) 70%, rgba(0,0,0,0.6) 100%)",
        }}
      />
      
      <div
        className="absolute bottom-0 left-0 right-0 h-32 z-[2]"
        style={{
          background:
            "linear-gradient(to top, rgb(243,244,246) 0%, rgba(243,244,246,0.5) 40%, transparent 100%)",
        }}
      />

      
      <div className="relative z-[3] h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 lg:gap-14">
            
            <Link
              href={`/movie/${currentMovie._id}`}
              className="flex-shrink-0 hidden md:block group"
            >
              <div className="relative w-44 lg:w-52 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 transform transition-transform duration-300 group-hover:scale-105">
                <SafeImage
                  src={getCloudinaryImageUrl(currentMovie.poster_url, movieImagePresets.posterDetail)}
                  alt={currentMovie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
                
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </Link>

            
            <div className="flex-1 text-center md:text-left max-w-2xl">
              
              <div className="inline-flex items-center gap-2 mb-3">
                {new Date(currentMovie.release_date) > new Date() ? (
                  <span className="bg-yellow-500/90 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Sắp chiếu
                  </span>
                ) : (
                  <span className="bg-green-500/90 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Đang chiếu
                  </span>
                )}
              </div>

              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight drop-shadow-lg">
                {currentMovie.title}
              </h1>

              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 mb-4 text-sm text-gray-300">
                
                {currentMovie.rating > 0 && (
                  <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <svg
                      className="w-4 h-4 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-yellow-400">
                      {currentMovie.rating}
                    </span>
                  </span>
                )}

                
                {currentMovie.duration > 0 && (
                  <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    {currentMovie.duration} phút
                  </span>
                )}

                
                {currentMovie.genres && currentMovie.genres.length > 0 && (
                  <span className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    {currentMovie.genres.map((g) => g.name).join(', ')}
                  </span>
                )}
              </div>

              
              {currentMovie.description && (
                <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6 line-clamp-3 max-w-xl mx-auto md:mx-0">
                  {currentMovie.description}
                </p>
              )}

              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Link
                  href={`/movie/${currentMovie._id}`}
                  className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-red-700 text-white px-7 py-3 rounded-full font-bold text-sm transition-all duration-300 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:scale-105"
                >
                  Đặt vé ngay
                </Link>

                {trailerUrl && (
                  <button
                    onClick={() => setActiveTrailer(trailerUrl)}
                    className="inline-flex items-center gap-2 border-2 border-white/60 hover:border-white text-white px-7 py-3 rounded-full font-bold text-sm transition-all duration-300 hover:bg-white/10 hover:scale-105"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Xem trailer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      
      {featuredMovies.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-[4] w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 border border-white/10"
            aria-label="Phim trước"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-[4] w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 border border-white/10"
            aria-label="Phim tiếp"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      
      {featuredMovies.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2">
          {featuredMovies.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? "w-8 h-2.5 bg-[#E50914]"
                  : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      
      {featuredMovies.length > 1 && (
        <div className="absolute top-6 right-6 z-[4] bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/10">
          {currentIndex + 1} / {featuredMovies.length}
        </div>
      )}

      
      <TrailerModal
        isOpen={!!activeTrailer}
        onClose={() => setActiveTrailer(null)}
        videoUrl={activeTrailer || ""}
      />
    </section>
  );
};

export default FeaturedMoviesSection;
