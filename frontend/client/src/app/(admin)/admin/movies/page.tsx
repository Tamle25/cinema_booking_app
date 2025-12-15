"use client"; // Báo hiệu đây là Client Component (để dùng được useEffect)

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

// Định nghĩa kiểu dữ liệu cho Phim (giống bên Backend)
interface Movie {
  _id: string;
  title: string;
  poster_url: string;
  release_date: string;
  duration: number;
}

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]); // Biến chứa danh sách phim
  const [loading, setLoading] = useState(true);

  // Hàm gọi API lấy danh sách phim
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        // Gọi vào API NestJS đang chạy ở cổng 4000
        const res = await axios.get("http://localhost:4000/movies");
        setMovies(res.data);
      } catch (error) {
        console.error("Lỗi tải phim:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) return <div className="p-5">Đang tải dữ liệu...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Quản Lý Phim</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            + Thêm Phim Mới
          </button>
        </div>

        {/* Bảng danh sách phim */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full leading-normal">
            <thead>
              <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hình ảnh
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tên Phim
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Thời lượng
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Ngày chiếu
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {movies.map((movie) => (
                <tr key={movie._id}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 font-bold whitespace-no-wrap">
                      {movie.title}
                    </p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">
                      {movie.duration} phút
                    </p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">
                      {new Date(movie.release_date).toLocaleDateString("vi-VN")}
                    </p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <span className="relative inline-block px-3 py-1 font-semibold text-green-900 leading-tight cursor-pointer hover:text-green-600">
                      Sửa
                    </span>
                    <span className="relative inline-block px-3 py-1 font-semibold text-red-900 leading-tight cursor-pointer hover:text-red-600 ml-2">
                      Xóa
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
