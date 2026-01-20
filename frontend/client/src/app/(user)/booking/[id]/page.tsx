'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IShowtime } from '@/types';

// Hàm chuyển đổi số thành chữ (0 -> A, 1 -> B...)
const getRowLabel = (index: number) => {
  return String.fromCharCode(65 + index);
};

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const showtimeId = params.id;

  const [showtime, setShowtime] = useState<IShowtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'captureWallet' | 'payWithATM' | 'payWithCC'>('captureWallet');

  // 1. Lấy dữ liệu suất chiếu
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
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
  }, [showtimeId]);

  // 2. Xử lý chọn ghế
  const handleSeatClick = (seatName: string, isBooked: boolean) => {
    if (isBooked) return;

    if (selectedSeats.includes(seatName)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatName));
    } else {
      if (selectedSeats.length >= 8) {
        alert("Bạn chỉ được chọn tối đa 8 ghế!");
        return;
      }
      setSelectedSeats(prev => [...prev, seatName]);
    }
  };

  // 3. Mở modal xác nhận thanh toán
  const handleProceedToPayment = () => {
    if (selectedSeats.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ghế!");
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      alert("Bạn cần đăng nhập để đặt vé!");
      router.push('/login');
      return;
    }

    setShowPaymentModal(true);
  };

  // 4. Xử lý thanh toán MoMo
  const handleMomoPayment = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
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
          payment_type: selectedPaymentType
        })
      });

      const data = await res.json();

      if (res.ok && data.payUrl) {
        // Redirect đến trang thanh toán MoMo
        window.location.href = data.payUrl;
      } else {
        alert(`Lỗi: ${data.message || 'Không thể tạo thanh toán MoMo'}`);
        setProcessing(false);
      }
    } catch (error) {
      console.error("Lỗi tạo thanh toán MoMo:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại.");
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

                return (
                  <button
                    key={seatName}
                    disabled={isBooked}
                    onClick={() => handleSeatClick(seatName, isBooked)}
                    className={`
                      w-10 h-10 rounded-t-lg text-xs font-bold transition
                      flex items-center justify-center
                      ${isBooked
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' // Đã đặt (Xám đậm/Đỏ)
                        : isSelected
                          ? 'bg-green-500 text-white shadow-[0_0_10px_#22c55e] transform scale-110' // Đang chọn
                          : 'bg-gray-200 text-gray-900 hover:bg-white' // Trống
                      }
                    `}
                  >
                    {isBooked ? 'X' : seatName}
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
          <div className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center font-bold text-xs">X</div>
          <span className="text-gray-400">Đã bán</span>
        </div>
      </div>

      {/* FOOTER THANH TOÁN (STICKY) */}
      <div className="fixed bottom-0 left-0 w-full bg-gray-800 border-t border-gray-700 p-4">
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
                {(selectedSeats.length * price).toLocaleString()}đ
              </p>
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

      {/* MODAL XÁC NHẬN THANH TOÁN MOMO */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Thanh Toán Online
              </h2>
            </div>

            {/* Content */}
            <div className="p-6">
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
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tổng tiền:</span>
                      <span className="font-bold text-red-600 text-xl">
                        {(selectedSeats.length * price).toLocaleString()}đ
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
            <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
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

    </div>
  );
}