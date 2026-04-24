"use client";

import { useState, useEffect } from "react";
import { ICinemaChain } from "@/types";
import axios from "axios";

const CinemaPartnersSection = () => {
  const [cinemaChains, setCinemaChains] = useState<ICinemaChain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const fetchCinemaChains = async () => {
      try {
        const res = await axios.get(`${API_URL}/cinema-systems`);
        setCinemaChains(res.data);
      } catch (error) {
        console.error("Lỗi tải danh sách rạp đối tác:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCinemaChains();
  }, []);

  // Skeleton loading
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1.5 h-10 bg-gray-300 rounded-full animate-pulse" />
          <div>
            <div className="h-7 bg-gray-300 rounded w-52 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-72 mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="w-16 h-16 bg-gray-200 rounded-xl mx-auto mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (cinemaChains.length === 0) return null;

  // Fallback logo: tạo text logo từ tên
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);
  };

  return (
    <section id="cinema-partners" className="bg-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-center mb-8 md:mb-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-8 h-px bg-gray-300" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Hệ Thống Rạp Đối Tác
              </h2>
              <div className="w-8 h-px bg-gray-300" />
            </div>
            <p className="text-[#666666] text-sm">
              Mạng lưới rạp chiếu phim hàng đầu trên toàn quốc
            </p>
          </div>
        </div>

        {/* Cinema Partners Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {cinemaChains.map((chain) => (
            <div
              key={chain._id}
              className="group bg-white rounded-xl border border-[#eeeeee] hover:border-[#E50914] p-5 md:p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-red-100 hover:scale-[1.03]"
            >
              {/* Logo */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex items-center justify-center bg-gray-50 group-hover:bg-red-50 transition-colors duration-300">
                {chain.logo_url ? (
                  <img
                    src={
                      chain.logo_url.startsWith("http")
                        ? chain.logo_url
                        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}${chain.logo_url}`
                    }
                    alt={chain.name}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="text-xl md:text-2xl font-black transition-colors duration-300"
                    style={{ color: chain.color_code || "#E50914" }}
                  >
                    {getInitials(chain.name)}
                  </span>
                )}
              </div>

              {/* Tên rạp */}
              <p className="text-sm font-semibold text-gray-700 group-hover:text-[#E50914] transition-colors duration-300 text-center leading-tight">
                {chain.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CinemaPartnersSection;
