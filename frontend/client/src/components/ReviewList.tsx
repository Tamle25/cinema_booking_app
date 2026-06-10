"use client";

import { useState, useEffect, useCallback } from "react";
import { IReview } from "@/types";
import ReviewCard from "./ReviewCard";
import axios from "axios";
import { toastWarning } from "@/utils/toast";

interface ReviewListProps {
  movieId: string;
}

const ReviewList = ({ movieId }: ReviewListProps) => {
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState<"newest" | "highest_rating">("newest");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const fetchReviews = useCallback(
    async (pageNum: number, sort: string, reset = false) => {
      try {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const res = await axios.get(
          `${API_URL}/reviews/${movieId}?page=${pageNum}&limit=10&sort=${sort}`
        );

        const { data, meta } = res.data;

        if (reset) {
          setReviews(data);
        } else {
          setReviews((prev) => [...prev, ...data]);
        }
        setHasMore(meta.hasNextPage);
        setTotalItems(meta.totalItems);
      } catch (error) {
        console.error("Lỗi tải reviews:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [API_URL, movieId]
  );

  useEffect(() => {
    setPage(1);
    fetchReviews(1, sortBy, true);
  }, [movieId, sortBy, fetchReviews]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage, sortBy);
  };

  const handleLike = async (reviewId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      toastWarning("Vui lòng đăng nhập để thích đánh giá");
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/reviews/${reviewId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReviews((prev) =>
        prev.map((r) =>
          r._id === reviewId
            ? {
                ...r,
                likes_count: res.data.liked
                  ? r.likes_count + 1
                  : r.likes_count - 1,
                is_liked: res.data.liked,
              }
            : r
        )
      );
    } catch (error) {
      console.error("Lỗi like:", error);
    }
  };

  const sortOptions = [
    { value: "newest", label: "Mới nhất" },
    { value: "highest_rating", label: "Rating cao" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value as typeof sortBy)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                sortBy === opt.value
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">
          {totalItems} đánh giá
        </span>
      </div>

      
      {reviews.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
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
          <p className="text-gray-500 font-medium">Chưa có đánh giá nào</p>
          <p className="text-gray-400 text-sm mt-1">
            Hãy là người đầu tiên đánh giá phim này!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              onLike={handleLike}
            />
          ))}
        </div>
      )}

      
      {hasMore && reviews.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-8 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-full hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                Đang tải...
              </span>
            ) : (
              "Xem thêm đánh giá"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
