"use client";

import Link from "next/link";

// Định nghĩa dữ liệu đầu vào cho thẻ phim
interface MovieProps {
  movie: {
    _id: string;
    title: string;
    poster_url: string;
    duration: number;
    release_date: string;
    rating: number;
  };
}

const MovieCard = ({ movie }: MovieProps) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Phần Hình Ảnh */}
      <div className="relative h-80 overflow-hidden group">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Nút Mua vé hiện ra khi di chuột vào (Giống ảnh mẫu) */}
        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Link
            href={`/movie/${movie._id}`}
            className="bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
          >
            MUA VÉ
          </Link>
        </div>
      </div>

      {/* Phần Thông Tin */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-800 truncate">
          {movie.title}
        </h3>
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
          <span>{movie.duration} phút</span>
          <span className="text-yellow-500 font-bold flex items-center">
            ★ {movie.rating}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
