'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authHeaders, API_URL } from '@/lib/api';
import { toastSuccess, toastWarning, toastError } from '@/utils/toast';
import { IGenre } from '@/types/index';

export default function EditMoviePage() {
  const router = useRouter();
  const params = useParams();
  const movieId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genresList, setGenresList] = useState<IGenre[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [genreSearch, setGenreSearch] = useState('');

  const [formData, setFormData] = useState<{
    title: string;
    slug: string;
    description: string;
    poster_url: string;
    banner_url: string;
    trailer_url: string;
    genres: string[];
    duration: number;
    release_date: string;
    is_active: boolean;
  }>({
    title: '',
    slug: '',
    description: '',
    poster_url: '',
    banner_url: '',
    trailer_url: '',
    genres: [],
    duration: 0,
    release_date: '',
    is_active: true
  });
  const [movieRating, setMovieRating] = useState(0);
  const [movieReviewCount, setMovieReviewCount] = useState(0);

  // Fetch active genres list
  const fetchActiveGenres = async () => {
    try {
      const res = await fetch(`${API_URL}/genres/active`);
      if (!res.ok) throw new Error('Không tải được danh sách thể loại');
      const data = await res.json();
      setGenresList(data);
    } catch (error) {
      console.error('Lỗi tải thể loại:', error);
    }
  };

  // Load dữ liệu phim hiện tại
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        await fetchActiveGenres();
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
            genres: movie.genres ? movie.genres.map((g: any) => g._id || g) : [],
            duration: movie.duration || 0,
            release_date: releaseDate,
            is_active: movie.is_active ?? true
          });
          setMovieRating(movie.rating || 0);
          setMovieReviewCount(movie.review_count || 0);
        } else {
          toastError('❌ Không tìm thấy phim!');
          router.push('/admin/movies');
        }
      } catch (error) {
        console.error('Lỗi kết nối:', error);
        toastError('❌ Không thể kết nối đến server!');
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

  const handleGenreToggle = (genreId: string) => {
    setFormData(prev => {
      const isSelected = prev.genres.includes(genreId);
      const newGenres = isSelected
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId];
      return { ...prev, genres: newGenres };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate trước khi gửi
    if (!formData.title.trim()) {
      toastWarning('❌ Vui lòng nhập tên phim!');
      return;
    }
    if (!formData.slug.trim()) {
      toastWarning('❌ Vui lòng nhập slug!');
      return;
    }
    if (formData.genres.length === 0) {
      toastWarning('❌ Vui lòng chọn ít nhất một thể loại phim!');
      return;
    }
    if (!formData.duration || formData.duration <= 0) {
      toastWarning('❌ Vui lòng nhập thời lượng phim hợp lệ!');
      return;
    }
    if (!formData.release_date) {
      toastWarning('❌ Vui lòng chọn ngày công chiếu!');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/movies/${movieId}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toastSuccess('✅ Cập nhật phim thành công!');
        router.push('/admin/movies');
      } else {
        const errorData = await res.json();
        // Xử lý lỗi validation từ backend
        if (errorData.message && Array.isArray(errorData.message)) {
          toastError('❌ Lỗi: ' + errorData.message.join('\n'));
        } else if (errorData.message) {
          toastError('❌ Lỗi: ' + errorData.message);
        } else {
          toastError('❌ Có lỗi xảy ra khi cập nhật phim!');
        }
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      toastError('❌ Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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

        {/* Hàng 3: Thể loại & Thời lượng & Rating */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Thể loại (Multi-Select) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thể loại phim <span className="text-red-500">*</span>
            </label>
            
            {/* Display Box */}
            <div 
              className="min-h-[42px] w-full border border-gray-300 p-1.5 rounded flex flex-wrap gap-2 items-center bg-white cursor-pointer" 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {formData.genres.length === 0 ? (
                <span className="text-gray-400 text-sm pl-2">Chọn thể loại...</span>
              ) : (
                formData.genres.map(genreId => {
                  const genre = genresList.find(g => g._id === genreId);
                  return (
                    <span 
                      key={genreId} 
                      className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded"
                    >
                      {genre?.name || 'Unknown'}
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800 font-bold focus:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenreToggle(genreId);
                        }}
                      >
                        &times;
                      </button>
                    </span>
                  );
                })
              )}
              
              <div className="ml-auto pr-2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Dropdown Options */}
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                <div className="absolute left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-20 max-h-60 overflow-y-auto p-2">
                  <input
                    type="text"
                    placeholder="Tìm thể loại..."
                    value={genreSearch}
                    onChange={(e) => setGenreSearch(e.target.value)}
                    className="w-full border border-gray-300 p-1.5 rounded mb-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="space-y-1">
                    {genresList
                      .filter(g => g.name.toLowerCase().includes(genreSearch.toLowerCase()))
                      .map(g => {
                        const isChecked = formData.genres.includes(g._id);
                        return (
                          <label
                            key={g._id}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer text-sm text-gray-900"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleGenreToggle(g._id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            {g.name}
                          </label>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
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
