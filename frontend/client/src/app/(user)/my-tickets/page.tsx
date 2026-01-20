'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface IBooking {
  _id: string;
  showtime: {
    _id: string;
    movie: {
      _id: string;
      title: string;
      poster_url: string;
      duration: number;
      genre: string;
    };
    cinema: {
      _id: string;
      name: string;
      address: string;
    };
    room: {
      _id: string;
      name: string;
      type: string;
    };
    start_time: string;
    end_time: string;
    price: number;
  };
  seats: string[];
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'used';
  createdAt: string;
}

// Format date helper
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Chờ xác nhận', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    confirmed: { label: 'Đã thanh toán', color: 'text-green-700', bg: 'bg-green-100' },
    cancelled: { label: 'Đã hủy', color: 'text-red-700', bg: 'bg-red-100' },
    used: { label: 'Đã sử dụng', color: 'text-gray-700', bg: 'bg-gray-100' },
  };

  const config = statusConfig[status] || statusConfig.confirmed;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
};

// Ticket Card Component
const TicketCard = ({ booking, onViewDetail }: { booking: IBooking; onViewDetail: (booking: IBooking) => void }) => {
  const isPast = new Date(booking.showtime?.start_time) < new Date();

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 ${isPast ? 'opacity-75' : ''
        }`}
    >
      <div className="flex flex-col md:flex-row">
        {/* Poster */}
        <div className="w-full md:w-40 h-48 md:h-auto relative flex-shrink-0">
          {booking.showtime?.movie?.poster_url ? (
            <img
              src={booking.showtime.movie.poster_url}
              alt={booking.showtime.movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
          )}
          {isPast && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-sm font-bold bg-black/70 px-3 py-1 rounded">Đã qua</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={booking.status || 'confirmed'} />
                {isPast && <span className="text-xs text-gray-500">• Đã chiếu</span>}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {booking.showtime?.movie?.title || 'Không rõ'}
              </h3>

              <div className="space-y-2 text-sm text-gray-600">
                {/* Cinema */}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{booking.showtime?.cinema?.name}</span>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {formatDate(booking.showtime?.start_time)} • {formatTime(booking.showtime?.start_time)}
                  </span>
                </div>

                {/* Room & Seats */}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span>
                    {booking.showtime?.room?.name} ({booking.showtime?.room?.type}) • Ghế: <span className="font-semibold text-gray-900">{booking.seats?.join(', ')}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Price & Action */}
            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-500">Tổng tiền</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(booking.total_price)}</p>
              </div>

              <button
                onClick={() => onViewDetail(booking)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Xem vé
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Ticket Detail Modal
const TicketDetailModal = ({ booking, onClose }: { booking: IBooking; onClose: () => void }) => {
  // Generate simple QR code placeholder (in production, use a QR library)
  const ticketCode = booking._id.slice(-8).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Movie Poster Header */}
        <div className="relative h-48 overflow-hidden rounded-t-3xl">
          {booking.showtime?.movie?.poster_url ? (
            <img
              src={booking.showtime.movie.poster_url}
              alt={booking.showtime.movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <StatusBadge status={booking.status || 'confirmed'} />
            <h2 className="text-2xl font-bold mt-2">{booking.showtime?.movie?.title}</h2>
            <p className="text-sm text-white/80">
              {booking.showtime?.movie?.genre} • {booking.showtime?.movie?.duration} phút
            </p>
          </div>
        </div>

        {/* Ticket Content */}
        <div className="p-6">
          {/* Ticket Code */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 mb-1">Mã vé</p>
            <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest">{ticketCode}</p>
          </div>

          {/* QR Code Placeholder */}
          <div className="bg-gray-100 rounded-2xl p-6 mb-6 text-center">
            <div className="w-40 h-40 mx-auto bg-white rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
              {/* Simple QR placeholder - in production use qrcode.react */}
              <div className="text-center">
                <svg className="w-20 h-20 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p className="text-xs text-gray-500">Mã QR</p>
                <p className="text-sm font-bold text-gray-700">{ticketCode}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Đưa mã này cho nhân viên rạp để nhận vé</p>
          </div>

          {/* Divider with scissors */}
          <div className="relative my-6">
            <div className="absolute left-0 top-1/2 w-4 h-8 bg-gray-100 rounded-r-full -translate-y-1/2 -translate-x-full" />
            <div className="absolute right-0 top-1/2 w-4 h-8 bg-gray-100 rounded-l-full -translate-y-1/2 translate-x-full" />
            <div className="border-t-2 border-dashed border-gray-200" />
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Rạp chiếu</p>
                <p className="font-semibold text-gray-900">{booking.showtime?.cinema?.name}</p>
                <p className="text-sm text-gray-500">{booking.showtime?.cinema?.address}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Ngày chiếu</p>
                <p className="font-semibold text-gray-900">{formatDate(booking.showtime?.start_time)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Suất chiếu</p>
                <p className="font-semibold text-gray-900">
                  {formatTime(booking.showtime?.start_time)} - {formatTime(booking.showtime?.end_time)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Phòng chiếu</p>
                <p className="font-semibold text-gray-900">
                  {booking.showtime?.room?.name}
                  <span className="text-sm text-gray-500 ml-1">({booking.showtime?.room?.type})</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Số ghế</p>
                <p className="font-semibold text-gray-900">{booking.seats?.join(', ')}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Tổng thanh toán</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(booking.total_price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Số vé</p>
                  <p className="text-2xl font-bold text-gray-900">{booking.seats?.length}</p>
                </div>
              </div>
            </div>

            {/* Booking time */}
            <div className="pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Đặt vé lúc: {new Date(booking.createdAt).toLocaleString('vi-VN')}
              </p>
              <p className="text-xs text-gray-400">
                Mã giao dịch: #{booking._id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MyTicketsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<IBooking | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // Check if user is logged in
    if (!user) {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
    }

    // Fetch user's bookings
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/bookings/my-bookings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setBookings(data);
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Lỗi tải danh sách vé:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user, authLoading, router, API_URL]);

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    const showtime = new Date(booking.showtime?.start_time);
    const now = new Date();

    if (filter === 'upcoming') return showtime >= now;
    if (filter === 'past') return showtime < now;
    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Stats
  const upcomingCount = bookings.filter(b => new Date(b.showtime?.start_time) >= new Date()).length;
  const pastCount = bookings.filter(b => new Date(b.showtime?.start_time) < new Date()).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vé đã đặt</h1>
          <p className="text-gray-500 mt-1">Quản lý và theo dõi các vé xem phim của bạn</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Tổng vé</p>
            <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Sắp chiếu</p>
            <p className="text-2xl font-bold text-green-600">{upcomingCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Đã chiếu</p>
            <p className="text-2xl font-bold text-gray-400">{pastCount}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${filter === 'all'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            Tất cả ({bookings.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${filter === 'upcoming'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            Sắp chiếu ({upcomingCount})
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${filter === 'past'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
          >
            Đã chiếu ({pastCount})
          </button>
        </div>

        {/* Ticket List */}
        {paginatedBookings.length > 0 ? (
          <>
            <div className="space-y-4">
              {paginatedBookings.map((booking) => (
                <TicketCard
                  key={booking._id}
                  booking={booking}
                  onViewDetail={setSelectedBooking}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-semibold transition ${currentPage === page
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition ${currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Page Info */}
            <p className="text-center text-sm text-gray-500 mt-4">
              Hiển thị {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredBookings.length)} trong tổng số {filteredBookings.length} vé
            </p>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'Chưa có vé nào' : filter === 'upcoming' ? 'Không có vé sắp chiếu' : 'Không có vé đã chiếu'}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all'
                ? 'Bạn chưa đặt vé xem phim nào. Hãy khám phá các phim đang chiếu!'
                : filter === 'upcoming'
                  ? 'Bạn không có suất chiếu nào sắp tới.'
                  : 'Bạn chưa có lịch sử xem phim.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              Xem phim đang chiếu
            </Link>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {
        selectedBooking && (
          <TicketDetailModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
          />
        )
      }
    </div >
  );
}
