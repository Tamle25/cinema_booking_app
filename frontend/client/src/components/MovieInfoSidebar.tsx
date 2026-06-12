"use client";

import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { IMovie } from "@/types";
import { getCloudinaryImageUrl, movieImagePresets } from "@/lib/cloudinary";

interface MovieInfoSidebarProps {
  movie: IMovie;
}

export default function MovieInfoSidebar({ movie }: MovieInfoSidebarProps) {
  // Format release date to dd/MM/yyyy
  const formatReleaseDate = (dateStr: string) => {
    if (!dateStr) return "Chưa cập nhật";
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateStr;
    }
  };

  const genresStr = movie.genres && movie.genres.length > 0
    ? movie.genres.map((g) => g.name).join(", ")
    : "Chưa cập nhật";

  const posterUrl = getCloudinaryImageUrl(movie.poster_url, movieImagePresets.posterDetail);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col items-center w-full">
      {/* Movie Poster */}
      <div className="w-full max-w-[200px] aspect-[2/3] relative rounded-xl overflow-hidden shadow-md mb-5 border border-gray-100">
        <SafeImage
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Movie Info */}
      <div className="w-full text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900 leading-snug hover:text-pink-600 transition-colors">
          <Link href={`/movie/${movie._id}`}>
            {movie.title}
          </Link>
        </h2>

        <div className="space-y-2.5 text-sm text-gray-600 pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-400">Thể loại:</span>
            <span className="font-semibold text-gray-800 text-right max-w-[150px] truncate" title={genresStr}>
              {genresStr}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-400">Ngày chiếu:</span>
            <span className="font-semibold text-gray-800">
              {formatReleaseDate(movie.release_date)}
            </span>
          </div>
          {movie.duration > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Thời lượng:</span>
              <span className="font-semibold text-gray-800">
                {movie.duration} phút
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Link
            href={`/movie/${movie._id}`}
            className="inline-block w-full py-2.5 px-6 border-2 border-pink-500 text-pink-600 font-bold rounded-xl hover:bg-pink-50 transition-all text-center text-sm shadow-sm hover:shadow"
          >
            Đặt vé ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
