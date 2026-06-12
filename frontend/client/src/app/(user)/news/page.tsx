'use client';

import SafeImage from '@/components/SafeImage';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { INews } from '@/types';
import { useAuth } from '@/context/AuthContext';

// Helper ngoài component để tránh re-declaration và giữ JSX sạch sẽ
const getFilteredAndSortedNews = (
  list: INews[],
  category: 'all' | 'promotion' | 'cinema',
  sortBy: 'latest' | 'popular'
): INews[] => {
  // 1. Lọc theo danh mục
  let result = [...list];
  if (category !== 'all') {
    result = result.filter((item) => item.category === category);
  }

  // 2. Sắp xếp
  if (sortBy === 'latest') {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortBy === 'popular') {
    result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  }

  return result;
};

export default function NewsListPage() {
  const [newsList, setNewsList] = useState<INews[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State lọc và sắp xếp
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'promotion' | 'cinema'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [visibleCount, setVisibleCount] = useState(10);
  
  const { user } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`${API_URL}/news`);
        const data = await res.json();
        setNewsList(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Lỗi tải danh sách tin tức:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [API_URL]);

  // Reset phân trang về 10 khi đổi bộ lọc hoặc đổi sắp xếp
  const handleCategoryChange = (category: 'all' | 'promotion' | 'cinema') => {
    setSelectedCategory(category);
    setVisibleCount(10);
  };

  const handleSortChange = (sort: 'latest' | 'popular') => {
    setSortBy(sort);
    setVisibleCount(10);
  };

  // Tính số lượng bài viết cho từng danh mục (chỉ tính những bài đã published)
  const counts = useMemo(() => {
    const publishedNews = newsList.filter(n => n.isPublished !== false);
    return {
      all: publishedNews.length,
      promotion: publishedNews.filter((n) => n.category === 'promotion').length,
      cinema: publishedNews.filter((n) => n.category === 'cinema').length,
    };
  }, [newsList]);

  // Lấy danh sách tin tức đã qua bộ lọc & sắp xếp
  const processedNews = useMemo(() => {
    const publishedNews = newsList.filter(n => n.isPublished !== false);
    return getFilteredAndSortedNews(publishedNews, selectedCategory, sortBy);
  }, [newsList, selectedCategory, sortBy]);

  // Cắt mảng hiển thị theo số lượng phân trang
  const visibleNews = useMemo(() => {
    return processedNews.slice(0, visibleCount);
  }, [processedNews, visibleCount]);

  const hasMore = visibleCount < processedNews.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10); // Tăng thêm 10 bài mỗi lần bấm
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Banner đầu trang hoành tráng */}
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-red-950/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center md:text-left">
          <p className="text-red-500 text-sm font-semibold uppercase tracking-[0.25em] mb-3">
            BẢN TIN CINEMAX
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Thế Giới Điện Ảnh & Khuyến Mãi Hot
          </h1>
          <p className="text-gray-400 mt-4 max-w-2xl text-base md:text-lg leading-relaxed">
            Cập nhật những tin tức điện ảnh nóng hổi nhất, các sự kiện khai trương rạp hoành tráng và các chương trình ưu đãi bỏng nước siêu tiết kiệm.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Cột chính bên trái: Danh sách tin tức + Bộ lọc Sắp xếp */}
          <div className="flex-1">
            {/* Bộ lọc sắp xếp trên cùng */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-semibold text-gray-500">
                Hiển thị <span className="text-gray-900">{processedNews.length}</span> bài viết
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-gray-400 mr-2 hidden sm:inline">Sắp xếp:</span>
                <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => handleSortChange('latest')}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      sortBy === 'latest'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mới nhất
                  </button>
                  <button
                    onClick={() => handleSortChange('popular')}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      sortBy === 'popular'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Yêu thích nhất
                  </button>
                </div>
              </div>
            </div>

            {/* Loading skeleton */}
            {loading ? (
              <div className="flex flex-col gap-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
                    <div className="w-full md:w-[35%] aspect-[16/10] bg-gray-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-4 py-2">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                      <div className="h-6 bg-gray-200 rounded w-3/4" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-full" />
                        <div className="h-4 bg-gray-100 rounded w-5/6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : processedNews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2m-2 3h.01M5.5 12h.01M11 16h.01M9 16H5m7 0h3m-1-8h-1m-5 0h.01" />
                </svg>
                <p className="text-xl font-bold text-gray-700">Chưa có bài viết nào</p>
                <p className="text-gray-400 mt-2">Không tìm thấy tin tức trong danh mục hoặc bộ lọc này.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {visibleNews.map((news) => {
                  const currentUserId = user?._id || user?.id || '';
                  const hasLiked = news.likedUsers?.includes(currentUserId);
                  
                  return (
                    <article
                      key={news._id}
                      className="group flex flex-col md:flex-row gap-6 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border border-gray-100 hover:border-gray-200 transition-all duration-300"
                    >
                      {/* Ảnh bài viết */}
                      <div className="w-full md:w-[35%] aspect-[16/10] bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                        {news.thumbnail ? (
                          <SafeImage
                            src={news.thumbnail.startsWith('/') ? `${API_URL}${news.thumbnail}` : news.thumbnail}
                            alt={news.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium bg-gray-100 text-sm">
                            Chưa có ảnh đại diện
                          </div>
                        )}
                        {/* Nhãn danh mục */}
                        <div className="absolute top-3 left-3 shadow-md">
                          {news.category === 'promotion' ? (
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              Khuyến mãi
                            </span>
                          ) : (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              Điện ảnh
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nội dung card */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-xs text-gray-400 font-medium mb-2.5">
                            <span className="flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(news.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                            
                            {/* Số tim yêu thích */}
                            <span className="flex items-center gap-1">
                              {hasLiked ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              )}
                              <span className={hasLiked ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                                {news.likesCount || 0} lượt thích
                              </span>
                            </span>
                          </div>

                          {/* Tiêu đề */}
                          <Link href={`/news/${news.slug}`} className="block hover:text-red-600 transition-colors mb-2.5">
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-snug line-clamp-2">
                              {news.title}
                            </h2>
                          </Link>

                          {/* Mô tả ngắn */}
                          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 md:line-clamp-3">
                            {news.shortDescription}
                          </p>
                        </div>

                        {/* Nút đọc tiếp */}
                        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                          <Link
                            href={`/news/${news.slug}`}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700 transition-colors group/link"
                          >
                            Đọc tiếp
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {/* Nút xem thêm */}
                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleLoadMore}
                      className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-500 px-8 py-3.5 rounded-2xl font-bold transition-all shadow-sm hover:shadow-md"
                    >
                      Xem thêm bài viết
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cột bên phải: Sidebar danh mục (chuyển thành ngang trên mobile) */}
          <div className="w-full lg:w-80 shrink-0">
            {/* Sidebar cho Desktop */}
            <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-4 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Danh mục bài viết
              </h3>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left font-semibold text-sm transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-red-50 text-red-600 shadow-sm border-l-4 border-red-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2m-2 3h.01M5.5 12h.01M11 16h.01M9 16H5m7 0h3m-1-8h-1m-5 0h.01" />
                    </svg>
                    Tất cả tin tức
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${selectedCategory === 'all' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {counts.all}
                  </span>
                </button>

                <button
                  onClick={() => handleCategoryChange('cinema')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left font-semibold text-sm transition-all ${
                    selectedCategory === 'cinema'
                      ? 'bg-red-50 text-red-600 shadow-sm border-l-4 border-red-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                    Tin điện ảnh
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${selectedCategory === 'cinema' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {counts.cinema}
                  </span>
                </button>

                <button
                  onClick={() => handleCategoryChange('promotion')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left font-semibold text-sm transition-all ${
                    selectedCategory === 'promotion'
                      ? 'bg-red-50 text-red-600 shadow-sm border-l-4 border-red-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Tin khuyến mãi
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${selectedCategory === 'promotion' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {counts.promotion}
                  </span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
