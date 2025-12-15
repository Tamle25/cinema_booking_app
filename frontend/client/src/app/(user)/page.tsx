"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import MovieCard from "@/components/MovieCard";

// Định nghĩa kiểu dữ liệu (phải khớp với Backend)
interface Movie {
  _id: string;
  title: string;
  poster_url: string;
  duration: number;
  release_date: string;
  rating: number;
}

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);

  // Gọi API lấy danh sách phim
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await axios.get("http://localhost:4000/movies");
        setMovies(res.data);
      } catch (error) {
        console.error("Lỗi tải phim:", error);
      }
    };
    fetchMovies();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 1. Phần Banner Quảng Cáo (Header giả lập) */}
      <div className="w-full h-64 bg-gray-900 flex items-center justify-center text-white">
        <h1 className="text-4xl font-bold">Đặt Vé Xem Phim Online</h1>
      </div>

      {/* 2. Phần Danh Sách Phim */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-red-600 pl-3">
            PHIM ĐANG CHIẾU
          </h2>
          <a href="#" className="text-red-600 hover:underline">
            Xem tất cả &rarr;
          </a>
        </div>

        {/* Lưới phim (Grid): Chia cột tự động theo màn hình */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {movies.length > 0 ? (
            movies.map((movie) => <MovieCard key={movie._id} movie={movie} />)
          ) : (
            <p className="text-gray-500 text-center col-span-4">
              Đang tải danh sách phim...
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
