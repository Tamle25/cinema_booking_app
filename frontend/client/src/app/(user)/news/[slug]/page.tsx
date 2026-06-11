'use client';

import SafeImage from '@/components/SafeImage';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INews } from '@/types';

export default function NewsDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [news, setNews] = useState<INews | null>(null);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`${API_URL}/news/slug/${slug}`);
        if (!res.ok) {
          setNews(null);
          return;
        }
        const data = await res.json();
        setNews(data);
      } catch (error) {
        console.error('Lỗi tải chi tiết tin tức:', error);
        setNews(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchNews();
    }
  }, [API_URL, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700">Không tìm thấy bài viết</p>
          <Link href="/news" className="inline-flex mt-4 text-red-600 font-medium hover:text-red-700">
            Quay lại danh sách tin tức
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <Link href="/news" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Danh sách tin tức
        </Link>

        <div className="mt-5 bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100">
          <div className="p-6 md:p-8">
            <p className="text-sm text-red-600 font-semibold">Đăng ngày {new Date(news.createdAt).toLocaleDateString('vi-VN')}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3 leading-tight">{news.title}</h1>
          </div>

          {news.thumbnail ? (
            <div className="px-6 md:px-8 pb-6">
              <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-gray-100">
                <SafeImage
                  src={news.thumbnail.startsWith('/') ? `${API_URL}${news.thumbnail}` : news.thumbnail}
                  alt={news.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : null}

          <div className="px-6 md:px-8 pb-8">
            <p className="text-lg text-gray-600 leading-8">{news.shortDescription}</p>
            <div className="mt-6 h-px bg-gray-100" />
            <div 
              className="rich-content-container mt-6 text-gray-800 leading-8"
              dangerouslySetInnerHTML={{
                __html: news.content.replace(/src="\/uploads\//g, `src="${API_URL}/uploads/`)
              }}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
