export interface SeatLock {
  seatName: string;
  socketId: string;
  userId?: string;
  expiresAt: number;
}

export interface ShowtimeRoomState {
  showtimeId: string;
  locks: Map<string, SeatLock>; // Map seatName -> SeatLock
}

export interface JoinShowtimePayload {
  showtimeId: string;
  userId?: string;
}

export interface LockSeatPayload {
  showtimeId: string;
  seatName: string;
  userId?: string;
}

export interface UnlockSeatPayload {
  showtimeId: string;
  seatName: string;
}
