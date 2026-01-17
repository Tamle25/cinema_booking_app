'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IMovie } from '@/types/index'; // Import từ file bạn tạo ở Bước 1

export default function MovieListPage() {
  const [movies, setMovies] = useState<IMovie[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Hàm lấy dữ liệu
  const fetchMovies = async () => {
    try {
      const res = await fetch('http://localhost:4000/movies'); // Đảm bảo Port đúng với Backend
      if (!res.ok) throw new Error('Không tải được phim');
      const data = await res.json();
      setMovies(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Hàm xóa phim
  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa phim này?')) return;
    
    try {
      await fetch(`http://localhost:5000/movies/${id}`, { method: 'DELETE' });
      // Xóa xong thì load lại danh sách
      fetchMovies();
    } catch (error) {
      alert('Xóa thất bại');
    }
  };

  // Chạy lần đầu khi vào trang
  useEffect(() => {
    fetchMovies();
  }, []);

  if (loading) return <div>Đang tải dữ liệu...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Danh sách Phim</h1>
        <Link 
          href="/admin/movies/create" 
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium shadow"
        >
          + Thêm Phim Mới
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poster</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thông tin</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Đánh giá</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {movies.map((movie) => (
              <tr key={movie._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <img src={movie.poster_url} alt="" className="h-16 w-12 object-cover rounded shadow-sm" />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">{movie.title}</div>
                  <div className="text-sm text-gray-500">{movie.genre} • {movie.duration} phút</div>
                  <div className="text-xs text-blue-500 mt-1">{new Date(movie.release_date).toLocaleDateString('vi-VN')}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">
                    ★ {movie.rating}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => handleDelete(movie._id)}
                    className="text-red-600 hover:text-red-900 font-medium transition"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}