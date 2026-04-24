"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import MovieCard from "@/components/MovieCard";
import ShowtimesSection from "@/components/ShowtimesSection";
import FeaturedMoviesSection from "@/components/HomePage/FeaturedMoviesSection";
import PromotionsSection from "@/components/HomePage/PromotionsSection";
import CinemaPartnersSection from "@/components/HomePage/CinemaPartnersSection";
import { IMovie } from "@/types";

// Định nghĩa kiểu dữ liệu (phải khớp với Backend)
interface Movie {
  _id: string;
  title: string;
  poster_url: string;
  duration: number;
  release_date: string;
  rating: number;
}

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);

  // Now Showing scroll state
  const [currentPageNowShowing, setCurrentPageNowShowing] = useState(0);
  const scrollContainerNowShowingRef = useRef<HTMLDivElement>(null);
  const [isDraggingNowShowing, setIsDraggingNowShowing] = useState(false);
  const [startXNowShowing, setStartXNowShowing] = useState(0);
  const [scrollLeftNowShowing, setScrollLeftNowShowing] = useState(0);

  // Coming Soon scroll state
  const [currentPageComingSoon, setCurrentPageComingSoon] = useState(0);
  const scrollContainerComingSoonRef = useRef<HTMLDivElement>(null);
  const [isDraggingComingSoon, setIsDraggingComingSoon] = useState(false);
  const [startXComingSoon, setStartXComingSoon] = useState(0);
  const [scrollLeftComingSoon, setScrollLeftComingSoon] = useState(0);

  const MOVIES_PER_PAGE = 6;

  // Phân loại phim dựa trên ngày khởi chiếu
  const { nowShowingMovies, comingSoonMovies } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset thời gian để so sánh chính xác theo ngày

    const nowShowing: Movie[] = [];
    const comingSoon: Movie[] = [];

    movies.forEach((movie) => {
      const releaseDate = new Date(movie.release_date);
      releaseDate.setHours(0, 0, 0, 0);

      if (releaseDate <= today) {
        nowShowing.push(movie);
      } else {
        comingSoon.push(movie);
      }
    });

    return { nowShowingMovies: nowShowing, comingSoonMovies: comingSoon };
  }, [movies]);

  const totalPagesNowShowing = Math.ceil(nowShowingMovies.length / MOVIES_PER_PAGE);
  const totalPagesComingSoon = Math.ceil(comingSoonMovies.length / MOVIES_PER_PAGE);

  // State cho dữ liệu IMovie đầy đủ (dùng cho hero banner)
  const [fullMovies, setFullMovies] = useState<IMovie[]>([]);

  // Gọi API lấy danh sách phim
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const fetchMovies = async () => {
      try {
        const res = await axios.get(`${API_URL}/movies`);
        setMovies(res.data);
        setFullMovies(res.data);
      } catch (error) {
        console.error("Lỗi tải phim:", error);
      }
    };
    fetchMovies();
  }, []);

  // ============ NOW SHOWING HANDLERS ============
  const handleMouseDownNowShowing = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerNowShowingRef.current) return;
    setIsDraggingNowShowing(true);
    setStartXNowShowing(e.pageX - scrollContainerNowShowingRef.current.offsetLeft);
    setScrollLeftNowShowing(scrollContainerNowShowingRef.current.scrollLeft);
    scrollContainerNowShowingRef.current.style.cursor = 'grabbing';
  }, []);

  const handleMouseUpNowShowing = useCallback(() => {
    setIsDraggingNowShowing(false);
    if (scrollContainerNowShowingRef.current) {
      scrollContainerNowShowingRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleMouseMoveNowShowing = useCallback((e: React.MouseEvent) => {
    if (!isDraggingNowShowing || !scrollContainerNowShowingRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerNowShowingRef.current.offsetLeft;
    const walk = (x - startXNowShowing) * 2;
    scrollContainerNowShowingRef.current.scrollLeft = scrollLeftNowShowing - walk;
  }, [isDraggingNowShowing, startXNowShowing, scrollLeftNowShowing]);

  const handleMouseLeaveNowShowing = useCallback(() => {
    setIsDraggingNowShowing(false);
    if (scrollContainerNowShowingRef.current) {
      scrollContainerNowShowingRef.current.style.cursor = 'grab';
    }
  }, []);

  const goToPageNowShowing = (page: number) => {
    setCurrentPageNowShowing(page);
    if (scrollContainerNowShowingRef.current && nowShowingMovies.length > 0) {
      const cardWidth = scrollContainerNowShowingRef.current.scrollWidth / nowShowingMovies.length;
      scrollContainerNowShowingRef.current.scrollTo({
        left: page * MOVIES_PER_PAGE * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  const scrollByAmountNowShowing = (direction: 'left' | 'right') => {
    if (!scrollContainerNowShowingRef.current || nowShowingMovies.length === 0) return;
    const cardWidth = scrollContainerNowShowingRef.current.scrollWidth / nowShowingMovies.length;
    const scrollAmount = cardWidth * 3;
    scrollContainerNowShowingRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleScrollNowShowing = useCallback(() => {
    if (!scrollContainerNowShowingRef.current || nowShowingMovies.length === 0) return;
    const cardWidth = scrollContainerNowShowingRef.current.scrollWidth / nowShowingMovies.length;
    const newPage = Math.round(scrollContainerNowShowingRef.current.scrollLeft / (cardWidth * MOVIES_PER_PAGE));
    if (newPage !== currentPageNowShowing && newPage >= 0 && newPage < totalPagesNowShowing) {
      setCurrentPageNowShowing(newPage);
    }
  }, [currentPageNowShowing, nowShowingMovies.length, totalPagesNowShowing]);

  // ============ COMING SOON HANDLERS ============
  const handleMouseDownComingSoon = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerComingSoonRef.current) return;
    setIsDraggingComingSoon(true);
    setStartXComingSoon(e.pageX - scrollContainerComingSoonRef.current.offsetLeft);
    setScrollLeftComingSoon(scrollContainerComingSoonRef.current.scrollLeft);
    scrollContainerComingSoonRef.current.style.cursor = 'grabbing';
  }, []);

  const handleMouseUpComingSoon = useCallback(() => {
    setIsDraggingComingSoon(false);
    if (scrollContainerComingSoonRef.current) {
      scrollContainerComingSoonRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleMouseMoveComingSoon = useCallback((e: React.MouseEvent) => {
    if (!isDraggingComingSoon || !scrollContainerComingSoonRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerComingSoonRef.current.offsetLeft;
    const walk = (x - startXComingSoon) * 2;
    scrollContainerComingSoonRef.current.scrollLeft = scrollLeftComingSoon - walk;
  }, [isDraggingComingSoon, startXComingSoon, scrollLeftComingSoon]);

  const handleMouseLeaveComingSoon = useCallback(() => {
    setIsDraggingComingSoon(false);
    if (scrollContainerComingSoonRef.current) {
      scrollContainerComingSoonRef.current.style.cursor = 'grab';
    }
  }, []);

  const goToPageComingSoon = (page: number) => {
    setCurrentPageComingSoon(page);
    if (scrollContainerComingSoonRef.current && comingSoonMovies.length > 0) {
      const cardWidth = scrollContainerComingSoonRef.current.scrollWidth / comingSoonMovies.length;
      scrollContainerComingSoonRef.current.scrollTo({
        left: page * MOVIES_PER_PAGE * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  const scrollByAmountComingSoon = (direction: 'left' | 'right') => {
    if (!scrollContainerComingSoonRef.current || comingSoonMovies.length === 0) return;
    const cardWidth = scrollContainerComingSoonRef.current.scrollWidth / comingSoonMovies.length;
    const scrollAmount = cardWidth * 3;
    scrollContainerComingSoonRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleScrollComingSoon = useCallback(() => {
    if (!scrollContainerComingSoonRef.current || comingSoonMovies.length === 0) return;
    const cardWidth = scrollContainerComingSoonRef.current.scrollWidth / comingSoonMovies.length;
    const newPage = Math.round(scrollContainerComingSoonRef.current.scrollLeft / (cardWidth * MOVIES_PER_PAGE));
    if (newPage !== currentPageComingSoon && newPage >= 0 && newPage < totalPagesComingSoon) {
      setCurrentPageComingSoon(newPage);
    }
  }, [currentPageComingSoon, comingSoonMovies.length, totalPagesComingSoon]);

  // Format ngày hiển thị
  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <main className="min-h-screen bg-gray-100">
      {/* 1. Hero Banner - Featured Movies Carousel */}
      <FeaturedMoviesSection movies={fullMovies} />

      {/* 2. Phần Danh Sách Phim Đang Chiếu */}
      <div id="now-showing" className="max-w-7xl mx-auto px-4 py-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-10 bg-red-600 rounded-full" />
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Phim Đang Chiếu
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {nowShowingMovies.length} phim đang được trình chiếu
              </p>
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => scrollByAmountNowShowing('left')}
              className="w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center text-gray-600 hover:text-red-600 transition-all hover:scale-105 disabled:opacity-50"
              aria-label="Cuộn trái"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scrollByAmountNowShowing('right')}
              className="w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center text-gray-600 hover:text-red-600 transition-all hover:scale-105 disabled:opacity-50"
              aria-label="Cuộn phải"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <a
              href="/movies?status=now_showing"
              className="ml-2 text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
            >
              Xem tất cả
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Movies Horizontal Scroll Container */}
        <div className="relative">
          {/* Gradient Overlays for visual scroll hint */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-100 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-100 to-transparent z-10 pointer-events-none" />

          {/* Scrollable Container */}
          <div
            ref={scrollContainerNowShowingRef}
            onMouseDown={handleMouseDownNowShowing}
            onMouseUp={handleMouseUpNowShowing}
            onMouseMove={handleMouseMoveNowShowing}
            onMouseLeave={handleMouseLeaveNowShowing}
            onScroll={handleScrollNowShowing}
            className="flex gap-5 overflow-x-auto pb-4 scroll-smooth scrollbar-hide select-none"
            style={{
              cursor: 'grab',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {nowShowingMovies.length > 0 ? (
              nowShowingMovies.map((movie) => (
                <div
                  key={movie._id}
                  className="flex-shrink-0 w-[calc((100%-100px)/6)]"
                  style={{ minWidth: '180px', maxWidth: '220px' }}
                >
                  <MovieCard movie={movie} />
                </div>
              ))
            ) : (
              // Skeleton Loading
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-[calc((100%-100px)/6)] min-w-[180px] max-w-[220px]"
                >
                  <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                    <div className="h-64 bg-gray-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination Dots */}
        {totalPagesNowShowing > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalPagesNowShowing }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToPageNowShowing(index)}
                className={`transition-all duration-300 rounded-full ${currentPageNowShowing === index
                  ? 'w-8 h-2.5 bg-red-600'
                  : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                aria-label={`Trang ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Drag Hint */}
        {nowShowingMovies.length > 6 && (
          <p className="text-center text-gray-400 text-sm mt-4">
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
              Kéo để xem thêm phim
            </span>
          </p>
        )}
      </div>

      {/* 3. Phần Danh Sách Phim Sắp Chiếu */}
      {comingSoonMovies.length > 0 && (
        <div id="coming-soon" className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-10 bg-yellow-500 rounded-full" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Phim Sắp Chiếu
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {comingSoonMovies.length} bom tấn đang được mong chờ
                </p>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => scrollByAmountComingSoon('left')}
                className="w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center text-gray-600 hover:text-yellow-600 transition-all hover:scale-105 disabled:opacity-50"
                aria-label="Cuộn trái"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => scrollByAmountComingSoon('right')}
                className="w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center text-gray-600 hover:text-yellow-600 transition-all hover:scale-105 disabled:opacity-50"
                aria-label="Cuộn phải"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <a
                href="/movies?status=coming_soon"
                className="ml-2 text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1 transition-colors"
              >
                Xem tất cả
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Movies Horizontal Scroll Container */}
          <div className="relative">
            {/* Gradient Overlays for visual scroll hint */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-100 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-100 to-transparent z-10 pointer-events-none" />

            {/* Scrollable Container */}
            <div
              ref={scrollContainerComingSoonRef}
              onMouseDown={handleMouseDownComingSoon}
              onMouseUp={handleMouseUpComingSoon}
              onMouseMove={handleMouseMoveComingSoon}
              onMouseLeave={handleMouseLeaveComingSoon}
              onScroll={handleScrollComingSoon}
              className="flex gap-5 overflow-x-auto pb-4 scroll-smooth scrollbar-hide select-none"
              style={{
                cursor: 'grab',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {comingSoonMovies.map((movie) => (
                <div
                  key={movie._id}
                  className="flex-shrink-0 w-[calc((100%-100px)/6)]"
                  style={{ minWidth: '180px', maxWidth: '220px' }}
                >
                  {/* Coming Soon Movie Card */}
                  <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group">
                    <div className="relative aspect-[2/3] overflow-hidden">
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        draggable={false}
                      />

                      {/* Coming Soon Badge */}
                      <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2.5 py-1 rounded-lg shadow-md">
                        SẮP CHIẾU
                      </div>

                      {/* Overlay khi hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-6">
                        <a
                          href={`/movie/${movie._id}`}
                          className="bg-yellow-500 text-black px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-yellow-400 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
                        >
                          XEM CHI TIẾT
                        </a>
                      </div>
                    </div>

                    {/* Thông tin phim */}
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-gray-900 truncate leading-tight group-hover:text-yellow-600 transition-colors">
                        {movie.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1 text-yellow-600 font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatReleaseDate(movie.release_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Dots */}
          {totalPagesComingSoon > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPagesComingSoon }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToPageComingSoon(index)}
                  className={`transition-all duration-300 rounded-full ${currentPageComingSoon === index
                    ? 'w-8 h-2.5 bg-yellow-500'
                    : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                    }`}
                  aria-label={`Trang ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Drag Hint */}
          {comingSoonMovies.length > 6 && (
            <p className="text-center text-gray-400 text-sm mt-4">
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                Kéo để xem thêm phim
              </span>
            </p>
          )}
        </div>
      )}

      {/* 4. Phần Lịch Chiếu Phim Tích Hợp */}
      <ShowtimesSection />

      {/* 5. Phần Khuyến Mãi */}
      <PromotionsSection />

      {/* 6. Hệ Thống Rạp Đối Tác */}
      <CinemaPartnersSection />
    </main>
  );
}
