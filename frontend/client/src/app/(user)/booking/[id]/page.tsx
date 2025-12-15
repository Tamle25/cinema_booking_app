"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

// Giả lập danh sách ghế: 6 hàng (A-F), mỗi hàng 8 ghế
const ROWS = ["A", "B", "C", "D", "E", "F"];
const SEATS_PER_ROW = 8;

export default function BookingPage() {
  const params = useParams();
  const showtimeId = params.id;
  const router = useRouter();

  const [showtime, setShowtime] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]); // Danh sách ghế đang chọn
  const [loading, setLoading] = useState(true);

  // 1. Lấy thông tin suất chiếu từ Backend
  useEffect(() => {
    const fetchShowtime = async () => {
      try {
        const res = await axios.get(
          `http://localhost:4000/showtimes/${showtimeId}`
        );
        setShowtime(res.data);
      } catch (error) {
        console.error("Lỗi tải lịch chiếu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchShowtime();
  }, [showtimeId]);

  // 2. Xử lý khi bấm vào ghế
  const handleSeatClick = (seatId: string) => {
    // Nếu ghế đã có người đặt (có trong database) -> Không làm gì
    if (showtime.booked_seats.includes(seatId)) return;

    // Logic chọn/bỏ chọn
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatId)); // Bỏ chọn
    } else {
      setSelectedSeats([...selectedSeats, seatId]); // Chọn thêm
    }
  };

  if (loading)
    return <div className="text-center py-20">Đang tải sơ đồ ghế...</div>;
  if (!showtime)
    return <div className="text-center py-20">Không tìm thấy suất chiếu!</div>;

  // Tính tổng tiền
  const totalPrice = selectedSeats.length * showtime.price;
  // --- THÊM HÀM XỬ LÝ ĐẶT VÉ ---
  const handleBooking = async () => {
    try {
      if (
        !confirm(`Bạn có chắc muốn đặt ${selectedSeats.length} vé này không?`)
      )
        return;

      // Gọi API Backend chúng ta vừa viết
      await axios.post("http://localhost:4000/bookings", {
        showtimeId: showtimeId,
        seats: selectedSeats,
        price: selectedSeats.length * showtime.price, // Tính lại tổng tiền gửi lên
      });

      alert("🎉 Đặt vé thành công! Chúc bạn xem phim vui vẻ.");
      router.push("/"); // Chuyển hướng về trang chủ
    } catch (error: any) {
      // Nếu lỗi (ví dụ ghế vừa bị ai đó nhanh tay đặt mất)
      alert("Lỗi: " + (error.response?.data?.message || "Có lỗi xảy ra"));

      // Tải lại trang để cập nhật tình trạng ghế mới nhất
      window.location.reload();
    }
  };
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        {/* CỘT TRÁI: SƠ ĐỒ GHẾ */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Màn Hình Chiếu
          </h2>
          {/* Thanh màn hình giả lập */}
          <div className="h-2 bg-white shadow-[0_10px_20px_rgba(255,255,255,0.2)] mb-12 rounded-full mx-10"></div>

          <div className="flex flex-col gap-4 items-center">
            {ROWS.map((row) => (
              <div key={row} className="flex gap-4">
                {Array.from({ length: SEATS_PER_ROW }, (_, i) => {
                  const seatNumber = i + 1;
                  const seatId = `${row}${seatNumber}`; // Ví dụ: A1, A2
                  const isBooked = showtime.booked_seats.includes(seatId);
                  const isSelected = selectedSeats.includes(seatId);

                  return (
                    <button
                      key={seatId}
                      disabled={isBooked}
                      onClick={() => handleSeatClick(seatId)}
                      className={`
                        w-10 h-10 rounded-t-lg text-xs font-bold transition-all
                        ${
                          isBooked
                            ? "bg-gray-600 cursor-not-allowed text-gray-400" // Ghế đã đặt
                            : isSelected
                            ? "bg-red-600 text-white scale-110 shadow-lg" // Ghế đang chọn
                            : "bg-gray-200 text-gray-800 hover:bg-white" // Ghế trống
                        }
                      `}
                    >
                      {seatId}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Chú thích màu ghế */}
          <div className="flex justify-center gap-6 mt-10 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded"></div> Ghế trống
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-600 rounded"></div> Đang chọn
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-600 rounded"></div> Đã đặt
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: THÔNG TIN VÉ */}
        <div className="w-full md:w-80 bg-white text-gray-900 p-6 rounded-lg shadow-lg h-fit">
          <img
            src={showtime.movie.poster_url}
            alt="poster"
            className="w-32 rounded mb-4 shadow-md mx-auto"
          />
          <h3 className="text-xl font-bold mb-2 text-center">
            {showtime.movie.title}
          </h3>
          <p className="text-gray-600 text-sm text-center mb-6">
            {showtime.cinema.name} - {showtime.room}
          </p>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Suất chiếu:</span>
              <span className="font-bold">
                {new Date(showtime.start_time).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Ghế chọn:</span>
              <span className="font-bold text-red-600 break-words w-1/2 text-right">
                {selectedSeats.length > 0
                  ? selectedSeats.join(", ")
                  : "Chưa chọn"}
              </span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-4 mt-4">
              <span>Tổng tiền:</span>
              <span className="text-red-600">
                {totalPrice.toLocaleString()} đ
              </span>
            </div>
          </div>

          <button
            disabled={selectedSeats.length === 0}
            className="w-full mt-6 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-400 transition"
            onClick={handleBooking}
          >
            ĐẶT VÉ NGAY
          </button>
        </div>
      </div>
    </div>
  );
}
