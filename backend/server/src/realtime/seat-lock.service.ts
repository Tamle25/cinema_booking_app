import { Injectable } from '@nestjs/common';

@Injectable()
export class SeatLockService {
  private pendingSeats: Map<string, Set<string>> = new Map();
  private bookedSeats: Map<string, Set<string>> = new Map();

  isCacheSeeded(showtimeId: string): boolean {
    return this.bookedSeats.has(showtimeId) || this.pendingSeats.has(showtimeId);
  }

  seedSeats(showtimeId: string, booked: string[], pending: string[]): void {
    this.bookedSeats.set(showtimeId, new Set(booked));
    this.pendingSeats.set(showtimeId, new Set(pending));
  }

  lockSeatsPending(showtimeId: string, seats: string[]): void {
    let pending = this.pendingSeats.get(showtimeId);
    if (!pending) {
      pending = new Set();
      this.pendingSeats.set(showtimeId, pending);
    }
    seats.forEach((seat) => {
      pending!.add(seat);
      this.bookedSeats.get(showtimeId)?.delete(seat);
    });
  }

  markSeatsAsBooked(showtimeId: string, seats: string[]): void {
    let booked = this.bookedSeats.get(showtimeId);
    if (!booked) {
      booked = new Set();
      this.bookedSeats.set(showtimeId, booked);
    }

    const pending = this.pendingSeats.get(showtimeId);

    seats.forEach((seat) => {
      booked!.add(seat);
      if (pending) {
        pending.delete(seat);
      }
    });
  }

  releaseSeats(showtimeId: string, seats: string[]): void {
    const pending = this.pendingSeats.get(showtimeId);
    if (pending) {
      seats.forEach((seat) => pending.delete(seat));
    }
    const booked = this.bookedSeats.get(showtimeId);
    if (booked) {
      seats.forEach((seat) => booked.delete(seat));
    }
  }

  getShowtimeState(showtimeId: string): { lockedSeats: string[]; bookedSeats: string[] } {
    return {
      lockedSeats: Array.from(this.pendingSeats.get(showtimeId) || []),
      bookedSeats: Array.from(this.bookedSeats.get(showtimeId) || []),
    };
  }
}
