"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // Hook để lấy ID từ URL
import axios from "axios";
import Link from "next/link";

// Thêm interface cho Rạp và Lịch chiếu
interface Cinema {
  _id: string;
  name: string;
}

interface Showtime {
  _id: string;
  cinema: Cinema; // Đã được populate từ backend
  start_time: string;
  room: string;
  price: number;
}

interface Movie {
  _id: string;
  title: string;
  description: string;
  poster_url: string;
  banner_url: string; // Ảnh nền to
  trailer_url: string;
  duration: number;
  release_date: string;
  rating: number;
}

export default function MovieDetailPage() {
  // 1. Lấy ID từ trên thanh địa chỉ (URL)
  const params = useParams();
  const movieId = params.id;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Gọi API lấy chi tiết phim
  useEffect(() => {
    if (!movieId) return;
    const fetchData = async () => {
      try {
        // Gọi cả 2 API cùng lúc (Promise.all giúp chạy nhanh hơn)
        const [resMovie, resShowtime] = await Promise.all([
          axios.get(`http://localhost:4000/movies/${movieId}`),
          axios.get(`http://localhost:4000/showtimes/movie/${movieId}`),
        ]);

        setMovie(resMovie.data);
        setShowtimes(resShowtime.data);
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [movieId]);

  if (loading) return <div className="text-center py-20">Đang tải phim...</div>;
  if (!movie)
    return <div className="text-center py-20">Không tìm thấy phim!</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* --- PHẦN 1: Banner & Thông tin chính --- */}
      <div
        className="relative h-[500px] bg-cover bg-center"
        style={{
          backgroundImage: `url(${movie.banner_url || movie.poster_url})`,
        }}
      >
        {/* Lớp phủ đen mờ để chữ dễ đọc hơn */}
        <div className="absolute inset-0 bg-black bg-opacity-70"></div>

        <div className="relative max-w-6xl mx-auto px-4 h-full flex items-center">
          <div className="flex flex-col md:flex-row items-center gap-8 w-full">
            {/* Ảnh Poster bên trái */}
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-64 rounded-lg shadow-2xl border-4 border-white hidden md:block"
            />

            {/* Thông tin bên phải */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {movie.title}
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-4 mb-6 text-gray-300">
                <span className="bg-yellow-500 text-black px-2 py-1 rounded font-bold">
                  {(movie.rating || 0).toFixed(1)} ★
                </span>
                <span>{movie.duration} phút</span>
                <span>
                  {new Date(movie.release_date).toLocaleDateString("vi-VN")}
                </span>
              </div>

              <div className="flex gap-4 justify-center md:justify-start">
                <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-bold text-lg transition">
                  MUA VÉ NGAY
                </button>
                <a
                  href={movie.trailer_url}
                  target="_blank"
                  className="border border-white hover:bg-white hover:text-black text-white px-6 py-3 rounded font-bold transition"
                >
                  Xem Trailer
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- PHẦN 2: Nội dung chi tiết --- */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Cột trái: Nội dung phim */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold mb-4 border-l-4 border-red-500 pl-3">
              NỘI DUNG PHIM
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              {movie.description}
            </p>

            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 border-l-4 border-red-500 pl-3">
                LỊCH CHIẾU
              </h2>

              {showtimes.length === 0 ? (
                <p className="text-gray-400">Chưa có lịch chiếu nào.</p>
              ) : (
                <div className="space-y-4">
                  {/* Ở đây tôi giả sử nhóm theo rạp, nhưng tạm thời hiện list đơn giản trước */}
                  {showtimes.map((st) => (
                    <div
                      key={st._id}
                      className="bg-gray-800 p-4 rounded-lg flex justify-between items-center hover:bg-gray-700 transition"
                    >
                      <div>
                        <p className="font-bold text-white text-lg">
                          {st.cinema?.name || "Rạp chiếu"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {st.room} - Ghế thường
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        {/* Nút giờ chiếu - Bấm vào sẽ chuyển sang trang chọn ghế */}
                        <Link
                          href={`/booking/${st._id}`}
                          className="bg-white text-gray-900 px-6 py-2 rounded font-bold hover:bg-red-600 hover:text-white transition"
                        >
                          {new Date(st.start_time).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Link>
                        <span className="text-xs text-gray-400 mt-1">
                          {st.price.toLocaleString()} đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Thông tin thêm (Placeholder) */}
          <div>
            <h3 className="text-xl font-bold mb-4">PHIM ĐANG CHIẾU KHÁC</h3>
            <div className="bg-gray-800 h-64 rounded flex items-center justify-center text-gray-500">
              Danh sách phim gợi ý
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
