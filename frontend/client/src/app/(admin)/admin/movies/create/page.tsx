'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authHeaders, API_URL } from '@/lib/api';
import { toastSuccess, toastWarning, toastError } from '@/utils/toast';
import { IGenre } from '@/types/index';
import MovieImageUpload, { UploadedMovieImage } from '@/components/admin/MovieImageUpload';

export default function CreateMoviePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genresList, setGenresList] = useState<IGenre[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [genreSearch, setGenreSearch] = useState('');
  const [isPosterUploading, setIsPosterUploading] = useState(false);
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  
  const [formData, setFormData] = useState<{
    title: string;
    slug: string;
    description: string;
    poster_url: string;
    poster_public_id: string;
    banner_url: string;
    banner_public_id: string;
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
    poster_public_id: '',
    banner_url: '',
    banner_public_id: '',
    trailer_url: '',
    genres: [],
    duration: 0,
    release_date: '',
    is_active: true
  });

  useEffect(() => {
    const fetchActiveGenres = async () => {
      try {
        const res = await fetch(`${API_URL}/genres/active`);
        if (!res.ok) throw new Error('Không tải được danh sách thể loại');
        const data = await res.json();
        setGenresList(data);
      } catch (error) {
        console.error('Lỗi tải thể loại:', error);
        toastError('Không tải được danh sách thể loại');
      }
    };
    fetchActiveGenres();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
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

  const handleMovieImageUploaded = (type: 'poster' | 'banner', image: UploadedMovieImage) => {
    setFormData(prev => ({
      ...prev,
      ...(type === 'poster'
        ? {
            poster_url: image.secure_url,
            poster_public_id: image.public_id,
          }
        : {
            banner_url: image.secure_url,
            banner_public_id: image.public_id,
          }),
    }));
  };

  const handleMovieImageUploadingChange = (type: 'poster' | 'banner', isUploading: boolean) => {
    if (type === 'poster') {
      setIsPosterUploading(isUploading);
      return;
    }

    setIsBannerUploading(isUploading);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toastWarning('Vui lòng nhập tên phim!');
      return;
    }
    if (!formData.slug.trim()) {
      toastWarning('Vui lòng nhập slug!');
      return;
    }
    if (!formData.poster_url) {
      toastWarning('Vui long upload poster phim!');
      return;
    }
    if (isPosterUploading || isBannerUploading) {
      toastWarning('Vui long doi upload anh hoan tat truoc khi luu phim!');
      return;
    }
    if (formData.genres.length === 0) {
      toastWarning('Vui lòng chọn ít nhất một thể loại phim!');
      return;
    }
    if (!formData.duration || formData.duration <= 0) {
      toastWarning('Vui lòng nhập thời lượng phim hợp lệ!');
      return;
    }
    if (!formData.release_date) {
      toastWarning('Vui lòng chọn ngày công chiếu!');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/movies`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toastSuccess('Thêm phim thành công!');
        router.push('/admin/movies');
      } else {
        const errorData = await res.json();
        if (errorData.message && Array.isArray(errorData.message)) {
          toastError('Lỗi: ' + errorData.message.join('\n'));
        } else if (errorData.message) {
          toastError('Lỗi: ' + errorData.message);
        } else {
          toastError('Có lỗi xảy ra khi tạo phim!');
        }
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      toastError('Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Thêm Phim Mới</h1>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">

        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên phim</label>
            <input name="title" required onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400" placeholder="Ví dụ: Đào, Phở và Piano" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
            <input name="slug" required onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400" placeholder="dao-pho-va-piano" />
          </div>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <MovieImageUpload
              type="poster"
              label="Poster"
              value={formData.poster_url}
              required
              onUploaded={handleMovieImageUploaded}
              onUploadingChange={handleMovieImageUploadingChange}
            />
          </div>
          <div>
            <MovieImageUpload
              type="banner"
              label="Banner"
              value={formData.banner_url}
              onUploaded={handleMovieImageUploaded}
              onUploadingChange={handleMovieImageUploadingChange}
            />
          </div>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thể loại phim <span className="text-red-500">*</span>
            </label>
            
            
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
            <input type="number" name="duration" required onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-400" placeholder="120" />
          </div>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày công chiếu</label>
            <input type="date" name="release_date" required onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trailer URL (Youtube)</label>
            <input name="trailer_url" onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-400" placeholder="https://youtube.com/watch?v=..." />
          </div>
        </div>

        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả phim</label>
          <textarea name="description" rows={4} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-400" placeholder="Nhập mô tả nội dung phim..."></textarea>
        </div>

        
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting || isPosterUploading || isBannerUploading}
            className={`font-bold py-3 px-8 rounded transition shadow-lg ${isSubmitting || isPosterUploading || isBannerUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu Phim'}
          </button>
        </div>
      </form>
    </div>
  );
}
