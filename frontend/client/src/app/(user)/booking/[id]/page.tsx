'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IShowtime, ISelectedCombo } from '@/types';
import ComboSelector from '@/components/ComboSelector';
import { toastWarning, toastError } from '@/utils/toast';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

// Hàm chuyển đổi số thành chữ (0 -> A, 1 -> B...)
const getRowLabel = (index: number) => {
  return String.fromCharCode(65 + index);
};

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const showtimeId = params.id as string;

  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [showtime, setShowtime] = useState<IShowtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  // Lưu danh sách các ghế đang bị người khác khóa realtime
  const [lockedSeats, setLockedSeats] = useState<Record<string, { userId?: string; expiresAt: number; socketId: string }>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'captureWallet' | 'payWithATM' | 'payWithCC'>('captureWallet');
  const [selectedCombos, setSelectedCombos] = useState<ISelectedCombo[]>([]);
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Realtime Socket event listeners
  useEffect(() => {
    if (!socket || !showtimeId) return;

    // Join room theo showtimeId
    socket.emit('join_showtime', { showtimeId, userId });

    // Nhận danh sách ghế đang bị khóa khi vừa join room
    socket.on('seat_state_sync', (data: { showtimeId: string; lockedSeats: any }) => {
      if (data.showtimeId === showtimeId) {
        setLockedSeats(data.lockedSeats || {});
      }
    });

    // Nhận thông báo một ghế bị khóa
    socket.on('seat_locked', (data: { showtimeId: string; seatName: string; lockedBy: string; userId?: string; expiresAt: number }) => {
      if (data.showtimeId === showtimeId) {
        setLockedSeats(prev => ({
          ...prev,
          [data.seatName]: {
            userId: data.userId,
            expiresAt: data.expiresAt,
            socketId: data.lockedBy
          }
        }));
      }
    });

    // Nhận thông báo một ghế được mở khóa
    socket.on('seat_unlocked', (data: { showtimeId: string; seatName: string }) => {
      if (data.showtimeId === showtimeId) {
        setLockedSeats(prev => {
          const next = { ...prev };
          delete next[data.seatName];
          return next;
        });
      }
    });

    // Nhận thông báo một ghế bị hết hạn giữ
    socket.on('seat_lock_expired', (data: { showtimeId: string; seatName: string }) => {
      if (data.showtimeId === showtimeId) {
        // Giải phóng khỏi lockedSeats
        setLockedSeats(prev => {
          const next = { ...prev };
          delete next[data.seatName];
          return next;
        });

        // Nếu ghế bị hết hạn là ghế của chính mình đang chọn
        setSelectedSeats(prev => {
          if (prev.includes(data.seatName)) {
            toastWarning(`Ghế ${data.seatName} đã hết thời gian giữ và tự động giải phóng!`);
            return prev.filter(s => s !== data.seatName);
          }
          return prev;
        });
      }
    });

    // Nhận thông báo ghế đã được đặt thành công (booked) qua DB
    socket.on('seat_booked', (data: { showtimeId: string; seats: string[] }) => {
      if (data.showtimeId === showtimeId) {
        // Cập nhật trạng thái booked_seats cho showtime
        setShowtime(prev => {
          if (!prev) return null;
          const updatedBooked = [...new Set([...(prev.booked_seats || []), ...data.seats])];
          return {
            ...prev,
            booked_seats: updatedBooked,
          };
        });

        // Xóa khỏi lockedSeats
        setLockedSeats(prev => {
          const next = { ...prev };
          data.seats.forEach(seat => delete next[seat]);
          return next;
        });

        // Xóa khỏi selectedSeats nếu mình cũng đang chọn ghế đó
        setSelectedSeats(prev => {
          const filtered = prev.filter(seat => !data.seats.includes(seat));
          if (prev.length !== filtered.length) {
            toastWarning("Một hoặc nhiều ghế bạn chọn vừa được thanh toán thành công bởi người khác!");
          }
          return filtered;
        });
      }
    });

    // Nhận lỗi từ websocket server (ví dụ lock trùng ghế)
    socket.on('seat_lock_error', (data: { seatName: string; message: string }) => {
      toastError(data.message);
      // Revert optimistic update
      setSelectedSeats(prev => prev.filter(s => s !== data.seatName));
    });

    return () => {
      socket.off('seat_state_sync');
      socket.off('seat_locked');
      socket.off('seat_unlocked');
      socket.off('seat_lock_expired');
      socket.off('seat_booked');
      socket.off('seat_lock_error');
      socket.emit('leave_showtime', { showtimeId });
    };
  }, [socket, showtimeId, userId]);

  // Tự động đồng bộ và lock lại ghế khi kết nối mạng/socket được thiết lập lại
  useEffect(() => {
    if (socket && isConnected && showtimeId) {
      socket.emit('join_showtime', { showtimeId, userId });
      // Thử lock lại các ghế mà client đang chọn trước khi mất kết nối
      selectedSeats.forEach(seatName => {
        socket.emit('lock_seat', { showtimeId, seatName, userId });
      });
    }
  }, [socket, isConnected, showtimeId]);

  // 1. Lấy dữ liệu suất chiếu
  useEffect(() => {
    const fetchShowtime = async () => {
      try {
        const res = await fetch(`${API_URL}/showtimes/${showtimeId}`);
        const data = await res.json();
        setShowtime(data);
      } catch (error) {
        console.error("Lỗi tải suất chiếu:", error);
      } finally {
        setLoading(false);
      }
    };
    if (showtimeId) fetchShowtime();
  }, [showtimeId, API_URL]);

  // 1b. Kiểm tra xem user có booking pending cho suất chiếu này không
  useEffect(() => {
    const checkPendingBooking = async () => {
      const token = localStorage.getItem('access_token');
      if (!token || !showtimeId) return;

      try {
        const res = await fetch(`${API_URL}/bookings/my-bookings`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const bookings = await res.json();

        // Tìm booking pending cho showtime này
        const pending = bookings.find(
          (b: any) => b.status === 'pending' &&
            (b.showtime?._id === showtimeId || b.showtime === showtimeId)
        );

        if (pending) {
          setPendingBooking(pending);
          setShowPendingModal(true);
        }
      } catch (error) {
        console.error('Lỗi kiểm tra booking pending:', error);
      }
    };
    checkPendingBooking();
  }, [showtimeId, API_URL]);

  // Xử lý Thanh Toán Lại booking pending
  const handleRetryPending = async () => {
    if (!pendingBooking) return;
    const token = localStorage.getItem('access_token');
    if (!token) {
      toastWarning('Bạn cần đăng nhập!');
      router.push('/login');
      return;
    }

    setPendingAction(true);
    try {
      const res = await fetch(`${API_URL}/payments/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: pendingBooking._id }),
      });
      const data = await res.json();

      if (res.status === 401) {
        toastWarning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
        localStorage.removeItem('access_token');
        router.push('/login');
        return;
      }

      if (res.ok && data.payUrl) {
        window.location.href = data.payUrl;
      } else {
        toastError(data.message || 'Không thể thanh toán lại. Đơn hàng có thể đã hết hạn.');
        setShowPendingModal(false);
        setPendingBooking(null);
        setPendingAction(false);
      }
    } catch (error) {
      console.error('Lỗi retry:', error);
      toastError('Có lỗi xảy ra.');
      setPendingAction(false);
    }
  };

  // Xử lý Hủy booking pending
  const handleCancelPending = async () => {
    if (!pendingBooking) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setPendingAction(true);
    try {
      const res = await fetch(`${API_URL}/payments/cancel-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: pendingBooking._id }),
      });

      if (res.status === 401) {
        toastWarning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
        localStorage.removeItem('access_token');
        router.push('/login');
        return;
      }

      if (res.ok) {
        setShowPendingModal(false);
        setPendingBooking(null);
        // Reload dữ liệu showtime để cập nhật ghế đã được release
        const showtimeRes = await fetch(`${API_URL}/showtimes/${showtimeId}`);
        const showtimeData = await showtimeRes.json();
        setShowtime(showtimeData);
      } else {
        const data = await res.json();
        toastError(data.message || 'Không thể hủy đơn hàng.');
      }
      setPendingAction(false);
    } catch (error) {
      console.error('Lỗi cancel:', error);
      toastError('Có lỗi xảy ra.');
      setPendingAction(false);
    }
  };

  // 2. Xử lý chọn ghế
  const handleSeatClick = (seatName: string, isBooked: boolean) => {
    if (isBooked) return;

    // Kiểm tra xem ghế có đang bị người khác khóa không
    const isLockedByOthers = lockedSeats[seatName] && lockedSeats[seatName].socketId !== socket?.id;
    if (isLockedByOthers) {
      toastWarning("Ghế này đang được giữ bởi người dùng khác!");
      return;
    }

    if (selectedSeats.includes(seatName)) {
      // 1. Optimistic update: Bỏ chọn local
      setSelectedSeats(prev => prev.filter(s => s !== seatName));
      // 2. Emit unlock cho websocket server
      if (socket && isConnected) {
        socket.emit('unlock_seat', { showtimeId, seatName });
      }
    } else {
      if (selectedSeats.length >= 8) {
        toastWarning("Bạn chỉ được chọn tối đa 8 ghế!");
        return;
      }

      // 1. Optimistic update: Chọn local
      setSelectedSeats(prev => [...prev, seatName]);

      // 2. Emit lock cho websocket server
      if (socket && isConnected) {
        socket.emit('lock_seat', { showtimeId, seatName, userId });
      } else {
        toastWarning("Đang ngắt kết nối với Realtime Server. Vui lòng đợi kết nối lại...");
      }
    }
  };

  // 3. Mở modal chọn combo thay vì payment
  const handleProceedToPayment = () => {
    if (selectedSeats.length === 0) {
      toastWarning("Vui lòng chọn ít nhất 1 ghế!");
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      toastWarning("Bạn cần đăng nhập để đặt vé!");
      router.push('/login');
      return;
    }

    setShowComboModal(true);
  };

  const handleProceedFromComboToPayment = () => {
    setShowComboModal(false);
    setShowPaymentModal(true);
  };

  // 4. Xử lý thanh toán MoMo
  const handleMomoPayment = async () => {
    const token = localStorage.getItem('access_token');
    setProcessing(true);
    setShowPaymentModal(false);

    try {
      const res = await fetch(`${API_URL}/payments/create-momo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          showtime_id: showtimeId,
          seats: selectedSeats,
          payment_type: selectedPaymentType,
          combos: selectedCombos.map(sc => ({
            combo_id: sc.combo._id,
            quantity: sc.quantity,
          })),
        })
      });

      const data = await res.json();

      if (res.status === 401) {
        toastWarning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
        localStorage.removeItem('access_token');
        router.push('/login');
        return;
      }

      if (res.ok && data.payUrl) {
        // Redirect đến trang thanh toán MoMo
        window.location.href = data.payUrl;
      } else {
        toastError(`Lỗi: ${data.message || 'Không thể tạo thanh toán MoMo'}`);
        setProcessing(false);
      }
    } catch (error) {
      console.error("Lỗi tạo thanh toán MoMo:", error);
      toastError("Có lỗi xảy ra, vui lòng thử lại.");
      setProcessing(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-white">Đang tải sơ đồ ghế...</div>;
  if (!showtime) return <div className="text-center py-20 text-white">Không tìm thấy suất chiếu</div>;

  // --- THÊM ĐOẠN KIỂM TRA NÀY ---
  if (!showtime.room) {
    return (
      <div className="text-center py-20 text-red-500">
        Lỗi dữ liệu: Suất chiếu này đang gắn với một Phòng không tồn tại (ID Phòng bị sai).
        <br />Vui lòng kiểm tra lại Database.
      </div>
    );
  }
  // ------------------------------

  const { room, price, booked_seats } = showtime;

  // Tính tổng tiền combo
  const comboTotal = selectedCombos.reduce((sum, sc) => sum + sc.combo.price * sc.quantity, 0);
  const ticketTotal = selectedSeats.length * price;
  const grandTotal = ticketTotal + comboTotal;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-10">

      {/* Header Info */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-yellow-500 mb-2">{showtime.movie?.title || "Tên Phim"}</h1>
        <p className="text-gray-400">
          {showtime.cinema?.name} • {room?.name} • {new Date(showtime.start_time).toLocaleString('vi-VN')}
        </p>
      </div>

      {/* MÀN HÌNH (SCREEN) */}
      <div className="w-full max-w-3xl mb-10 px-4">
        <div className="w-full h-2 bg-white shadow-[0_10px_30px_rgba(255,255,255,0.3)] rounded-full mb-2"></div>
        <p className="text-center text-gray-500 text-sm uppercase tracking-widest">Màn hình</p>
      </div>

      {/* SƠ ĐỒ GHẾ (SEAT GRID) */}
      <div className="flex flex-col gap-2 mb-10 overflow-x-auto max-w-full px-4">
        {Array.from({ length: room.rows }).map((_, rowIndex) => {
          const rowLabel = getRowLabel(rowIndex);

          return (
            <div key={rowIndex} className="flex gap-2 justify-center min-w-max">
              {/* Cột số ghế */}
              {Array.from({ length: room.columns }).map((_, colIndex) => {
                const seatNumber = colIndex + 1;
                const seatName = `${rowLabel}${seatNumber}`; // VD: A1, A2

                // Kiểm tra trạng thái
                const isBooked = booked_seats.includes(seatName);
                const isSelected = selectedSeats.includes(seatName);
                const isLockedByOthers = lockedSeats[seatName] && lockedSeats[seatName].socketId !== socket?.id;

                return (
                  <button
                    key={seatName}
                    disabled={isBooked || isLockedByOthers}
                    onClick={() => handleSeatClick(seatName, isBooked)}
                    className={`
                      w-10 h-10 rounded-t-lg text-xs font-bold transition
                      flex items-center justify-center
                      ${isBooked
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' // Đã bán (Xám đậm)
                        : isSelected
                          ? 'bg-green-500 text-white shadow-[0_0_10px_#22c55e] transform scale-110' // Đang chọn (Xanh lá)
                          : isLockedByOthers
                            ? 'bg-amber-500 text-white cursor-not-allowed shadow-[0_0_10px_#f59e0b]' // Đang bị người khác khóa (Cam/Vàng)
                            : 'bg-gray-200 text-gray-900 hover:bg-white' // Trống (Xám nhạt)
                      }
                    `}
                  >
                    {isBooked ? 'X' : isLockedByOthers ? '🔒' : seatName}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* CHÚ THÍCH (LEGEND) */}
      <div className="flex gap-6 mb-8 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
          <span className="text-gray-400">Ghế trống</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-green-500 rounded shadow-[0_0_5px_#22c55e]"></div>
          <span className="text-gray-400">Đang chọn</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-amber-500 rounded shadow-[0_0_5px_#f59e0b]"></div>
          <span className="text-gray-400">Đang bị giữ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center font-bold text-xs">X</div>
          <span className="text-gray-400">Đã bán</span>
        </div>
      </div>

      <div className="mb-24"></div>

      {/* FOOTER THANH TOÁN (STICKY) */}
      <div className="fixed bottom-0 left-0 w-full bg-gray-800 border-t border-gray-700 p-4 z-40">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">

          <div>
            <p className="text-gray-400 text-sm">Ghế đang chọn:</p>
            <p className="text-white font-bold text-lg">
              {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-gray-400 text-sm">Tổng tiền:</p>
              <p className="text-2xl font-bold text-green-400">
                {grandTotal.toLocaleString()}đ
              </p>
              {comboTotal > 0 && (
                <p className="text-xs text-gray-500">
                  (Vé: {ticketTotal.toLocaleString()}đ + Combo: {comboTotal.toLocaleString()}đ)
                </p>
              )}
            </div>

            <button
              onClick={handleProceedToPayment}
              disabled={processing || selectedSeats.length === 0}
              className={`
                px-8 py-3 rounded-lg font-bold text-lg transition
                ${processing || selectedSeats.length === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/50'
                }
              `}
            >
              {processing ? 'Đang xử lý...' : 'TIẾN HÀNH THANH TOÁN'}
            </button>
          </div>

        </div>
      </div>

      {/* MODAL CHỌN COMBO (UP-SELLING) */}
      {showComboModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-800">
            {/* Header Modal */}
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <div>
                <h2 className="text-2xl font-bold text-yellow-500 leading-tight">Thêm chút bỏng nước nhé? 🍿</h2>
                <p className="text-gray-400 text-sm mt-1">Hoàn thiện trải nghiệm xem phim của bạn.</p>
              </div>
              <button 
                onClick={handleProceedFromComboToPayment}
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Body - Combo Selector */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ComboSelector
                selectedCombos={selectedCombos}
                onCombosChange={setSelectedCombos}
                cinemaId={showtime?.cinema?._id}
              />
            </div>

            {/* Footer Modal */}
            <div className="p-6 bg-gray-900 border-t border-gray-800 flex flex-col sm:flex-row items-center gap-3 justify-between flex-shrink-0">
              <button
                onClick={handleProceedFromComboToPayment}
                className="w-full sm:w-auto px-6 py-3 bg-transparent border-2 border-gray-600 text-gray-300 rounded-xl font-bold hover:bg-gray-800 hover:text-white transition-colors order-2 sm:order-1"
              >
                Bỏ qua & Thanh toán
              </button>
              
              <div className="w-full sm:w-auto flex items-center gap-4 relative order-1 sm:order-2">
                 <div className="hidden sm:block text-right">
                   <div className="text-xs text-gray-400 font-medium">Tổng (Vé + Combo)</div>
                   <div className="text-xl font-bold text-green-400">{grandTotal.toLocaleString()} đ</div>
                 </div>
                 <button
                   onClick={handleProceedFromComboToPayment}
                   className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/30 transition-all flex items-center justify-center gap-2"
                 >
                   Tiếp tục 
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                   </svg>
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN THANH TOÁN MOMO */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Thanh Toán Online
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Thông tin đơn hàng</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phim:</span>
                    <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">
                      {showtime?.movie?.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rạp:</span>
                    <span className="font-medium text-gray-900">{showtime?.cinema?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ghế:</span>
                    <span className="font-semibold text-gray-900">{selectedSeats.join(', ')}</span>
                  </div>
                  {/* Chi tiết combo trong modal */}
                  {selectedCombos.length > 0 && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <span className="text-gray-500 text-xs font-semibold">Bắp nước:</span>
                      </div>
                      <div className="max-h-28 overflow-y-auto pr-1 space-y-1">
                        {selectedCombos.map((sc) => (
                          <div key={sc.combo._id} className="flex justify-between">
                            <span className="text-gray-600 text-sm">{sc.combo.name} × {sc.quantity}</span>
                            <span className="font-medium text-gray-900 text-sm">
                              {(sc.combo.price * sc.quantity).toLocaleString()}đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tiền vé:</span>
                      <span className="font-medium text-gray-900">
                        {ticketTotal.toLocaleString()}đ
                      </span>
                    </div>
                    {comboTotal > 0 && (
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Tiền bắp nước:</span>
                        <span className="font-medium text-gray-900">
                          {comboTotal.toLocaleString()}đ
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2 pt-2 border-t">
                      <span className="font-semibold text-gray-700">Tổng cộng:</span>
                      <span className="font-bold text-red-600 text-xl">
                        {grandTotal.toLocaleString()}đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="space-y-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Chọn phương thức thanh toán</h3>

                {/* Option 1: QR / Ví MoMo */}
                <label
                  className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedPaymentType === 'captureWallet'
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value="captureWallet"
                    checked={selectedPaymentType === 'captureWallet'}
                    onChange={() => setSelectedPaymentType('captureWallet')}
                    className="w-5 h-5 text-pink-600"
                  />
                  <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    MoMo
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Ví MoMo / QR Code</p>
                    <p className="text-xs text-gray-500">Quét QR hoặc mở app MoMo</p>
                  </div>
                </label>

                {/* Option 2: Thẻ ATM nội địa */}
                <label
                  className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedPaymentType === 'payWithATM'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value="payWithATM"
                    checked={selectedPaymentType === 'payWithATM'}
                    onChange={() => setSelectedPaymentType('payWithATM')}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xs">
                    ATM
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Thẻ ATM nội địa</p>
                    <p className="text-xs text-gray-500">Vietcombank, BIDV, Techcombank...</p>
                  </div>
                </label>

                {/* Option 3: Thẻ quốc tế */}
                <label
                  className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedPaymentType === 'payWithCC'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value="payWithCC"
                    checked={selectedPaymentType === 'payWithCC'}
                    onChange={() => setSelectedPaymentType('payWithCC')}
                    className="w-5 h-5 text-purple-600"
                  />
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Thẻ quốc tế</p>
                    <p className="text-xs text-gray-500">Visa, Mastercard, JCB</p>
                  </div>
                </label>
              </div>

              {/* Test Account Info - Dynamic based on selection */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                  {selectedPaymentType === 'captureWallet' && (
                    <><strong>🧪 Test MoMo:</strong> SĐT: 0900000000-9 | OTP: 000000</>
                  )}
                  {selectedPaymentType === 'payWithATM' && (
                    <><strong>🧪 Test ATM (NCB):</strong> Số thẻ: 9704198526191432198 | Tên: NGUYEN VAN A | Ngày: 07/15 | OTP: 123456</>
                  )}
                  {selectedPaymentType === 'payWithCC' && (
                    <><strong>🧪 Test Visa:</strong> Số thẻ: 4111111111111111 | Tên: NGUYEN VAN A | Hết hạn: 01/28 | CVV: 100</>
                  )}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Quay lại
              </button>
              <button
                onClick={handleMomoPayment}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-pink-600 text-white rounded-xl font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Thanh Toán Ngay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẢNH BÁO BOOKING PENDING */}
      {showPendingModal && pendingBooking && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Đơn Hàng Chưa Thanh Toán
              </h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Bạn có đơn hàng chưa hoàn tất thanh toán cho suất chiếu này:
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ghế:</span>
                  <span className="font-semibold text-gray-900">{pendingBooking.seats?.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tổng tiền:</span>
                  <span className="font-bold text-red-600">
                    {pendingBooking.total_price?.toLocaleString()}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Trạng thái:</span>
                  <span className="font-semibold text-amber-600">Chờ thanh toán</span>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Bạn muốn thanh toán tiếp đơn này hay hủy để đặt vé mới?
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex flex-col gap-3">
              <button
                onClick={handleRetryPending}
                disabled={pendingAction}
                className="w-full px-4 py-3 bg-pink-600 text-white rounded-xl font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pendingAction ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  'Thanh Toán Tiếp'
                )}
              </button>
              <button
                onClick={handleCancelPending}
                disabled={pendingAction}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                Hủy Đơn & Đặt Vé Mới
              </button>
              <button
                onClick={() => setShowPendingModal(false)}
                disabled={pendingAction}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Để Sau
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}