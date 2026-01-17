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
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group">
      {/* Phần Hình Ảnh */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          draggable={false}
        />
        
        {/* Rating Badge */}
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {movie.rating}
        </div>

        {/* Overlay khi hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-6">
          <Link
            href={`/movie/${movie._id}`}
            className="bg-red-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-red-700 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
          >
            MUA VÉ
          </Link>
          <Link
            href={`/movie/${movie._id}`}
            className="text-white/80 hover:text-white text-xs mt-3 underline-offset-2 hover:underline transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75"
          >
            Xem chi tiết
          </Link>
        </div>
      </div>

      {/* Phần Thông Tin */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-900 truncate leading-tight group-hover:text-red-600 transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {movie.duration} phút
          </span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
