import { Server, Socket } from 'socket.io';
import { SeatLockService } from '../services/seat-lock.service';
import { config } from '../config';
import { JoinShowtimePayload, LockSeatPayload, UnlockSeatPayload } from '../types';

export class SeatGateway {
  private io: Server;
  private seatLockService: SeatLockService;

  constructor(io: Server) {
    this.io = io;
    
    // Khởi tạo SeatLockService, truyền callback xử lý khi một ghế hết hạn khóa
    this.seatLockService = new SeatLockService((showtimeId, seatName) => {
      console.log(`[SeatGateway] Lock expired callback for seat ${seatName} in showtime ${showtimeId}`);
      this.io.to(`showtime_${showtimeId}`).emit('seat_lock_expired', {
        showtimeId,
        seatName,
      });
    });

    this.setupListeners();
  }

  /**
   * Lấy SeatLockService instance để sử dụng ở REST API
   */
  getLockService(): SeatLockService {
    return this.seatLockService;
  }

  private setupListeners() {
    this.io.on('connection', (socket: Socket) => {
      const totalClients = this.io.engine.clientsCount;
      console.log(`[SeatGateway] ✅ Client connected: ${socket.id} (Total clients: ${totalClients})`);

      // 1. Join room showtime
      socket.on('join_showtime', (payload: JoinShowtimePayload) => {
        const { showtimeId } = payload;
        if (!showtimeId) return;

        const roomName = `showtime_${showtimeId}`;
        socket.join(roomName);
        console.log(`[SeatGateway] Socket ${socket.id} joined room ${roomName}`);

        // Đồng bộ trạng thái các ghế đang bị khóa cho client vừa join
        const lockedSeats = this.seatLockService.getLockedSeats(showtimeId);
        socket.emit('seat_state_sync', {
          showtimeId,
          lockedSeats,
        });
      });

      // 2. Rời room showtime
      socket.on('leave_showtime', (payload: { showtimeId: string }) => {
        const { showtimeId } = payload;
        if (!showtimeId) return;

        const roomName = `showtime_${showtimeId}`;
        socket.leave(roomName);
        console.log(`[SeatGateway] Socket ${socket.id} left room ${roomName}`);
      });

      // 3. Khóa ghế
      socket.on('lock_seat', async (payload: LockSeatPayload) => {
        const { showtimeId, seatName, userId } = payload;
        if (!showtimeId || !seatName) return;

        console.log(`[SeatGateway] Socket ${socket.id} request lock seat ${seatName} for showtime ${showtimeId}`);

        try {
          // A. Kiểm tra xem ghế đã được đặt trong database chưa bằng cách gọi API backend NestJS
          const response = await fetch(`${config.backendUrl}/showtimes/${showtimeId}`);
          if (!response.ok) {
            console.error(`[SeatGateway] Failed to fetch showtime: ${response.statusText}`);
            socket.emit('seat_lock_error', {
              seatName,
              message: 'Không thể xác thực thông tin suất chiếu từ server.',
            });
            return;
          }

          const showtimeData = await response.json();
          const bookedSeats: string[] = showtimeData.booked_seats || [];

          if (bookedSeats.includes(seatName)) {
            console.log(`[SeatGateway] Seat ${seatName} already booked in DB`);
            socket.emit('seat_lock_error', {
              seatName,
              message: 'Ghế này đã được người khác đặt hoặc đang thanh toán!',
            });
            return;
          }

          // B. Kiểm tra xem ghế có đang bị khóa bởi ai khác trong memory không
          if (this.seatLockService.isSeatLocked(showtimeId, seatName)) {
            console.log(`[SeatGateway] Seat ${seatName} already locked in memory`);
            socket.emit('seat_lock_error', {
              seatName,
              message: 'Ghế này đang được người khác chọn!',
            });
            return;
          }

          // C. Thực hiện khóa ghế
          const lock = this.seatLockService.lockSeat(
            showtimeId,
            seatName,
            socket.id,
            userId,
            config.lockTimeoutMs
          );

          if (lock) {
            console.log(`[SeatGateway] Seat ${seatName} locked successfully for socket ${socket.id}`);
            // Broadcast trạng thái tới toàn bộ client trong room
            this.io.to(`showtime_${showtimeId}`).emit('seat_locked', {
              showtimeId,
              seatName,
              lockedBy: socket.id,
              userId,
              expiresAt: lock.expiresAt,
            });
          } else {
            socket.emit('seat_lock_error', {
              seatName,
              message: 'Lỗi hệ thống khi khóa ghế. Vui lòng thử lại.',
            });
          }
        } catch (error) {
          console.error('[SeatGateway] Error in lock_seat:', error);
          socket.emit('seat_lock_error', {
            seatName,
            message: 'Có lỗi xảy ra trên server.',
          });
        }
      });

      // 4. Mở khóa ghế
      socket.on('unlock_seat', (payload: UnlockSeatPayload) => {
        const { showtimeId, seatName } = payload;
        if (!showtimeId || !seatName) return;

        console.log(`[SeatGateway] Socket ${socket.id} request unlock seat ${seatName}`);

        // Chỉ cho phép giải phóng nếu ghế đó được khóa bởi chính socket này
        const lockedSeats = this.seatLockService.getLockedSeats(showtimeId);
        const lock = lockedSeats[seatName];

        if (lock && lock.socketId === socket.id) {
          const success = this.seatLockService.unlockSeat(showtimeId, seatName);
          if (success) {
            console.log(`[SeatGateway] Seat ${seatName} unlocked successfully`);
            this.io.to(`showtime_${showtimeId}`).emit('seat_unlocked', {
              showtimeId,
              seatName,
            });
          }
        } else {
          console.warn(`[SeatGateway] Socket ${socket.id} tried to unlock seat ${seatName} which is not locked by them`);
        }
      });

      // 5. Đứt kết nối (Disconnect)
      socket.on('disconnect', (reason: string) => {
        console.log(`[SeatGateway] ❌ Client disconnected: ${socket.id}, Reason: ${reason}`);

        // Giải phóng toàn bộ ghế được khóa bởi socket này
        const releasedSeats = this.seatLockService.releaseSocketLocks(socket.id);
        
        if (releasedSeats.length > 0) {
          console.log(`[SeatGateway] 🔓 Auto-released ${releasedSeats.length} seat(s) for disconnected socket ${socket.id}`);
        }

        // Broadcast sự kiện mở khóa cho từng ghế
        releasedSeats.forEach(({ showtimeId, seatName }) => {
          console.log(`[SeatGateway]   → Unlocked seat ${seatName} in showtime ${showtimeId}`);
          this.io.to(`showtime_${showtimeId}`).emit('seat_unlocked', {
            showtimeId,
            seatName,
          });
        });

        const remainingClients = this.io.engine.clientsCount;
        console.log(`[SeatGateway] Remaining clients: ${remainingClients}`);
      });
    });
  }
}
