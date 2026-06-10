'use client';

import { useEffect, useState, useMemo } from 'react';
import { authHeaders } from '@/lib/api';
import { getCloudinaryImageUrl, movieImagePresets } from '@/lib/cloudinary';

interface DashboardStats {
  totalMovies: number;
  totalCinemaSystems: number;
  totalCinemas: number;
  totalBookings: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  todayBookings: number;
  recentBookings: DashboardBooking[];
  recentMovies: DashboardMovie[];
  bookingsByStatus: {
    confirmed: number;
    pending: number;
    cancelled: number;
  };
  revenueByDay: { date: string; revenue: number; count: number }[];
}

interface DashboardBooking {
  user?: {
    full_name?: string;
  };
  showtime?: {
    movie?: {
      title?: string;
    };
  };
  seats?: string[];
  total_price?: number;
  createdAt?: string;
  status?: string;
}

interface DashboardMovie {
  title: string;
  poster_url?: string;
  genres?: Array<{ name: string }>;
  duration?: number;
  rating?: number;
  is_active?: boolean;
}

const CircularProgress = ({ percentage, color, size = 80 }: { percentage: number; color: string; size?: number }) => {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      
    </div>
  );
};

const StatCard = ({ 
  label, 
  value, 
  icon, 
  trend, 
  trendValue, 
  color,
  tooltip
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode; 
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: string;
  tooltip?: string;
}) => (
  <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )}
            {trend === 'down' && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span className="font-medium">{trendValue}</span>
          </div>
        )}
      </div>
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
    </div>
    {tooltip && (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    )}
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMovies: 0,
    totalCinemaSystems: 0,
    totalCinemas: 0,
    totalBookings: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    todayBookings: 0,
    recentBookings: [],
    recentMovies: [],
    bookingsByStatus: { confirmed: 0, pending: 0, cancelled: 0 },
    revenueByDay: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [moviesRes, systemsRes, cinemasRes, bookingsRes] = await Promise.all([
          fetch(`${API_URL}/movies`),
          fetch(`${API_URL}/cinema-systems`),
          fetch(`${API_URL}/cinemas`),
          fetch(`${API_URL}/bookings`, { headers: authHeaders() }),
        ]);

        const movies = await moviesRes.json();
        const systems = await systemsRes.json();
        const cinemas = await cinemasRes.json();
        const bookings = await bookingsRes.json();

        const bookingsArray: DashboardBooking[] = Array.isArray(bookings) ? bookings : [];
        const moviesArray: DashboardMovie[] = Array.isArray(movies) ? movies : [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        let totalRevenue = 0;
        let todayRevenue = 0;
        let monthRevenue = 0;
        let todayBookings = 0;
        const statusCount = { confirmed: 0, pending: 0, cancelled: 0 };
        
        const last7Days: { [key: string]: { revenue: number; count: number } } = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          last7Days[key] = { revenue: 0, count: 0 };
        }

        bookingsArray.forEach((b) => {
          const price = b.total_price || 0;
          totalRevenue += price;
          
          const bookingDate = new Date(b.createdAt || '');
          if (Number.isNaN(bookingDate.getTime())) return;

          const bookingDateStr = bookingDate.toISOString().split('T')[0];
          
          if (bookingDate >= today) {
            todayRevenue += price;
            todayBookings++;
          }
          if (bookingDate >= monthStart) {
            monthRevenue += price;
          }
          
          if (b.status === 'confirmed') statusCount.confirmed++;
          else if (b.status === 'pending') statusCount.pending++;
          else if (b.status === 'cancelled') statusCount.cancelled++;
          else statusCount.confirmed++;
          
          if (last7Days[bookingDateStr]) {
            last7Days[bookingDateStr].revenue += price;
            last7Days[bookingDateStr].count++;
          }
        });

        const revenueByDay = Object.entries(last7Days).map(([date, data]) => ({
          date,
          revenue: data.revenue,
          count: data.count,
        }));

        setStats({
          totalMovies: moviesArray.length,
          totalCinemaSystems: Array.isArray(systems) ? systems.length : 0,
          totalCinemas: Array.isArray(cinemas) ? cinemas.length : 0,
          totalBookings: bookingsArray.length,
          totalRevenue,
          todayRevenue,
          monthRevenue,
          todayBookings,
          recentBookings: bookingsArray.slice(0, 5),
          recentMovies: moviesArray.slice(0, 5),
          bookingsByStatus: statusCount,
          revenueByDay,
        });
      } catch (error) {
        console.error('Lỗi tải dữ liệu dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [API_URL]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toLocaleString();
  };

  const formatFullCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatBookingDate = (date?: string) => {
    if (!date) return 'N/A';

    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime()) ? 'N/A' : parsedDate.toLocaleDateString('vi-VN');
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const statusPercentages = useMemo(() => {
    const total = stats.bookingsByStatus.confirmed + stats.bookingsByStatus.pending + stats.bookingsByStatus.cancelled;
    if (total === 0) return { confirmed: 0, pending: 0, cancelled: 0 };
    return {
      confirmed: Math.round((stats.bookingsByStatus.confirmed / total) * 100),
      pending: Math.round((stats.bookingsByStatus.pending / total) * 100),
      cancelled: Math.round((stats.bookingsByStatus.cancelled / total) * 100),
    };
  }, [stats.bookingsByStatus]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-gray-500 font-medium">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden">
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">
                {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-3xl font-bold mt-1">{getGreeting()}, Admin!</h1>
              <p className="text-slate-300 mt-2">Đây là tổng quan hoạt động hệ thống hôm nay</p>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-4 text-center">
                <p className="text-slate-300 text-xs uppercase tracking-wider">Hôm nay</p>
                <p className="text-2xl font-bold mt-1">{stats.todayBookings}</p>
                <p className="text-slate-400 text-sm">đơn đặt vé</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-4 text-center">
                <p className="text-slate-300 text-xs uppercase tracking-wider">Doanh thu</p>
                <p className="text-2xl font-bold mt-1 text-green-400">{formatCurrency(stats.todayRevenue)}đ</p>
                <p className="text-slate-400 text-sm">hôm nay</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Tổng số phim"
          value={stats.totalMovies}
          icon={
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          }
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          tooltip="Tổng số phim trong hệ thống"
        />
        <StatCard
          label="Hãng phim"
          value={stats.totalCinemaSystems}
          icon={
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="bg-gradient-to-br from-violet-500 to-purple-600"
          tooltip="CGV, Lotte, BHD, Galaxy..."
        />
        <StatCard
          label="Rạp chiếu phim"
          value={stats.totalCinemas}
          icon={
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="bg-gradient-to-br from-emerald-500 to-green-600"
          tooltip="Tổng số rạp trên toàn quốc"
        />
        <StatCard
          label="Tổng giao dịch"
          value={stats.totalBookings}
          icon={
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          }
          color="bg-gradient-to-br from-orange-500 to-amber-600"
          tooltip="Tổng số vé đã đặt"
        />
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-green-100 text-sm">Doanh thu tháng này</p>
              <p className="text-2xl font-bold">{formatFullCurrency(stats.monthRevenue)}</p>
            </div>
          </div>
          <div className="h-px bg-white/20 my-4" />
          <div className="flex justify-between text-sm">
            <span className="text-green-100">Tổng doanh thu</span>
            <span className="font-semibold">{formatFullCurrency(stats.totalRevenue)}</span>
          </div>
        </div>

        
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Doanh thu 7 ngày qua</h3>
              <p className="text-sm text-gray-500">Biểu đồ doanh thu theo ngày</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Doanh thu</span>
            </div>
          </div>
          
          {stats.revenueByDay.length > 0 ? (
            <div className="space-y-4">
              
              <div className="flex items-end gap-2 h-32">
                {stats.revenueByDay.map((day, i) => {
                  const maxRevenue = Math.max(...stats.revenueByDay.map(d => d.revenue), 1);
                  const height = (day.revenue / maxRevenue) * 100;
                  const date = new Date(day.date);
                  const isToday = new Date().toISOString().split('T')[0] === day.date;
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="relative w-full">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            isToday ? 'bg-gradient-to-t from-blue-600 to-blue-400' : 'bg-gradient-to-t from-blue-500 to-blue-300'
                          } group-hover:from-blue-700 group-hover:to-blue-500`}
                          style={{ height: `${Math.max(height, 8)}px` }}
                        />
                        
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          <p className="font-semibold">{formatFullCurrency(day.revenue)}</p>
                          <p className="text-gray-300">{day.count} đơn</p>
                        </div>
                      </div>
                      <span className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                        {isToday ? 'Nay' : date.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('Th ', 'T')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400">
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Trạng thái đơn hàng</h3>
          
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <CircularProgress percentage={statusPercentages.confirmed} color="text-green-500" size={120} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{statusPercentages.confirmed}%</p>
                  <p className="text-xs text-gray-500">Thành công</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-600">Đã xác nhận</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.bookingsByStatus.confirmed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-sm text-gray-600">Chờ xử lý</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.bookingsByStatus.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600">Đã hủy</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.bookingsByStatus.cancelled}</span>
            </div>
          </div>
        </div>

        
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/admin/movies/create" className="group flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-medium text-gray-700 text-sm">Thêm phim</span>
            </a>

            <a href="/admin/cinema-systems" className="group flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl hover:from-violet-100 hover:to-purple-200 transition-all">
              <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
              <span className="font-medium text-gray-700 text-sm">Quản lý hãng</span>
            </a>

            <a href="/admin/cinemas" className="group flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl hover:from-emerald-100 hover:to-green-200 transition-all">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700 text-sm">Quản lý rạp</span>
            </a>

            <a href="/admin/transactions" className="group flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl hover:from-orange-100 hover:to-amber-200 transition-all">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="font-medium text-gray-700 text-sm">Xem giao dịch</span>
            </a>
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Giao dịch gần đây</h3>
              <a href="/admin/transactions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Xem tất cả →
              </a>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {stats.recentBookings.length > 0 ? (
              stats.recentBookings.map((booking, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                      {booking.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {booking.showtime?.movie?.title || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.user?.full_name || 'Khách'} • {booking.seats?.length || 0} ghế
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatFullCurrency(booking.total_price || 0)}</p>
                      <p className="text-xs text-gray-400">
                        {formatBookingDate(booking.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <p className="text-gray-500">Chưa có giao dịch nào</p>
              </div>
            )}
          </div>
        </div>

        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Phim mới thêm</h3>
              <a href="/admin/movies" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Xem tất cả →
              </a>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {stats.recentMovies.length > 0 ? (
              stats.recentMovies.map((movie, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {movie.poster_url ? (
                        <img
                          src={getCloudinaryImageUrl(movie.poster_url, movieImagePresets.posterThumb)}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{movie.title}</p>
                      <p className="text-sm text-gray-500">
                        {movie.genres && movie.genres.length > 0
                          ? movie.genres.map((g) => g.name).join(', ')
                          : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {movie.duration || 0} phút
                        </span>
                        {(movie.rating || 0) > 0 && (
                          <span className="text-xs text-yellow-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {movie.rating}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      movie.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {movie.is_active ? 'Đang chiếu' : 'Ngừng chiếu'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
                <p className="text-gray-500">Chưa có phim nào</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
