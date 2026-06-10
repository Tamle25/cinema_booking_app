'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IShowtime, ISelectedCombo, IBooking, IUserVoucher } from '@/types';
import ComboSelector from '@/components/ComboSelector';
import { toastWarning, toastError, toastInfo, toastSuccess } from '@/utils/toast';
import { toast } from 'react-toastify';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

interface ILockedSeat {
  userId?: string;
  expiresAt: number;
  socketId: string;
}

const getRowLabel = (index: number) => {
  return String.fromCharCode(65 + index);
};

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const showtimeId = params.id as string;

  const { socket, isConnected, hasEverConnected } = useSocket();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [showtime, setShowtime] = useState<IShowtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [lockedSeats, setLockedSeats] = useState<Record<string, ILockedSeat>>({});
  const [pendingLockSeats, setPendingLockSeats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'captureWallet' | 'payWithATM' | 'payWithCC'>('captureWallet');
  const [selectedCombos, setSelectedCombos] = useState<ISelectedCombo[]>([]);
  const [pendingBooking, setPendingBooking] = useState<IBooking | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);

  const [membershipDiscountPercent, setMembershipDiscountPercent] = useState<number>(0);
  const [membershipRank, setMembershipRank] = useState<string>('Member');
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string>('');
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [myVouchers, setMyVouchers] = useState<IUserVoucher[]>([]);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState<boolean>(false);
  const [voucherError, setVoucherError] = useState<string>('');
  const [showVoucherDropdown, setShowVoucherDropdown] = useState<boolean>(false);

  const DISCONNECT_TOAST_ID = 'ws-disconnect-toast';
  const disconnectToastShownRef = useRef(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!socket || !showtimeId) return;

    if (socket.connected) {
      socket.emit('join_showtime', { showtimeId, userId });
    }

    const handleSeatStateSync = (data: { showtimeId: string; lockedSeats: Record<string, ILockedSeat> }) => {
      if (data.showtimeId === showtimeId) {
        setLockedSeats(data.lockedSeats || {});

        if (userId) {
          const mySeats: string[] = [];
          Object.entries(data.lockedSeats || {}).forEach(([seatName, lock]) => {
            if (lock.userId === userId) {
              mySeats.push(seatName);
            }
          });
          if (mySeats.length > 0) {
            setSelectedSeats(prev => {
              const merged = [...new Set([...prev, ...mySeats])];
              return merged;
            });
          }
        }
      }
    };

    const handleSeatLocked = (data: { showtimeId: string; seatName: string; lockedBy: string; userId?: string; expiresAt: number }) => {
      if (data.showtimeId === showtimeId) {
        setLockedSeats(prev => ({
          ...prev,
          [data.seatName]: {
            userId: data.userId,
            expiresAt: data.expiresAt,
            socketId: data.lockedBy
          }
        }));

        const isMyLock = (userId && data.userId === userId) || (data.lockedBy === socket.id);

        setPendingLockSeats(prev => {
          if (prev.has(data.seatName) && isMyLock) {
            const next = new Set(prev);
            next.delete(data.seatName);
            return next;
          }
          return prev;
        });

        if (isMyLock) {
          setSelectedSeats(prev => {
            if (!prev.includes(data.seatName)) {
              return [...prev, data.seatName];
            }
            return prev;
          });
        }
      }
    };

    const handleSeatUnlocked = (data: { showtimeId: string; seatName: string }) => {
      if (data.showtimeId === showtimeId) {
        setLockedSeats(prev => {
          const next = { ...prev };
          delete next[data.seatName];
          return next;
        });

        setShowtime(prev => {
          if (!prev) return null;
          return {
            ...prev,
            booked_seats: (prev.booked_seats || []).filter(s => s !== data.seatName)
          };
        });
      }
    };

    const handleSeatLockExpired = (data: { showtimeId: string; seatName: string }) => {
      if (data.showtimeId === showtimeId) {
        setLockedSeats(prev => {
          const next = { ...prev };
          delete next[data.seatName];
          return next;
        });

        setSelectedSeats(prev => {
          if (prev.includes(data.seatName)) {
            toastWarning(`Ghế ${data.seatName} đã hết thời gian giữ và tự động giải phóng!`);
            return prev.filter(s => s !== data.seatName);
          }
          return prev;
        });
      }
    };

    const handleSeatBooked = (data: { showtimeId: string; seats: string[] }) => {
      if (data.showtimeId === showtimeId) {
        setShowtime(prev => {
          if (!prev) return null;
          const updatedBooked = [...new Set([...(prev.booked_seats || []), ...data.seats])];
          return {
            ...prev,
            booked_seats: updatedBooked,
          };
        });

        setLockedSeats(prev => {
          const next = { ...prev };
          data.seats.forEach(seat => delete next[seat]);
          return next;
        });

        setSelectedSeats(prev => {
          const filtered = prev.filter(seat => !data.seats.includes(seat));
          if (prev.length !== filtered.length) {
            toastWarning("Một hoặc nhiều ghế bạn chọn vừa được thanh toán thành công bởi người khác!");
          }
          return filtered;
        });

        setPendingLockSeats(prev => {
          const next = new Set(prev);
          data.seats.forEach(seat => next.delete(seat));
          return next;
        });
      }
    };

    const handleSeatLockError = (data: { seatName: string; message: string }) => {
      toastError(data.message);
      setSelectedSeats(prev => prev.filter(s => s !== data.seatName));
      setPendingLockSeats(prev => {
        const next = new Set(prev);
        next.delete(data.seatName);
        return next;
      });
    };

    socket.on('seat_state_sync', handleSeatStateSync);
    socket.on('seat_locked', handleSeatLocked);
    socket.on('seat_unlocked', handleSeatUnlocked);
    socket.on('seat_lock_expired', handleSeatLockExpired);
    socket.on('seat_booked', handleSeatBooked);
    socket.on('seat_lock_error', handleSeatLockError);

    return () => {
      socket.off('seat_state_sync', handleSeatStateSync);
      socket.off('seat_locked', handleSeatLocked);
      socket.off('seat_unlocked', handleSeatUnlocked);
      socket.off('seat_lock_expired', handleSeatLockExpired);
      socket.off('seat_booked', handleSeatBooked);
      socket.off('seat_lock_error', handleSeatLockError);
      toast.dismiss(DISCONNECT_TOAST_ID);
      disconnectToastShownRef.current = false;
    };
  }, [socket, showtimeId, userId]);

  const selectedSeatsRef = useRef(selectedSeats);
  selectedSeatsRef.current = selectedSeats;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const pendingLockSeatsRef = useRef(pendingLockSeats);
  pendingLockSeatsRef.current = pendingLockSeats;
  const showtimeIdRef = useRef(showtimeId);
  showtimeIdRef.current = showtimeId;
  const socketRef = useRef(socket);
  socketRef.current = socket;

  useEffect(() => {
    if (!hasEverConnected) return;

    if (!isConnected) {
      const timer = setTimeout(() => {
        if (!disconnectToastShownRef.current) {
          disconnectToastShownRef.current = true;
          toast.warn('Đang mất kết nối với máy chủ. Đang thử kết nối lại...', {
            toastId: DISCONNECT_TOAST_ID,
            autoClose: 30000,
            closeOnClick: false,
            closeButton: false,
            hideProgressBar: true,
            icon: false,
          });
        }
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      if (disconnectToastShownRef.current) {
        toast.dismiss(DISCONNECT_TOAST_ID);
        disconnectToastShownRef.current = false;
        toastInfo('Đã kết nối lại thành công!');
      }
    }
  }, [isConnected, hasEverConnected]);

  useEffect(() => {
    if (socket && isConnected && showtimeId) {
      socket.emit('join_showtime', { showtimeId, userId });

      const seatsToLock = [...new Set([...selectedSeatsRef.current, ...pendingLockSeatsRef.current])];
      if (seatsToLock.length > 0) {
        setPendingLockSeats(new Set(seatsToLock));
        seatsToLock.forEach(seatName => {
          socket.emit('lock_seat', { showtimeId, seatName, userId });
        });
      }
    }
  }, [socket, isConnected, showtimeId, userId]);

  useEffect(() => {
    return () => {
      const currentSocket = socketRef.current;
      const currentShowtimeId = showtimeIdRef.current;
      const currentSeats = selectedSeatsRef.current;

      if (currentSocket && currentSocket.connected && currentShowtimeId) {
        if (currentSeats.length > 0) {
          currentSeats.forEach(seatName => {
            currentSocket.emit('unlock_seat', { showtimeId: currentShowtimeId, seatName });
          });
        }
        currentSocket.emit('leave_showtime', { showtimeId: currentShowtimeId });
      }
    };
  }, [showtimeId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentSocket = socketRef.current;
      const currentShowtimeId = showtimeIdRef.current;
      const currentSeats = selectedSeatsRef.current;

      if (currentSocket && currentSocket.connected && currentShowtimeId) {
        currentSeats.forEach(seatName => {
          currentSocket.emit('unlock_seat', { showtimeId: currentShowtimeId, seatName });
        });
        currentSocket.emit('leave_showtime', { showtimeId: currentShowtimeId });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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

  useEffect(() => {
    const checkPendingBooking = async () => {
      const token = localStorage.getItem('access_token');
      if (!token || !showtimeId) return;

      try {
        const res = await fetch(`${API_URL}/bookings/my-bookings`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const bookings: IBooking[] = await res.json();

        const pending = bookings.find(
          (b) => b.status === 'pending' &&
            (typeof b.showtime === 'object' && b.showtime !== null
              ? b.showtime._id === showtimeId
              : b.showtime === showtimeId)
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

  const handleSeatClick = (seatName: string, isBooked: boolean) => {
    if (isBooked) return;

    const isLockedByOthers = lockedSeats[seatName] && 
      (userId 
        ? lockedSeats[seatName].userId !== userId 
        : lockedSeats[seatName].socketId !== socket?.id);
    if (isLockedByOthers) {
      toastWarning("Ghế này đang được giữ bởi người dùng khác!");
      return;
    }

    if (selectedSeats.includes(seatName)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatName));
      setPendingLockSeats(prev => {
        const next = new Set(prev);
        next.delete(seatName);
        return next;
      });
      if (socket && isConnected) {
        socket.emit('unlock_seat', { showtimeId, seatName });
      }
    } else {
      if (selectedSeats.length >= 8) {
        toastWarning("Bạn chỉ được chọn tối đa 8 ghế!");
        return;
      }

      setSelectedSeats(prev => [...prev, seatName]);

      if (socket && isConnected) {
        setPendingLockSeats(prev => new Set(prev).add(seatName));
        socket.emit('lock_seat', { showtimeId, seatName, userId });
      } else {
        setPendingLockSeats(prev => new Set(prev).add(seatName));
      }
    }
  };

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

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token || !userId) return;

      try {
        const resDiscount = await fetch(`${API_URL}/loyalty/membership-discount`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resDiscount.ok) {
          const data = await resDiscount.json();
          setMembershipDiscountPercent(data.discountPercent || 0);
          setMembershipRank(data.membershipRank || 'Member');
        }

        const resVouchers = await fetch(`${API_URL}/vouchers/my-vouchers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resVouchers.ok) {
          const data = await resVouchers.json();
          setMyVouchers(data);
        }
      } catch (error) {
        console.error('Lỗi tải dữ liệu user cho booking:', error);
      }
    };

    if (userId && showtime) {
      fetchUserData();
    }
  }, [userId, showtime, API_URL]);

  const handleApplyVoucher = async (codeToApply?: string) => {
    if (!showtime) return;
    const code = (codeToApply || voucherCode).trim().toUpperCase();
    if (!code) {
      setVoucherError('Vui lòng nhập mã voucher');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return;

    setIsValidatingVoucher(true);
    setVoucherError('');

    const originalPrice = ticketTotal + comboTotal;
    const membershipDiscount = Math.floor((originalPrice * membershipDiscountPercent) / 100);
    const priceAfterMember = originalPrice - membershipDiscount;

    try {
      const res = await fetch(`${API_URL}/vouchers/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          cinemaId: showtime.cinema?._id || showtime.cinema,
          orderAmount: priceAfterMember
        })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setVoucherDiscount(data.discount || 0);
        setAppliedVoucherCode(code);
        setVoucherCode(code);
        setVoucherError('');
        toastSuccess('Áp dụng mã giảm giá thành công!');
        setShowVoucherDropdown(false);
      } else {
        setVoucherError(data.message || 'Mã voucher không hợp lệ');
        setVoucherDiscount(0);
        setAppliedVoucherCode('');
        toastError(data.message || 'Mã voucher không hợp lệ');
      }
    } catch {
      setVoucherError('Lỗi kiểm tra voucher');
      toastError('Không thể kết nối tới server');
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setAppliedVoucherCode('');
    setVoucherDiscount(0);
    setVoucherError('');
  };

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
          voucherCode: appliedVoucherCode || undefined,
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

  if (!showtime.room) {
    return (
      <div className="text-center py-20 text-red-500">
        Lỗi dữ liệu: Suất chiếu này đang gắn với một Phòng không tồn tại (ID Phòng bị sai).
        <br />Vui lòng kiểm tra lại Database.
      </div>
    );
  }

  const { room, price, booked_seats } = showtime;

  const comboTotal = selectedCombos.reduce((sum, sc) => sum + sc.combo.price * sc.quantity, 0);
  const ticketTotal = selectedSeats.length * price;
  const grandTotal = ticketTotal + comboTotal;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-10">

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-yellow-500 mb-2">{showtime.movie?.title || "Tên Phim"}</h1>
        <p className="text-gray-400">
          {showtime.cinema?.name} • {room?.name} • {new Date(showtime.start_time).toLocaleString('vi-VN')}
        </p>
      </div>

      <div className="w-full max-w-3xl mb-10 px-4">
        <div className="w-full h-2 bg-white shadow-[0_10px_30px_rgba(255,255,255,0.3)] rounded-full mb-2"></div>
        <p className="text-center text-gray-500 text-sm uppercase tracking-widest">Màn hình</p>
      </div>

      <div className="flex flex-col gap-2 mb-10 overflow-x-auto max-w-full px-4">
        {Array.from({ length: room.rows }).map((_, rowIndex) => {
          const rowLabel = getRowLabel(rowIndex);

          return (
            <div key={rowIndex} className="flex gap-2 justify-center min-w-max">
              {Array.from({ length: room.columns }).map((_, colIndex) => {
                const seatNumber = colIndex + 1;
                const seatName = `${rowLabel}${seatNumber}`;

                const isBooked = booked_seats.includes(seatName);
                const isSelected = selectedSeats.includes(seatName);
                const isLockedByOthers = lockedSeats[seatName] && 
                  (userId 
                    ? lockedSeats[seatName].userId !== userId 
                    : lockedSeats[seatName].socketId !== socket?.id);
                const isPendingLock = pendingLockSeats.has(seatName);

                return (
                  <button
                    key={seatName}
                    disabled={isBooked || isLockedByOthers}
                    onClick={() => handleSeatClick(seatName, isBooked)}
                    className={`
                      w-10 h-10 rounded-t-lg text-xs font-bold transition
                      flex items-center justify-center
                      ${isBooked
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : isSelected && isPendingLock
                          ? 'bg-green-400 text-white shadow-[0_0_10px_#4ade80] transform scale-110 animate-pulse'
                          : isSelected
                            ? 'bg-green-500 text-white shadow-[0_0_10px_#22c55e] transform scale-110'
                            : isLockedByOthers
                              ? 'bg-amber-500 text-white cursor-not-allowed shadow-[0_0_10px_#f59e0b]'
                              : 'bg-gray-200 text-gray-900 hover:bg-white'
                      }
                    `}
                  >
                    {isBooked ? (
                      'X'
                    ) : isLockedByOthers ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      seatName
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

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

      {showComboModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-800">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <div>
                <h2 className="text-2xl font-bold text-yellow-500 leading-tight">Thêm bắp nước?</h2>
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
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ComboSelector
                selectedCombos={selectedCombos}
                onCombosChange={setSelectedCombos}
                cinemaId={showtime?.cinema?._id}
              />
            </div>

            <div className="p-6 bg-gray-900 border-t border-gray-800 flex flex-col sm:flex-row items-center gap-3 justify-between flex-shrink-0">
              <button
                onClick={handleProceedFromComboToPayment}
                className="w-full sm:w-auto px-6 py-3 bg-transparent border-2 border-gray-600 text-gray-300 rounded-xl font-bold hover:bg-gray-800 hover:text-white transition-colors order-2 sm:order-1"
              >
                Bỏ qua và thanh toán
              </button>
              
              <div className="w-full sm:w-auto flex items-center gap-4 relative order-1 sm:order-2">
                 <div className="hidden sm:block text-right">
                   <div className="text-xs text-gray-400 font-medium">Tổng vé và combo</div>
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

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Thanh toán online
              </h2>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
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
                  
                  <div className="border-t pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tiền vé:</span>
                      <span className="font-medium text-gray-900">
                        {ticketTotal.toLocaleString()}đ
                      </span>
                    </div>
                    {comboTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tiền bắp nước:</span>
                        <span className="font-medium text-gray-900">
                          {comboTotal.toLocaleString()}đ
                        </span>
                      </div>
                    )}
                    
                    {membershipDiscountPercent > 0 && (
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>Thành viên ({membershipRank} -{membershipDiscountPercent}%):</span>
                        <span>
                          -{Math.floor(((ticketTotal + comboTotal) * membershipDiscountPercent) / 100).toLocaleString()}đ
                        </span>
                      </div>
                    )}

                    {voucherDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>Voucher giảm giá ({appliedVoucherCode}):</span>
                        <span>
                          -{voucherDiscount.toLocaleString()}đ
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between mt-2 pt-2 border-t">
                      <span className="font-bold text-gray-700">Tổng thanh toán:</span>
                      <span className="font-black text-red-600 text-xl">
                        {(() => {
                          const originalPrice = ticketTotal + comboTotal;
                          const membershipDiscount = Math.floor((originalPrice * membershipDiscountPercent) / 100);
                          const finalPrice = Math.max(originalPrice - membershipDiscount - voucherDiscount, 0);
                          return finalPrice.toLocaleString();
                        })()}đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 mb-6 relative">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Ưu đãi và voucher
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Nhập mã voucher"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      disabled={!!appliedVoucherCode || isValidatingVoucher}
                      className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 uppercase font-semibold"
                    />
                    {appliedVoucherCode && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">
                        Đã áp dụng
                      </span>
                    )}
                  </div>
                  {appliedVoucherCode ? (
                    <button
                      onClick={handleRemoveVoucher}
                      className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-semibold transition"
                    >
                      Hủy
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplyVoucher()}
                      disabled={isValidatingVoucher || !voucherCode.trim()}
                      className="px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 rounded-lg text-sm font-semibold disabled:bg-pink-300 transition"
                    >
                      {isValidatingVoucher ? '...' : 'Áp dụng'}
                    </button>
                  )}
                </div>
                {voucherError && <p className="text-xs text-red-500 mt-1">{voucherError}</p>}
                
                {myVouchers.filter(v => v.status === 'UNUSED' && new Date(v.expiredAt) > new Date()).length > 0 && !appliedVoucherCode && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowVoucherDropdown(!showVoucherDropdown)}
                      className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 focus:outline-none cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      Chọn từ voucher của bạn ({myVouchers.filter(v => v.status === 'UNUSED' && new Date(v.expiredAt) > new Date()).length})
                    </button>
                    
                    {showVoucherDropdown && (
                      <div className="absolute z-20 mt-1 w-full left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 max-h-48 overflow-y-auto space-y-2 text-gray-700 custom-scrollbar">
                        {myVouchers
                          .filter(v => v.status === 'UNUSED' && new Date(v.expiredAt) > new Date())
                          .map((uv) => (
                            <div 
                              key={uv._id} 
                              onClick={() => {
                                setVoucherCode(uv.code);
                                handleApplyVoucher(uv.code);
                              }}
                              className="p-2 border border-gray-100 hover:border-pink-200 hover:bg-pink-50/50 rounded-lg cursor-pointer transition text-left"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-pink-600">{uv.code}</span>
                                <span className="text-[10px] text-gray-400">Hạn: {new Date(uv.expiredAt).toLocaleDateString('vi-VN')}</span>
                              </div>
                              <p className="text-xs font-semibold text-gray-800 mt-1 truncate">{uv.voucherTemplate.name}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{uv.voucherTemplate.description}</p>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Chọn phương thức thanh toán</h3>

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
                  <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                    MoMo
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Ví MoMo hoặc QR</p>
                    <p className="text-xs text-gray-500">Quét QR hoặc mở app MoMo</p>
                  </div>
                </label>

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
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0">
                    ATM
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Thẻ ATM nội địa</p>
                    <p className="text-xs text-gray-500">Vietcombank, BIDV, Techcombank...</p>
                  </div>
                </label>

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
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Thẻ quốc tế</p>
                    <p className="text-xs text-gray-500">Visa, Mastercard, JCB</p>
                  </div>
                </label>
              </div>
            </div>

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
                    Thanh toán ngay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPendingModal && pendingBooking && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Đơn hàng chưa thanh toán
              </h2>
            </div>

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
                  'Thanh toán tiếp'
                )}
              </button>
              <button
                onClick={handleCancelPending}
                disabled={pendingAction}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                Hủy đơn và đặt vé mới
              </button>
              <button
                onClick={() => setShowPendingModal(false)}
                disabled={pendingAction}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
