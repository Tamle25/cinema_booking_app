"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { IMovie } from "@/types";
import ReviewList from "@/components/ReviewList";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import Link from "next/link";

export default function ReviewDetailPage() {
  const params = useParams();
  const movieId = params.movieId as string;
  const { user } = useAuth();

  const [movie, setMovie] = useState<IMovie | null>(null);
  const [loading, setLoading] = useState(true);

  // Review form states
  const [showForm, setShowForm] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Fetch movie data
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await axios.get(`${API_URL}/movies/${movieId}`);
        setMovie(res.data);
      } catch (error) {
        console.error("Lỗi tải phim:", error);
      } finally {
        setLoading(false);
      }
    };

    if (movieId) fetchMovie();
  }, [movieId, API_URL, refreshKey]);

  // Check review status
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setCanReview(false);
        return;
      }

      const token = localStorage.getItem("access_token");
      if (!token) return;

      try {
        const res = await axios.get(
          `${API_URL}/reviews/check/${movieId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setHasReviewed(res.data.hasReviewed);
        setHasTicket(res.data.hasTicket);
        setCanReview(res.data.hasTicket && !res.data.hasReviewed);
      } catch (error) {
        console.error("Lỗi kiểm tra status:", error);
      }
    };

    if (movieId) checkStatus();
  }, [movieId, user, API_URL, refreshKey]);

  // Submit review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reviewRating === 0) {
      alert("Vui lòng chọn điểm đánh giá");
      return;
    }
    if (reviewContent.trim().length < 10) {
      alert("Nội dung đánh giá phải có ít nhất 10 ký tự");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("Vui lòng đăng nhập");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/reviews`,
        {
          movie_id: movieId,
          rating: reviewRating,
          content: reviewContent.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Đánh giá thành công!");
      setReviewRating(0);
      setReviewContent("");
      setShowForm(false);
      setHasReviewed(true);
      setCanReview(false);
      // Refresh data
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra khi gửi đánh giá";
      alert(`❌ ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Không tìm thấy phim</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div
        className="relative w-full -mt-16 pt-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${movie.banner_url || movie.poster_url})` }}
      >
        <div className="bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60 py-12 md:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end gap-6">
              {/* Poster */}
              <div className="hidden md:block flex-shrink-0">
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-32 h-48 object-cover rounded-xl shadow-2xl border-2 border-gray-600"
                />
              </div>

              {/* Info */}
              <div className="flex-1 pb-2">
                <Link
                  href={`/movie/${movie._id}`}
                  className="text-gray-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Trang phim
                </Link>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-1">
                  {movie.title}
                </h1>

                <div className="flex items-center gap-4 mt-4">
                  {/* Rating */}
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl">
                    <svg
                      className="w-6 h-6 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-2xl font-extrabold text-yellow-400">
                      {movie.rating || 0}
                    </span>
                    <span className="text-gray-300 text-sm">/10</span>
                  </div>

                  <div className="text-gray-300 text-sm">
                    <span className="font-semibold text-white">
                      {movie.review_count || 0}
                    </span>{" "}
                    đánh giá
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Write Review Section */}
        <div className="mb-8">
          {!user ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-gray-600 mb-3">
                Đăng nhập để viết đánh giá
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Đăng nhập
              </Link>
            </div>
          ) : hasReviewed ? (
            <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center">
              <div className="flex items-center justify-center gap-2 text-green-700 font-medium">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Bạn đã đánh giá phim này
              </div>
            </div>
          ) : !hasTicket ? (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-700 font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                Bạn cần mua vé để đánh giá phim này
              </div>
              <Link
                href={`/movie/${movie._id}`}
                className="inline-flex items-center gap-2 mt-3 px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Đặt vé ngay
              </Link>
            </div>
          ) : canReview && !showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-white rounded-xl border border-gray-200 p-5 text-center hover:border-red-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-red-600 font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                Viết đánh giá
              </div>
            </button>
          ) : null}

          {/* Review Form */}
          {showForm && canReview && (
            <form
              onSubmit={handleSubmitReview}
              className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm"
            >
              <h3 className="font-bold text-gray-900 text-lg">
                Đánh giá phim
              </h3>

              {/* Rating Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Điểm đánh giá
                </label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const starValue = i + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-transform hover:scale-125"
                      >
                        <svg
                          className={`w-7 h-7 ${
                            starValue <= (hoverRating || reviewRating)
                              ? "text-yellow-400"
                              : "text-gray-200"
                          } transition-colors`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    );
                  })}
                  {reviewRating > 0 && (
                    <span className="ml-2 text-lg font-bold text-yellow-600">
                      {reviewRating}/10
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung đánh giá
                </label>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Chia sẻ cảm nhận của bạn về phim... (ít nhất 10 ký tự)"
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {reviewContent.length}/1000
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang gửi...
                    </span>
                  ) : (
                    "Gửi đánh giá"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Reviews List */}
        <ReviewList key={refreshKey} movieId={movieId} />
      </div>
    </div>
  );
}
