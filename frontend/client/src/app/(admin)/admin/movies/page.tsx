'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { IMovie } from '@/types/index';
import Pagination from '@/components/Pagination';

export default function MovieListPage() {
  const [movies, setMovies] = useState<IMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch movies
  const fetchMovies = async () => {
    try {
      const res = await fetch(`${API_URL}/movies`);
      if (!res.ok) throw new Error('Không tải được phim');
      
      // Backend (đã thêm Virtuals) sẽ trả về field 'status' trong JSON
      const data = await res.json(); 
      setMovies(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Delete movie
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa phim "${title}"?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/movies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Xóa phim thành công!');
        fetchMovies();
      } else {
        alert('Xóa thất bại');
      }
    } catch (error) {
      alert('Xóa thất bại');
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  // Get unique genres
  const uniqueGenres = [...new Set(movies.map(m => m.genre).filter(Boolean))];

  // Filter movies
  const filteredMovies = movies.filter(movie => {
    const matchSearch = movie.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGenre = !filterGenre || movie.genre === filterGenre;
    const matchStatus = !filterStatus || 
      (filterStatus === 'active' && movie.is_active) ||
      (filterStatus === 'inactive' && !movie.is_active);
    return matchSearch && matchGenre && matchStatus;
  });

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGenre, filterStatus]);

  // Phân trang
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
  const paginatedMovies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMovies.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMovies, currentPage, itemsPerPage]);

  // --- HÀM QUAN TRỌNG ĐÃ ĐƯỢC SỬA ---
  const getMovieStatus = (movie: IMovie) => {
    if (!movie.is_active) {
      return { label: 'Ngưng chiếu', color: 'bg-gray-100 text-gray-600' };
    }

    // ƯU TIÊN 1: Dùng status từ Backend gửi về (Chính xác nhất)
    if (movie.status) {
        if (movie.status === 'Đang chiếu') {
            return { label: 'Đang chiếu', color: 'bg-green-100 text-green-700' };
        }
        if (movie.status === 'Sắp chiếu') {
            return { label: 'Sắp chiếu', color: 'bg-yellow-100 text-yellow-700' };
        }
    }

    // ƯU TIÊN 2: Fallback (Phòng hờ backend chưa update, tính theo giờ trình duyệt)
    const releaseDate = new Date(movie.release_date);
    const now = new Date(); // Dùng full time, không setHours để chính xác từng phút
    
    if (releaseDate > now) {
      return { label: 'Sắp chiếu', color: 'bg-yellow-100 text-yellow-700' };
    }
    return { label: 'Đang chiếu', color: 'bg-green-100 text-green-700' };
  };
  // -----------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Phim</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý danh sách phim trong hệ thống</p>
        </div>
        <Link 
          href="/admin/movies/create"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm phim mới
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm phim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Tất cả thể loại</option>
            {uniqueGenres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngưng hoạt động</option>
          </select>
          <span className="text-sm text-gray-500 min-w-[120px] text-right whitespace-nowrap">
            Tổng: <strong>{filteredMovies.length}</strong> phim
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-[30%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phim</th>
                <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thể loại</th>
                <th className="w-[12%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời lượng</th>
                <th className="w-[12%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Đánh giá</th>
                <th className="w-[15%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="w-[16%] px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedMovies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm || filterGenre || filterStatus ? 'Không tìm thấy phim phù hợp' : 'Chưa có phim nào'}
                </td>
              </tr>
            ) : (
              paginatedMovies.map((movie) => {
                const status = getMovieStatus(movie);
                return (
                  <tr key={movie._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={movie.poster_url} 
                          alt={movie.title}
                          className="w-12 h-16 object-cover rounded shadow-sm" 
                        />
                        <div>
                          <p className="font-semibold text-gray-800">{movie.title}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(movie.release_date).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{movie.genre}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-700">{movie.duration} phút</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                          ★ {movie.rating || 0}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {movie.review_count || 0} đánh giá
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {/* Badge trạng thái */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admin/movies/edit/${movie._id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Sửa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(movie._id, movie.title)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Xóa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredMovies.length}
          itemsPerPage={itemsPerPage}
          onLimitChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1); // Reset vế trang 1 khi đổi limit
          }}
        />
      </div>
    </div>
  );
}