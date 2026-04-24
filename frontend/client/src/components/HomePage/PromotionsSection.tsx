"use client";

import { useState, useEffect } from "react";
import { IPromotion } from "@/types";
import axios from "axios";

// Badge config theo type
const badgeConfig: Record<string, { label: string; bg: string; text: string }> = {
  hot: { label: "HOT", bg: "bg-red-600", text: "text-white" },
  sale: { label: "SALE", bg: "bg-yellow-500", text: "text-black" },
  free: { label: "FREE", bg: "bg-green-500", text: "text-white" },
  event: { label: "SỰ KIỆN", bg: "bg-blue-500", text: "text-white" },
};

// Mock data fallback khi API chưa có dữ liệu
const mockPromotions: IPromotion[] = [
  {
    _id: "mock-1",
    title: "Flash Sale Thứ 4 Vui Vẻ",
    description: "Giảm 50% giá vé mỗi thứ 4 hàng tuần. Áp dụng cho tất cả suất chiếu từ 10:00 - 17:00.",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80",
    type: "sale",
    discount_value: 50,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    is_active: true,
    createdAt: "2026-01-01",
  },
  {
    _id: "mock-2",
    title: "Combo Bắp Nước Miễn Phí",
    description: "Mua 2 vé tặng 1 combo bắp nước miễn phí. Chương trình áp dụng cho thành viên VIP.",
    image: "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=800&q=80",
    type: "free",
    discount_value: 0,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    is_active: true,
    createdAt: "2026-01-01",
  },
  {
    _id: "mock-3",
    title: "Blockbuster Premiere Night",
    description: "Đêm công chiếu sớm các bom tấn Hollywood. Đặt vé trước 7 ngày được giảm 30%.",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
    type: "hot",
    discount_value: 30,
    start_date: "2026-03-01",
    end_date: "2026-12-31",
    is_active: true,
    createdAt: "2026-01-01",
  },
  {
    _id: "mock-4",
    title: "Sinh Nhật Vui - Giảm 40%",
    description: "Ưu đãi đặc biệt dành cho khách hàng có sinh nhật trong tháng. Giảm 40% giá vé.",
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80",
    type: "sale",
    discount_value: 40,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    is_active: true,
    createdAt: "2026-01-01",
  },
  {
    _id: "mock-5",
    title: "Student Day - Thứ 3 Học Sinh",
    description: "Ưu đãi dành riêng cho học sinh, sinh viên mỗi thứ 3 hàng tuần.",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80",
    type: "event",
    discount_value: 35,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    is_active: true,
    createdAt: "2026-01-01",
  },
];

const PromotionsSection = () => {
  const [promotions, setPromotions] = useState<IPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const fetchPromotions = async () => {
      try {
        const res = await axios.get(`${API_URL}/promotions`);
        if (res.data && res.data.length > 0) {
          setPromotions(res.data);
        } else {
          // Fallback mock data nếu API trống
          setPromotions(mockPromotions);
        }
      } catch {
        // Fallback mock data nếu API lỗi
        setPromotions(mockPromotions);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotions();
  }, []);

  // Skeleton loading
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1.5 h-10 bg-gray-300 rounded-full animate-pulse" />
          <div>
            <div className="h-7 bg-gray-300 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-64 mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl overflow-hidden shadow-md animate-pulse"
            >
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (promotions.length === 0) return null;

  return (
    <section id="promotions" className="bg-[#F5F5F5] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-10 bg-[#E50914] rounded-full" />
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Khuyến Mãi
              </h2>
              <p className="text-[#666666] text-sm mt-1">
                Ưu đãi hấp dẫn dành cho bạn
              </p>
            </div>
          </div>
          <button className="text-[#E50914] hover:text-red-700 font-medium flex items-center gap-1 transition-colors text-sm">
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
          </button>
        </div>

        {/* Promotions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {promotions.slice(0, 5).map((promo) => {
            const badge = badgeConfig[promo.type] || badgeConfig.event;

            return (
              <div
                key={promo._id}
                className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.03]"
              >
                {/* Ảnh nền */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={promo.image}
                    alt={promo.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                  {/* Badge Tag */}
                  <div
                    className={`absolute top-3 left-3 ${badge.bg} ${badge.text} text-xs font-bold px-3 py-1 rounded-full shadow-lg`}
                  >
                    {badge.label}
                  </div>

                  {/* Discount value */}
                  {promo.discount_value > 0 && (
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm text-[#E50914] font-black text-lg px-3 py-1 rounded-xl shadow-md">
                      -{promo.discount_value}%
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight mb-2 group-hover:text-[#E50914] transition-colors line-clamp-2">
                    {promo.title}
                  </h3>
                  <p className="text-[#666666] text-xs leading-relaxed line-clamp-2">
                    {promo.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PromotionsSection;
