import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import { SeatGateway } from './gateways/seat.gateway';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

const httpServer = createServer(app);

// Khởi tạo Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Ping interval/timeout: phát hiện client mất kết nối nhanh hơn
  pingInterval: 10000,  // Gửi ping mỗi 10s
  pingTimeout: 5000,    // Nếu không có pong trong 5s → coi như disconnect
});

// Khởi tạo GateWay
const seatGateway = new SeatGateway(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WebSocket service is running' });
});

/**
 * REST API: Thông báo đặt vé thành công (Booked)
 * POST /internal/booking-completed
 * Body: { showtimeId: string, seats: string[] }
 */
app.post('/internal/booking-completed', (req, res) => {
  const { showtimeId, seats } = req.body;

  if (!showtimeId || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  console.log(`[HTTP REST] Received booking-completed for showtime ${showtimeId}, seats:`, seats);

  const lockService = seatGateway.getLockService();
  
  // 1. Đánh dấu ghế đã được đặt và xóa lock tạm thời trong bộ nhớ
  lockService.markSeatsAsBooked(showtimeId, seats);

  // 2. Broadcast event `seat_booked` cho các client khác trong room biết
  io.to(`showtime_${showtimeId}`).emit('seat_booked', {
    showtimeId,
    seats,
  });

  return res.json({ success: true, message: 'Updated successfully' });
});

/**
 * REST API: Thông báo giải phóng ghế (Khi booking hết hạn/bị hủy)
 * POST /internal/booking-released
 * Body: { showtimeId: string, seats: string[] }
 */
app.post('/internal/booking-released', (req, res) => {
  const { showtimeId, seats } = req.body;

  if (!showtimeId || !seats || !Array.isArray(seats)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  console.log(`[HTTP REST] Received booking-released for showtime ${showtimeId}, seats:`, seats);

  const lockService = seatGateway.getLockService();

  // 1. Mở khóa từng ghế trong memory (nếu có lock)
  seats.forEach((seat) => {
    lockService.unlockSeat(showtimeId, seat);
    
    // 2. Broadcast event `seat_unlocked` cho các client trong room biết để cập nhật UI
    io.to(`showtime_${showtimeId}`).emit('seat_unlocked', {
      showtimeId,
      seatName: seat,
    });
  });

  return res.json({ success: true, message: 'Seats released successfully' });
});

// Start Server
httpServer.listen(config.port, () => {
  console.log(`===============================================`);
  console.log(`🚀 WebSocket Server is running on port ${config.port}`);
  console.log(`🔗 Backend URL: ${config.backendUrl}`);
  console.log(`🔗 Frontend Origin: ${config.corsOrigin}`);
  console.log(`===============================================`);
});
