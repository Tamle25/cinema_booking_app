import { SeatLock, ShowtimeRoomState } from '../types';

export class SeatLockService {
  private rooms: Map<string, ShowtimeRoomState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private onLockExpiredCallback?: (showtimeId: string, seatName: string) => void;

  constructor(onLockExpired?: (showtimeId: string, seatName: string) => void) {
    this.onLockExpiredCallback = onLockExpired;
  }

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

  isSeatLocked(showtimeId: string, seatName: string): boolean {
    const room = this.rooms.get(showtimeId);
    if (!room) return false;

    const lock = room.locks.get(seatName);
    if (!lock) return false;

    if (Date.now() > lock.expiresAt) {
      this.unlockSeat(showtimeId, seatName);
      return false;
    }

    return true;
  }

  lockSeat(
    showtimeId: string,
    seatName: string,
    socketId: string,
    userId?: string,
    timeoutMs: number = 600000
  ): SeatLock | null {
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

    const timerKey = `${showtimeId}_${seatName}`;
    if (this.timers.has(timerKey)) {
      clearTimeout(this.timers.get(timerKey)!);
      this.timers.delete(timerKey);
    }

    const timer = setTimeout(() => {
      this.unlockSeat(showtimeId, seatName);
      if (this.onLockExpiredCallback) {
        this.onLockExpiredCallback(showtimeId, seatName);
      }
    }, timeoutMs);

    this.timers.set(timerKey, timer);

    return lock;
  }

  unlockSeat(showtimeId: string, seatName: string): boolean {
    const room = this.rooms.get(showtimeId);
    if (!room) return false;

    const hasLock = room.locks.has(seatName);
    if (hasLock) {
      room.locks.delete(seatName);

      const timerKey = `${showtimeId}_${seatName}`;
      const timer = this.timers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(timerKey);
      }

      if (room.locks.size === 0) {
        this.rooms.delete(showtimeId);
      }
      return true;
    }

    return false;
  }

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
          this.unlockSeat(showtimeId, seatName);
        }
      }
    }

    return result;
  }

  markSeatsAsBooked(showtimeId: string, seats: string[]): void {
    seats.forEach((seat) => {
      this.unlockSeat(showtimeId, seat);
    });
  }
}
