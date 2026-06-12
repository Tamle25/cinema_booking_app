"use client";

import SafeImage from '@/components/SafeImage';
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { IMovie } from "@/types";
import ReviewList from "@/components/ReviewList";
import MovieInfoSidebar from "@/components/MovieInfoSidebar";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import Link from "next/link";
import { toastSuccess, toastWarning, toastError } from "@/utils/toast";
import { getCloudinaryImageUrl, movieImagePresets } from "@/lib/cloudinary";
import { getErrorMessage, getResponseMessage } from "@/utils/errorMessage";

export default function ReviewDetailPage() {
  const params = useParams();
  const movieId = params.movieId as string;
  const { user } = useAuth();

  const [movie, setMovie] = useState<IMovie | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reviewRating === 0) {
      toastWarning("Vui lòng chọn điểm đánh giá");
      return;
    }
    if (reviewContent.trim().length < 10) {
      toastWarning("Nội dung đánh giá phải có ít nhất 10 ký tự");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      toastWarning("Vui lòng đăng nhập");
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

      toastSuccess("Đánh giá thành công!");
      setReviewRating(0);
      setReviewContent("");
      setShowForm(false);
      setHasReviewed(true);
      setCanReview(false);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? getResponseMessage(error.response?.data?.message, "Có lỗi xảy ra khi gửi đánh giá")
        : getErrorMessage(error, "Có lỗi xảy ra khi gửi đánh giá");
      toastError(msg);
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

  const reviewBannerUrl = movie.banner_url || movie.poster_url
    ? getCloudinaryImageUrl(movie.banner_url || movie.poster_url, movieImagePresets.bannerHero)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      
      {/* Banner / Hero Section */}
      {reviewBannerUrl ? (
        <div
          className="relative w-full h-40 md:h-48 -mt-16 bg-cover bg-center"
          style={{ backgroundImage: `url(${reviewBannerUrl})` }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ) : (
        <div className="w-full h-24 bg-gray-950 -mt-16" />
      )}

      {/* Main Content Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Movie Info Sidebar */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-20 h-fit mb-6 lg:mb-0">
            <MovieInfoSidebar movie={movie} />
          </div>

          {/* Right Column: Review Form & Reviews List */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Review Write Form & Actions Section */}
            {!user ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm">
                <p className="text-gray-600 mb-3 font-medium">
                  Đăng nhập để viết đánh giá
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Đăng nhập
                </Link>
              </div>
            ) : hasReviewed ? (
              <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center shadow-sm">
                <div className="flex items-center justify-center gap-2 text-green-700 font-semibold text-sm">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
              // Ẩn hoàn toàn khung cảnh báo khi chưa mua vé
              null
            ) : canReview && !showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-white rounded-xl border border-gray-200 p-5 text-center hover:border-red-300 hover:shadow-md transition-all group animate-fade-in"
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

            {showForm && canReview && (
              <form
                onSubmit={handleSubmitReview}
                className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm"
              >
                <h3 className="font-bold text-gray-900 text-lg">
                  Đánh giá phim
                </h3>

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

            {/* Reviews List */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <ReviewList key={refreshKey} movieId={movieId} />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
