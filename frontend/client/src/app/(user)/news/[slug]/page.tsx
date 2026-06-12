'use client';

import SafeImage from '@/components/SafeImage';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INews } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { toastSuccess, toastWarning, toastError } from '@/utils/toast';

export default function NewsDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [news, setNews] = useState<INews | null>(null);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);

  const { user } = useAuth();
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

  const handleToggleLike = async () => {
    if (!user) {
      toastWarning('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    if (!news) return;

    setLikeLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/news/${news._id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Lỗi phản hồi từ server khi thích bài viết');
      }

      const data = await res.json(); // Trả về { liked: boolean, likesCount: number }
      
      const currentUserId = user._id || user.id || '';
      let updatedLikedUsers = [...(news.likedUsers || [])];

      if (data.liked) {
        if (!updatedLikedUsers.includes(currentUserId)) {
          updatedLikedUsers.push(currentUserId);
        }
        toastSuccess('Đã thêm bài viết vào mục yêu thích');
      } else {
        updatedLikedUsers = updatedLikedUsers.filter((id) => id !== currentUserId);
        toastSuccess('Đã xóa bài viết khỏi mục yêu thích');
      }

      // Cập nhật state để phản ánh thay đổi ngay lập tức trên UI
      setNews({
        ...news,
        likedUsers: updatedLikedUsers,
        likesCount: data.likesCount,
      });
    } catch (error) {
      console.error(error);
      toastError('Có lỗi xảy ra, vui lòng thử lại sau');
    } finally {
      setLikeLoading(false);
    }
  };

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
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xl font-bold text-gray-800">Không tìm thấy bài viết</p>
          <p className="text-gray-400 text-sm mt-1">Đường dẫn không tồn tại hoặc bài viết đã bị gỡ bỏ.</p>
          <Link
            href="/news"
            className="inline-flex mt-6 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm"
          >
            Quay lại tin tức
          </Link>
        </div>
      </div>
    );
  }

  const currentUserId = user?._id || user?.id || '';
  const isLiked = news.likedUsers?.includes(currentUserId);
  const likesCount = news.likesCount || 0;

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 md:py-12">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Nút quay lại danh sách bài viết */}
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors group mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Danh sách tin tức
        </Link>

        {/* Khung bài viết chính */}
        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100">
          
          {/* Header bài viết */}
          <div className="p-6 md:p-10 relative pr-24 md:pr-28 border-b border-gray-50">
            {/* Tag danh mục */}
            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider mb-3 shadow-sm ${
              news.category === 'promotion' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
            }`}>
              {news.category === 'promotion' ? 'Khuyến mãi' : 'Điện ảnh'}
            </span>
            
            <p className="text-xs text-gray-400 font-semibold mb-2">
              Đăng ngày {new Date(news.createdAt).toLocaleDateString('vi-VN')}
            </p>
            
            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              {news.title}
            </h1>

            {/* Nút thích hình trái tim góc phải */}
            <button
              onClick={handleToggleLike}
              disabled={likeLoading}
              title={isLiked ? 'Bỏ yêu thích' : 'Yêu thích bài viết'}
              className={`absolute top-6 right-6 md:top-10 md:right-10 flex items-center gap-1.5 px-4 py-2 rounded-full border shadow-sm transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] ${
                isLiked
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100/70'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
              }`}
            >
              {isLiked ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              <span className="text-sm font-bold">{likesCount}</span>
            </button>
          </div>

          {/* Ảnh đại diện bài viết */}
          {news.thumbnail ? (
            <div className="px-6 md:px-10 pt-6 md:pt-8">
              <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-gray-100 border border-gray-100 shadow-sm">
                <SafeImage
                  src={news.thumbnail.startsWith('/') ? `${API_URL}${news.thumbnail}` : news.thumbnail}
                  alt={news.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : null}

          {/* Nội dung bài viết */}
          <div className="p-6 md:p-10">
            {/* Mô tả ngắn */}
            <p className="text-base md:text-lg font-medium text-gray-700 leading-relaxed bg-gray-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-6">
              {news.shortDescription}
            </p>
            
            <div className="h-px bg-gray-100 my-6" />
            
            {/* Nội dung chi tiết */}
            <div 
              className="rich-content-container text-gray-800 leading-relaxed md:text-base space-y-4"
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
