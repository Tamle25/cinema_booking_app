'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { INews } from '@/types';

export default function NewsListPage() {
  const [newsList, setNewsList] = useState<INews[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
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

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  const visibleNews = newsList.slice(0, visibleCount);
  const hasMore = visibleCount < newsList.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-18">
          <p className="text-red-300 text-sm font-medium uppercase tracking-[0.2em]">Tin tức CineMax</p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mt-3">Cập nhật phim, rạp và ưu đãi mới</h1>
          <p className="text-gray-300 mt-4 max-w-2xl">
            Tổng hợp bài viết mới nhất đã được xuất bản trên hệ thống. Chỉ hiển thị những nội dung sẵn sàng cho người dùng.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {loading ? (
          <div className="flex flex-col gap-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="w-full md:w-1/3 aspect-[4/3] bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-4 py-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-6 bg-gray-200 rounded w-3/4 mt-2" />
                  <div className="space-y-2 mt-4">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-4/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : newsList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center">
            <p className="text-xl font-semibold text-gray-700">Chưa có tin tức được xuất bản</p>
            <p className="text-gray-400 mt-2">Khi admin xuất bản bài viết mới, danh sách này sẽ tự động cập nhật.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {visibleNews.map((news) => (
              <article key={news._id} className="group flex flex-col md:flex-row gap-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                <div className="w-full md:w-[35%] lg:w-[30%] aspect-[16/10] md:aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                  {news.thumbnail ? (
                    <img
                      src={news.thumbnail.startsWith('/') ? `${API_URL}${news.thumbnail}` : news.thumbnail}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Chưa có ảnh
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Mới
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center py-2 md:py-4">
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                    <span className="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(news.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  
                  <Link href={`/news/${news.slug}`} className="block group-hover:text-red-600 transition-colors">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight line-clamp-2 mb-3">
                      {news.title}
                    </h2>
                  </Link>
                  
                  <p className="text-gray-600 leading-relaxed line-clamp-3 mb-5">
                    {news.shortDescription}
                  </p>
                  
                  <div className="mt-auto">
                    <Link
                      href={`/news/${news.slug}`}
                      className="inline-flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors group/link"
                    >
                      Đọc tiếp
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </article>
            ))}

            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleLoadMore}
                  className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:text-red-600 hover:border-red-600 px-8 py-3 rounded-xl font-medium transition-colors shadow-sm"
                >
                  Xem thêm tin tức
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
