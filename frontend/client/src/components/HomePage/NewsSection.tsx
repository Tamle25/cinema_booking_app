'use client';

import SafeImage from '@/components/SafeImage';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { INews } from '@/types';

export default function NewsSection() {
  const [newsList, setNewsList] = useState<INews[]>([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`${API_URL}/news`);
        const data = await res.json();
        setNewsList(Array.isArray(data) ? data.slice(0, 3) : []);
      } catch (error) {
        console.error('Lỗi tải tin tức:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [API_URL]);

  if (!loading && newsList.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-10 bg-red-600 rounded-full" />
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Tin Tức & Ưu Đãi
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Cập nhật thông tin điện ảnh và khuyến mãi mới nhất
              </p>
            </div>
          </div>
          <Link
            href="/news"
            className="hidden md:flex text-red-600 hover:text-red-700 font-medium items-center gap-1 transition-colors"
          >
            Tất cả tin tức
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                <div className="aspect-[16/10] bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {newsList.map((news) => (
              <article key={news._id} className="group bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 cursor-pointer">
                  <Link href={`/news/${news.slug}`} className="absolute inset-0 z-10" aria-label={news.title}></Link>
                  {news.thumbnail ? (
                    <SafeImage
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
                
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-sm text-gray-400 mb-2">
                    {new Date(news.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                  
                  <Link href={`/news/${news.slug}`} className="block group-hover:text-red-600 transition-colors">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2 min-h-[3.5rem] mb-3 leading-tight">
                      {news.title}
                    </h3>
                  </Link>
                  
                  <p className="text-gray-600 line-clamp-3 mb-5 leading-relaxed flex-1">
                    {news.shortDescription}
                  </p>
                  
                  <Link
                    href={`/news/${news.slug}`}
                    className="inline-flex items-center justify-center w-full py-2.5 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors mt-auto"
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        
        <div className="mt-8 flex justify-center md:hidden">
          <Link
            href="/news"
            className="inline-flex items-center bg-gray-900 hover:bg-red-600 text-white px-8 py-3 rounded-full font-semibold transition-colors duration-300 shadow-md"
          >
            Xem thêm tin tức
          </Link>
        </div>
      </div>
    </section>
  );
}
