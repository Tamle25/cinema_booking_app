import { Server, Socket } from 'socket.io';
import { SeatLockService } from '../services/seat-lock.service';
import { config } from '../config';
import { JoinShowtimePayload, LockSeatPayload, UnlockSeatPayload } from '../types';

export class SeatGateway {
  private io: Server;
  private seatLockService: SeatLockService;

  constructor(io: Server) {
    this.io = io;
    
    this.seatLockService = new SeatLockService((showtimeId, seatName) => {
      this.io.to(`showtime_${showtimeId}`).emit('seat_lock_expired', {
        showtimeId,
        seatName,
      });
    });

    this.setupListeners();
  }

  getLockService(): SeatLockService {
    return this.seatLockService;
  }

  private setupListeners() {
    this.io.on('connection', (socket: Socket) => {
      socket.on('join_showtime', (payload: JoinShowtimePayload) => {
        const { showtimeId } = payload;
        if (!showtimeId) return;

        const roomName = `showtime_${showtimeId}`;
        socket.join(roomName);

        const lockedSeats = this.seatLockService.getLockedSeats(showtimeId);
        socket.emit('seat_state_sync', {
          showtimeId,
          lockedSeats,
        });
      });

      socket.on('leave_showtime', (payload: { showtimeId: string }) => {
        const { showtimeId } = payload;
        if (!showtimeId) return;

        const roomName = `showtime_${showtimeId}`;
        socket.leave(roomName);
      });

      socket.on('lock_seat', async (payload: LockSeatPayload) => {
        const { showtimeId, seatName, userId } = payload;
        if (!showtimeId || !seatName) return;

        try {
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
            socket.emit('seat_lock_error', {
              seatName,
              message: 'Ghế này đã được người khác đặt hoặc đang thanh toán!',
            });
            return;
          }

          if (this.seatLockService.isSeatLocked(showtimeId, seatName)) {
            socket.emit('seat_lock_error', {
              seatName,
              message: 'Ghế này đang được người khác chọn!',
            });
            return;
          }

          const lock = this.seatLockService.lockSeat(
            showtimeId,
            seatName,
            socket.id,
            userId,
            config.lockTimeoutMs
          );

          if (lock) {
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

      socket.on('unlock_seat', (payload: UnlockSeatPayload) => {
        const { showtimeId, seatName } = payload;
        if (!showtimeId || !seatName) return;

        const lockedSeats = this.seatLockService.getLockedSeats(showtimeId);
        const lock = lockedSeats[seatName];

        if (lock && lock.socketId === socket.id) {
          const success = this.seatLockService.unlockSeat(showtimeId, seatName);
          if (success) {
            this.io.to(`showtime_${showtimeId}`).emit('seat_unlocked', {
              showtimeId,
              seatName,
            });
          }
        }
      });

      socket.on('disconnect', () => {
        const releasedSeats = this.seatLockService.releaseSocketLocks(socket.id);

        releasedSeats.forEach(({ showtimeId, seatName }) => {
          this.io.to(`showtime_${showtimeId}`).emit('seat_unlocked', {
            showtimeId,
            seatName,
          });
        });
      });
    });
  }
}
