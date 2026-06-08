'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useGeolocation } from '@/hooks/useGeolocation';
import { IComparedCinema } from '@/types';

// Dynamic import bản đồ (ssr: false vì Leaflet cần window)
const CinemaMap = dynamic(() => import('@/components/CinemaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-xl bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Đang tải bản đồ...</p>
      </div>
    </div>
  ),
});

type SortOption = 'best' | 'cheapest' | 'nearest' | 'earliest' | 'brand';

const SORT_OPTIONS: { value: SortOption; label: string; requiresLocation?: boolean }[] = [
  { value: 'best', label: 'Đáng chọn nhất' },
  { value: 'cheapest', label: 'Giá rẻ nhất' },
  { value: 'nearest', label: 'Gần nhất', requiresLocation: true },
  { value: 'earliest', label: 'Sớm nhất' },
  { value: 'brand', label: 'Cụm rạp' },
];

const LABEL_COLORS: Record<string, string> = {
  'Rẻ nhất': 'bg-green-100 text-green-700 border-green-200',
  'Gần nhất': 'bg-blue-100 text-blue-700 border-blue-200',
  'Đáng chọn nhất': 'bg-amber-100 text-amber-700 border-amber-200',
  'Suất sớm nhất': 'bg-purple-100 text-purple-700 border-purple-200',
};

interface CompareCinemaSectionProps {
  movieId: string;
}

export default function CompareCinemaSection({ movieId }: CompareCinemaSectionProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // States
  const [cinemas, setCinemas] = useState<IComparedCinema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<SortOption>('best');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [highlightedCinemaId, setHighlightedCinemaId] = useState<string | null>(null);

  // Geolocation
  const { coords, status, errorMessage, requestLocation, hasLocation } = useGeolocation();

  // Ref cho scroll đến card rạp
  const cinemaCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Generate 7 ngày tới
  const dateTabs = useMemo(() => {
    const tabs: { dateISO: string; dayName: string; dayOfMonth: number; month: number }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateISO = `${year}-${month}-${day}`;
      let dayName = '';
      if (i === 0) dayName = 'Hôm nay';
      else {
        const dayOfWeek = d.getDay();
        dayName = dayOfWeek === 0 ? 'CN' : `Thứ ${dayOfWeek + 1}`;
      }
      tabs.push({ dateISO, dayName, dayOfMonth: d.getDate(), month: d.getMonth() + 1 });
    }
    return tabs;
  }, []);

  // Mặc định chọn ngày hôm nay
  useEffect(() => {
    if (dateTabs.length > 0 && !selectedDate) {
      setSelectedDate(dateTabs[0].dateISO);
    }
  }, [dateTabs, selectedDate]);

  // Fetch dữ liệu so sánh
  const fetchCompare = useCallback(async () => {
    if (!movieId || !selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      let url = `${API_URL}/showtimes/compare?movieId=${movieId}&date=${selectedDate}&sort=${selectedSort}`;
      if (coords) {
        url += `&userLat=${coords.lat}&userLng=${coords.lng}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Không thể tải dữ liệu so sánh');
      }
      const data = await res.json();
      setCinemas(data);
    } catch (err: any) {
      console.error('Lỗi khi tải so sánh rạp:', err);
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      setCinemas([]);
    } finally {
      setLoading(false);
    }
  }, [movieId, selectedDate, selectedSort, coords, API_URL]);

  useEffect(() => {
    fetchCompare();
  }, [fetchCompare]);

  // Scroll đến card rạp khi click trên bản đồ
  const handleSelectCinemaFromMap = (cinemaId: string) => {
    setHighlightedCinemaId(cinemaId);
    const el = cinemaCardRefs.current[cinemaId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Reset highlight sau 3s
    setTimeout(() => setHighlightedCinemaId(null), 3000);
  };

  // Status text cho geolocation
  const getLocationStatusUI = () => {
    switch (status) {
      case 'requesting':
        return (
          <span className="flex items-center gap-1.5 text-xs text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Đang lấy vị trí...
          </span>
        );
      case 'denied':
        return <span className="text-xs text-red-500">{errorMessage}</span>;
      case 'unsupported':
        return <span className="text-xs text-gray-500">{errorMessage}</span>;
      case 'error':
        return <span className="text-xs text-red-500">{errorMessage}</span>;
      case 'granted':
        return <span className="text-xs text-green-600">Đã lấy vị trí thành công</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 inline-block relative pb-2">
          So sánh rạp chiếu
          <div className="absolute w-1/2 h-1 bg-red-600 bottom-0 left-1/4 rounded-full"></div>
        </h2>
        <p className="text-gray-500 text-sm mt-3 max-w-lg mx-auto">
          So sánh giá vé, khoảng cách và suất chiếu giữa các rạp để chọn rạp phù hợp nhất
        </p>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Row 1: Chọn ngày */}
          <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-1">
            {dateTabs.map(tab => {
              const isActive = selectedDate === tab.dateISO;
              return (
                <button
                  key={tab.dateISO}
                  onClick={() => setSelectedDate(tab.dateISO)}
                  className={`flex flex-col items-center justify-center min-w-[65px] py-2 rounded-xl transition-all border flex-shrink-0 ${
                    isActive
                      ? 'bg-red-600 border-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xs ${isActive ? 'font-medium opacity-90' : 'text-gray-500'}`}>{tab.dayName}</span>
                  <span className="text-xl font-bold mt-0.5">{tab.dayOfMonth.toString().padStart(2, '0')}</span>
                  <span className={`text-[10px] ${isActive ? 'opacity-90' : 'text-gray-400'}`}>Tháng {tab.month}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Vị trí + Sort */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Nút lấy vị trí */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={requestLocation}
                disabled={status === 'requesting'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  hasLocation
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {hasLocation ? 'Đã lấy vị trí' : 'Lấy vị trí hiện tại'}
              </button>
              {getLocationStatusUI()}
            </div>

            {/* Bộ lọc sắp xếp */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {SORT_OPTIONS.map(opt => {
                const isDisabled = opt.requiresLocation && !hasLocation;
                const isActive = selectedSort === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => !isDisabled && setSelectedSort(opt.value)}
                    disabled={isDisabled}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap ${
                      isActive
                        ? 'bg-red-600 border-red-600 text-white'
                        : isDisabled
                          ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                    title={isDisabled ? 'Cần bật vị trí để sắp xếp theo khoảng cách' : ''}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        // Loading Skeleton
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 w-48 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-64 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-20 bg-gray-200 rounded-lg"></div>
                  <div className="h-10 w-20 bg-gray-200 rounded-lg"></div>
                  <div className="h-10 w-20 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="h-[400px] bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
      ) : error ? (
        // Error State
        <div className="text-center py-16 bg-white rounded-xl border border-red-100">
          <svg className="w-14 h-14 mx-auto text-red-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-600 font-medium mb-2">Đã xảy ra lỗi</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchCompare}
            className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
          >
            Thử lại
          </button>
        </div>
      ) : cinemas.length === 0 ? (
        // Empty State
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4V2m0 2a2 2 0 012-2h6a2 2 0 012 2m-10 0h10m0 0v12a2 2 0 01-2 2H9a2 2 0 01-2-2V4" />
          </svg>
          <p className="text-gray-600 font-medium text-lg mb-1">Không có suất chiếu</p>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Phim này chưa có suất chiếu trong ngày{' '}
            <strong>{dateTabs.find(t => t.dateISO === selectedDate)?.dayName}</strong>
            {' '}({new Date(selectedDate).toLocaleDateString('vi-VN')}).
            <br />Vui lòng chọn ngày khác.
          </p>
        </div>
      ) : (
        // Main: List + Map
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Danh sách rạp */}
          <div className="lg:col-span-3 space-y-4">
            {cinemas.map(cinema => (
              <div
                key={cinema.cinemaId}
                ref={el => { cinemaCardRefs.current[cinema.cinemaId] = el; }}
                className={`bg-white rounded-xl border overflow-hidden transition-all duration-300 ${
                  highlightedCinemaId === cinema.cinemaId
                    ? 'border-red-400 shadow-lg shadow-red-100 ring-2 ring-red-200'
                    : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
                }`}
              >
                {/* Cinema Header */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Brand Logo */}
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                      {cinema.brandLogo ? (
                        <img src={cinema.brandLogo} alt={cinema.brand} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs font-bold text-gray-500">{cinema.brand?.slice(0, 3)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{cinema.cinemaName}</h3>
                        {/* Labels */}
                        {cinema.labels.map(label => (
                          <span
                            key={label}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${LABEL_COLORS[label] || 'bg-gray-100 text-gray-600 border-gray-200'}`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{cinema.address}</p>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mb-4">
                    {cinema.minPrice != null && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-600">Từ</span>
                        <span className="font-bold text-red-600">{cinema.minPrice.toLocaleString()}đ</span>
                      </div>
                    )}
                    {cinema.distanceKm != null && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="font-semibold text-gray-700">{cinema.distanceKm} km</span>
                      </div>
                    )}
                    {cinema.availableSeats > 0 && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600">{cinema.availableSeats} ghế trống</span>
                      </div>
                    )}
                  </div>

                  {/* Showtimes Grid */}
                  <div className="flex flex-wrap gap-2">
                    {cinema.showtimes.map(st => (
                      <Link
                        key={st.showtimeId}
                        href={`/booking/${st.showtimeId}`}
                        className="group relative inline-flex flex-col items-center px-3 py-2 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all bg-white shadow-sm hover:shadow"
                      >
                        <span className="font-bold text-gray-900 group-hover:text-red-600 text-base leading-none">
                          {st.startTime}
                        </span>
                        <span className="text-gray-400 text-[10px] mt-0.5">
                          {st.format} &bull; {st.availableSeats} ghế
                        </span>
                        <span className="text-red-600 text-[10px] font-semibold mt-0.5">
                          {st.price.toLocaleString()}đ
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bản đồ */}
          <div className="lg:col-span-2">
            <div className="sticky top-20">
              <CinemaMap
                cinemas={cinemas}
                userCoords={coords}
                onSelectCinema={handleSelectCinemaFromMap}
              />
              {/* Chú thích */}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Vị trí bạn</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Rạp chiếu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
