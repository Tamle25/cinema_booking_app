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
  const [processing, setProcessing] = useState(false); // Trạng thái đang bấm nút Đặt vé

  // 1. Lấy dữ liệu suất chiếu
  useEffect(() => {
    const fetchShowtime = async () => {
      try {
        const res = await fetch(`http://localhost:4000/showtimes/${showtimeId}`);
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
    if (isBooked) return; // Ghế đã đặt thì bỏ qua

    if (selectedSeats.includes(seatName)) {
      // Nếu đã chọn -> Bỏ chọn
      setSelectedSeats(prev => prev.filter(s => s !== seatName));
    } else {
      // Nếu chưa chọn -> Thêm vào (Giới hạn tối đa 8 ghế)
      if (selectedSeats.length >= 8) {
        alert("Bạn chỉ được chọn tối đa 8 ghế!");
        return;
      }
      setSelectedSeats(prev => [...prev, seatName]);
    }
  };

  // 3. Xử lý Đặt vé (Gọi API)
  const handleBooking = async () => {
    if (selectedSeats.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ghế!");
      return;
    }

    // Kiểm tra đăng nhập qua token
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert("Bạn cần đăng nhập để đặt vé!");
      router.push('/login');
      return;
    }
    
    // Bắt đầu gọi API
    setProcessing(true);
    try {
      const res = await fetch('http://localhost:4000/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          showtime_id: showtimeId,
          seats: selectedSeats
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("🎉 Đặt vé thành công!");
        router.push('/'); // Hoặc chuyển sang trang Vé Của Tôi
      } else {
        alert(`Lỗi: ${data.message}`);
      }
    } catch (error) {
      console.error("Lỗi đặt vé:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
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
        <br/>Vui lòng kiểm tra lại Database.
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
              onClick={handleBooking}
              disabled={processing || selectedSeats.length === 0}
              className={`
                px-8 py-3 rounded-lg font-bold text-lg transition
                ${processing || selectedSeats.length === 0 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/50'
                }
              `}
            >
              {processing ? 'Đang xử lý...' : 'ĐẶT VÉ NGAY'}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}