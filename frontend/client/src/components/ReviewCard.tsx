"use client";

import { IReview } from "@/types";

const getRelativeTime = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 30) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
};

interface ReviewCardProps {
  review: IReview;
  compact?: boolean;
  onLike?: (reviewId: string) => void;
}

const ReviewCard = ({ review, compact = false, onLike }: ReviewCardProps) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const userName = review.user?.full_name || "Người dùng";
  const userAvatar = review.user?.avatar_url || null;
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div
      className={`${
        compact ? "py-3" : "bg-white rounded-xl border border-gray-100 p-5"
      } ${!compact && "hover:shadow-md transition-shadow duration-200"}`}
    >
      
      <div className="flex items-start gap-3">
        
        <div className="flex-shrink-0">
          {userAvatar ? (
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
              <img
                src={
                  userAvatar.startsWith("http")
                    ? userAvatar
                    : `${API_URL}${userAvatar}`
                }
                alt={userName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {userInitial}
            </div>
          )}
        </div>

        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">
              {userName}
            </span>

            
            {review.is_verified && (
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-green-200">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Đã mua vé
              </span>
            )}
          </div>

          
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < review.rating ? "text-yellow-400" : "text-gray-200"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-bold text-yellow-600">
              {review.rating}/10
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">
              {getRelativeTime(review.createdAt)}
            </span>
          </div>
        </div>
      </div>

      
      <div className={`mt-3 ${compact ? "ml-13" : ""}`}>
        <p
          className={`text-gray-700 text-sm leading-relaxed ${
            compact ? "line-clamp-2" : ""
          }`}
        >
          {review.content}
        </p>
      </div>

      
      {!compact && (
        <div className="mt-4 flex items-center gap-4 ml-13">
          <button
            onClick={() => onLike?.(review._id)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{review.likes_count > 0 ? review.likes_count : "Thích"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
