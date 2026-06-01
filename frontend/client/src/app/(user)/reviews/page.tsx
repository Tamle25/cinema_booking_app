"use client";

import { useState, useEffect, useCallback } from "react";
import { IFeaturedReview } from "@/types";
import ReviewCard from "@/components/ReviewCard";
import Link from "next/link";
import axios from "axios";
import { getCloudinaryImageUrl, movieImagePresets } from "@/lib/cloudinary";

// Format số lượng
const formatCount = (count: number): string => {
  if (count >= 1000) {
    const k = count / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return count.toString();
};

export default function ReviewsPage() {
  const [data, setData] = useState<IFeaturedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState("hot");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const fetchData = useCallback(
    async (pageNum: number, sort: string, reset = false) => {
      try {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const res = await axios.get(
          `${API_URL}/reviews/movies?page=${pageNum}&limit=12&sort=${sort}`
        );

        if (reset) {
          setData(res.data.data);
        } else {
          setData((prev) => [...prev, ...res.data.data]);
        }
        setHasMore(res.data.meta.hasNextPage);
      } catch (error) {
        console.error("Lỗi tải reviews:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [API_URL]
  );

  useEffect(() => {
    setPage(1);
    fetchData(1, sortBy, true);
  }, [sortBy, fetchData]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, sortBy);
  };

  const sortOptions = [
    { value: "hot", label: "Đang hot", icon: "🔥" },
    { value: "highest_rating", label: "Rating cao", icon: "⭐" },
    { value: "newest", label: "Mới cập nhật", icon: "🆕" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 -mt-16 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            Review Phim
          </h1>
          <p className="text-gray-300 mt-3 max-w-2xl">
            Đánh giá chân thực từ những khán giả đã xem phim tại rạp. Mua vé và
            chia sẻ cảm nhận của bạn!
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all ${sortBy === opt.value
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-red-300 hover:text-red-600"
                }`}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden shadow-md animate-pulse"
              >
                <div className="h-48 bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="space-y-2 mt-4">
                    <div className="h-14 bg-gray-100 rounded-lg" />
                    <div className="h-14 bg-gray-100 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <svg
              className="w-20 h-20 mx-auto text-gray-300 mb-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              Chưa có review nào
            </h3>
            <p className="text-gray-400">
              Hãy là người đầu tiên đánh giá phim tại CineMax!
            </p>
          </div>
        ) : (
          /* Movies Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((item) => (
              <div
                key={item.movie._id}
                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
              >
                {/* Movie Thumbnail */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={getCloudinaryImageUrl(
                      item.movie.banner_url || item.movie.poster_url,
                      movieImagePresets.bannerCard,
                    )}
                    alt={item.movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Play icon overlay */}
                  <Link
                    href={`/movie/${item.movie._id}`}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/40">
                      <svg
                        className="w-6 h-6 text-white ml-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </Link>

                  {/* Movie info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">
                      {item.movie.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {item.rating_avg || 0}
                      </span>
                      <span className="text-gray-300 text-xs">
                        {formatCount(item.review_count)} đánh giá
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reviews Preview */}
                <div className="p-4">
                  <div className="divide-y divide-gray-100">
                    {item.reviews.slice(0, 2).map((review) => (
                      <ReviewCard
                        key={review._id}
                        review={review}
                        compact={true}
                      />
                    ))}
                  </div>

                  <Link
                    href={`/review/${item.movie._id}`}
                    className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 bg-red-50 text-red-600 font-medium text-sm rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Xem tất cả đánh giá
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && data.length > 0 && !loading && (
          <div className="text-center mt-10">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-10 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-full hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-50 shadow-sm"
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  Đang tải...
                </span>
              ) : (
                "Xem thêm"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
