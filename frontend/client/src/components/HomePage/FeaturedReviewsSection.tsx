"use client";

import { useState, useEffect } from "react";
import { IFeaturedReview } from "@/types";
import ReviewCard from "@/components/ReviewCard";
import Link from "next/link";
import axios from "axios";
import TrailerModal from "@/components/TrailerModal";
import { getCloudinaryImageUrl, movieImagePresets } from "@/lib/cloudinary";

// Format số lượng: 1000 → 1K, 8200 → 8.2K
const formatCount = (count: number): string => {
  if (count >= 1000) {
    const k = count / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return count.toString();
};

const FeaturedReviewsSection = () => {
  const [featured, setFeatured] = useState<IFeaturedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const fetchFeatured = async () => {
      try {
        const res = await axios.get(`${API_URL}/reviews/featured`);
        setFeatured(res.data);
      } catch {
        // Silently fail — section just won't show
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  // Skeleton loading
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1.5 h-10 bg-gray-300 rounded-full animate-pulse" />
          <div>
            <div className="h-7 bg-gray-300 rounded w-56 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-72 mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl overflow-hidden shadow-md animate-pulse"
            >
              <div className="h-48 bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="space-y-2 mt-4">
                  <div className="h-12 bg-gray-100 rounded-lg" />
                  <div className="h-12 bg-gray-100 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (featured.length === 0) return null;

  return (
    <section id="featured-reviews" className="bg-[#F5F5F5] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-10 bg-[#E50914] rounded-full" />
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Bình Luận Nổi Bật
              </h2>
              <p className="text-[#666666] text-sm mt-1">
                Đánh giá chân thực từ khán giả đã xem phim
              </p>
            </div>
          </div>
          <Link
            href="/reviews"
            className="text-[#E50914] hover:text-red-700 font-medium flex items-center gap-1 transition-colors text-sm"
          >
            Xem tất cả
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
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((item) => (
            <div
              key={item.movie._id}
              className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
            >
              {/* Movie Thumbnail */}
              <div 
                className="relative h-48 overflow-hidden cursor-pointer"
                onClick={() => setActiveTrailer(item.movie.trailer_url || "")}
              >
                <img
                  src={getCloudinaryImageUrl(
                    item.movie.banner_url || item.movie.poster_url,
                    movieImagePresets.bannerCard,
                  )}
                  alt={item.movie.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                </div>

                {/* Movie Info on overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">
                    {item.movie.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    {/* Rating */}
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
                    {/* Review count */}
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

                {/* "Xem thêm" Button */}
                <Link
                  href={`/review/${item.movie._id}`}
                  className="mt-3 flex items-center justify-center w-full py-2.5 bg-red-50 text-red-600 font-medium text-sm rounded-lg hover:bg-red-100 transition-colors"
                >
                  Xem thêm
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={!!activeTrailer}
        onClose={() => setActiveTrailer(null)}
        videoUrl={activeTrailer || ""}
      />
    </section>
  );
};

export default FeaturedReviewsSection;
