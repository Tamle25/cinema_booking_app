'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditMoviePage() {
  const router = useRouter();
  const params = useParams();
  const movieId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    poster_url: '',
    banner_url: '',
    trailer_url: '',
    genre: '',
    duration: 0,
    release_date: '',
    is_active: true
  });
  const [movieRating, setMovieRating] = useState(0);
  const [movieReviewCount, setMovieReviewCount] = useState(0);

  // Load dữ liệu phim hiện tại
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await fetch(`${API_URL}/movies/${movieId}`);
        if (res.ok) {
          const movie = await res.json();
          // Format lại ngày để hiển thị trong input[type="date"]
          const releaseDate = movie.release_date
            ? new Date(movie.release_date).toISOString().split('T')[0]
            : '';

          setFormData({
            title: movie.title || '',
            slug: movie.slug || '',
            description: movie.description || '',
            poster_url: movie.poster_url || '',
            banner_url: movie.banner_url || '',
            trailer_url: movie.trailer_url || '',
            genre: movie.genre || '',
            duration: movie.duration || 0,
            release_date: releaseDate,
            is_active: movie.is_active ?? true
          });
          setMovieRating(movie.rating || 0);
          setMovieReviewCount(movie.review_count || 0);
        } else {
          alert('❌ Không tìm thấy phim!');
          router.push('/admin/movies');
        }
      } catch (error) {
        console.error('Lỗi kết nối:', error);
        alert('❌ Không thể kết nối đến server!');
      } finally {
        setIsLoading(false);
      }
    };

    if (movieId) {
      fetchMovie();
    }
  }, [movieId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Chuyển đổi số cho đúng kiểu dữ liệu
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate trước khi gửi
    if (!formData.title.trim()) {
      alert('❌ Vui lòng nhập tên phim!');
      return;
    }
    if (!formData.slug.trim()) {
      alert('❌ Vui lòng nhập slug!');
      return;
    }
    if (!formData.genre.trim()) {
      alert('❌ Vui lòng nhập thể loại!');
      return;
    }
    if (!formData.duration || formData.duration <= 0) {
      alert('❌ Vui lòng nhập thời lượng phim hợp lệ!');
      return;
    }
    if (!formData.release_date) {
      alert('❌ Vui lòng chọn ngày công chiếu!');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/movies/${movieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('✅ Cập nhật phim thành công!');
        router.push('/admin/movies');
      } else {
        const errorData = await res.json();
        // Xử lý lỗi validation từ backend
        if (errorData.message && Array.isArray(errorData.message)) {
          alert('❌ Lỗi: ' + errorData.message.join('\n'));
        } else if (errorData.message) {
          alert('❌ Lỗi: ' + errorData.message);
        } else {
          alert('❌ Có lỗi xảy ra khi cập nhật phim!');
        }
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      alert('❌ Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Đang tải thông tin phim...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Sửa Thông Tin Phim</h1>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">

        {/* Hàng 1: Tên phim & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên phim</label>
            <input
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
              placeholder="Ví dụ: Đào, Phở và Piano"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
            <input
              name="slug"
              required
              value={formData.slug}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
              placeholder="dao-pho-va-piano"
            />
          </div>
        </div>

        {/* Hàng 2: URL Hình ảnh */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poster URL</label>
            <input
              name="poster_url"
              required
              value={formData.poster_url}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-400"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banner URL</label>
            <input
              name="banner_url"
              value={formData.banner_url}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-400"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Hàng 3: Chi tiết phim */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thể loại</label>
            <input
              name="genre"
              required
              value={formData.genre}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-400"
              placeholder="Hành động, Tình cảm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng (phút)</label>
            <input
              type="number"
              name="duration"
              required
              value={formData.duration || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-400"
              placeholder="120"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating (tự động)</label>
            <div className="w-full border border-gray-200 bg-gray-50 p-2 rounded flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-bold text-gray-900">{movieRating}</span>
              <span className="text-gray-400 text-sm">({movieReviewCount} đánh giá)</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Rating được tính tự động từ đánh giá của người dùng</p>
          </div>
        </div>

        {/* Hàng 4: Ngày chiếu & Trailer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày công chiếu</label>
            <input
              type="date"
              name="release_date"
              required
              value={formData.release_date}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trailer URL (Youtube)</label>
            <input
              name="trailer_url"
              value={formData.trailer_url}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-400"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        </div>

        {/* Mô tả */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả phim</label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-400"
            placeholder="Nhập mô tả nội dung phim..."
          ></textarea>
        </div>

        {/* Nút Submit */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.push('/admin/movies')}
            className="font-bold py-3 px-8 rounded transition border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`font-bold py-3 px-8 rounded transition shadow-lg ${isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
          >
            {isSubmitting ? 'Đang lưu...' : 'Cập nhật Phim'}
          </button>
        </div>
      </form>
    </div>
  );
}
