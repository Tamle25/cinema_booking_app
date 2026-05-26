import { SeatLock, ShowtimeRoomState } from '../types';

export class SeatLockService {
  // Map lưu trữ: showtimeId -> RoomState
  private rooms: Map<string, ShowtimeRoomState> = new Map();
  // Map lưu trữ: timerId (showtimeId + '_' + seatName) -> NodeJS.Timeout
  private timers: Map<string, NodeJS.Timeout> = new Map();

  // Callback được gọi khi một ghế tự động bị giải phóng do timeout
  private onLockExpiredCallback?: (showtimeId: string, seatName: string) => void;

  constructor(onLockExpired?: (showtimeId: string, seatName: string) => void) {
    this.onLockExpiredCallback = onLockExpired;
  }

  /**
   * Lấy hoặc tạo phòng cho suất chiếu
   */
  private getOrCreateRoom(showtimeId: string): ShowtimeRoomState {
    let room = this.rooms.get(showtimeId);
    if (!room) {
      room = {
        showtimeId,
        locks: new Map(),
      };
      this.rooms.set(showtimeId, room);
    }
    return room;
  }

  /**
   * Kiểm tra xem ghế đã bị khóa chưa
   */
  isSeatLocked(showtimeId: string, seatName: string): boolean {
    const room = this.rooms.get(showtimeId);
    if (!room) return false;

    const lock = room.locks.get(seatName);
    if (!lock) return false;

    // Kiểm tra xem đã hết hạn chưa (phòng hờ timer chưa chạy kịp)
    if (Date.now() > lock.expiresAt) {
      this.unlockSeat(showtimeId, seatName);
      return false;
    }

    return true;
  }

  /**
   * Khóa ghế tạm thời
   */
  lockSeat(
    showtimeId: string,
    seatName: string,
    socketId: string,
    userId?: string,
    timeoutMs: number = 600000
  ): SeatLock | null {
    // Nếu ghế đã bị lock, trả về null
    if (this.isSeatLocked(showtimeId, seatName)) {
      return null;
    }

    const room = this.getOrCreateRoom(showtimeId);
    const expiresAt = Date.now() + timeoutMs;
    const lock: SeatLock = {
      seatName,
      socketId,
      userId,
      expiresAt,
    };

    room.locks.set(seatName, lock);

    // Hủy timer cũ nếu có
    const timerKey = `${showtimeId}_${seatName}`;
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
      this.timers.delete(timerKey);
    }

    // Thiết lập timer tự động mở khóa
    const timer = setTimeout(() => {
      console.log(`[SeatLockService] Lock expired for seat ${seatName} in showtime ${showtimeId}`);
      this.unlockSeat(showtimeId, seatName);
      if (this.onLockExpiredCallback) {
        this.onLockExpiredCallback(showtimeId, seatName);
      }
    }, timeoutMs);

    this.timers.set(timerKey, timer);

    return lock;
  }

  /**
   * Mở khóa một ghế
   */
  unlockSeat(showtimeId: string, seatName: string): boolean {
    const room = this.rooms.get(showtimeId);
    if (!room) return false;

    const hasLock = room.locks.has(seatName);
    if (hasLock) {
      room.locks.delete(seatName);

      // Xóa timer tương ứng
      const timerKey = `${showtimeId}_${seatName}`;
      const timer = this.timers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(timerKey);
      }

      // Nếu phòng không còn ghế nào bị khóa, giải phóng phòng để tiết kiệm memory
      if (room.locks.size === 0) {
        this.rooms.delete(showtimeId);
      }
      return true;
    }

    return false;
  }

  /**
   * Giải phóng tất cả các ghế được khóa bởi một socketId cụ thể (khi user disconnect)
   * Trả về danh sách các ghế bị giải phóng để broadcast
   */
  releaseSocketLocks(socketId: string): Array<{ showtimeId: string; seatName: string }> {
    const releasedSeats: Array<{ showtimeId: string; seatName: string }> = [];

    for (const [showtimeId, room] of this.rooms.entries()) {
      for (const [seatName, lock] of room.locks.entries()) {
        if (lock.socketId === socketId) {
          this.unlockSeat(showtimeId, seatName);
          releasedSeats.push({ showtimeId, seatName });
        }
      }
    }

    return releasedSeats;
  }

  /**
   * Lấy danh sách các ghế đang bị khóa của một showtime
   * Định dạng trả về: { [seatName]: { userId, expiresAt, socketId } }
   */
  getLockedSeats(showtimeId: string): Record<string, { userId?: string; expiresAt: number; socketId: string }> {
    const result: Record<string, { userId?: string; expiresAt: number; socketId: string }> = {};
    const room = this.rooms.get(showtimeId);

    if (room) {
      const now = Date.now();
      for (const [seatName, lock] of room.locks.entries()) {
        if (now <= lock.expiresAt) {
          result[seatName] = {
            userId: lock.userId,
            expiresAt: lock.expiresAt,
            socketId: lock.socketId,
          };
        } else {
          // Tiện tay dọn dẹp các ghế hết hạn chưa được giải phóng
          this.unlockSeat(showtimeId, seatName);
        }
      }
    }

    return result;
  }

  /**
   * Đánh dấu các ghế đã được đặt thành công (Booked)
   * Giải phóng lock tạm thời và xóa timer
   */
  markSeatsAsBooked(showtimeId: string, seats: string[]): void {
    console.log(`[SeatLockService] Marking seats as booked for showtime ${showtimeId}:`, seats);
    seats.forEach((seat) => {
      this.unlockSeat(showtimeId, seat);
    });
  }
}
