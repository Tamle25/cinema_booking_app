'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  hasEverConnected: boolean;
  disconnectSocket: () => void;
  lockedSeats: string[];
  bookedSeats: string[];
  joinShowtime: (showtimeId: string) => void;
  leaveShowtime: (showtimeId: string) => void;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
  hasEverConnected: false,
  disconnectSocket: () => {},
  lockedSeats: [],
  bookedSeats: [],
  joinShowtime: () => {},
  leaveShowtime: () => {},
});

export const useSocket = () => useContext(SocketContext);

declare global {
  interface Window {
    __cinema_socket?: Socket | null;
    __cinema_socket_destroyed?: boolean;
  }
}

function getGlobalSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  return window.__cinema_socket ?? null;
}

function setGlobalSocket(socket: Socket | null) {
  if (typeof window === 'undefined') return;
  window.__cinema_socket = socket;
}

function isSocketDestroyed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.__cinema_socket_destroyed ?? false;
}

function setSocketDestroyed(value: boolean) {
  if (typeof window === 'undefined') return;
  window.__cinema_socket_destroyed = value;
}

function getOrCreateSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  const existing = getGlobalSocket();

  if (existing && !isSocketDestroyed()) {
    return existing;
  }

  if (existing) {
    existing.removeAllListeners();
    setGlobalSocket(null);
  }
  setSocketDestroyed(false);

  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:4000';

  const newSocket = io(wsUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  setGlobalSocket(newSocket);
  return newSocket;
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(() => getOrCreateSocket());
  const [isConnected, setIsConnected] = useState(() => (socket ? socket.connected : false));
  const [hasEverConnected, setHasEverConnected] = useState(() => Boolean(socket?.connected));

  const [currentShowtimeId, setCurrentShowtimeId] = useState<string | null>(null);
  const [lockedSeats, setLockedSeats] = useState<string[]>([]);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);

  // Sử dụng ref để listener luôn đọc được giá trị mới nhất của showtimeId hiện tại
  const currentShowtimeIdRef = useRef<string | null>(null);
  currentShowtimeIdRef.current = currentShowtimeId;

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket.removeAllListeners();
      setSocket(null);
      setGlobalSocket(null);
      setSocketDestroyed(true);
      setIsConnected(false);
      setHasEverConnected(false);
      setLockedSeats([]);
      setBookedSeats([]);
      setCurrentShowtimeId(null);
    }
  }, [socket]);

  const joinShowtime = useCallback((showtimeId: string) => {
    if (!socket) return;
    setCurrentShowtimeId(showtimeId);
    setLockedSeats([]);
    setBookedSeats([]);
    
    if (socket.connected) {
      console.log(`[SocketContext] Emitting join_showtime: ${showtimeId}`);
      socket.emit('join_showtime', { showtimeId });
    }
  }, [socket]);

  const leaveShowtime = useCallback((showtimeId: string) => {
    if (!socket) return;
    console.log(`[SocketContext] Emitting leave_showtime: ${showtimeId}`);
    socket.emit('leave_showtime', { showtimeId });
    if (currentShowtimeIdRef.current === showtimeId) {
      setCurrentShowtimeId(null);
      setLockedSeats([]);
      setBookedSeats([]);
    }
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setHasEverConnected(true);
      // Re-join showtime nếu kết nối lại thành công
      if (currentShowtimeIdRef.current) {
        console.log(`[SocketContext] Re-connected. Re-joining showtime: ${currentShowtimeIdRef.current}`);
        socket.emit('join_showtime', { showtimeId: currentShowtimeIdRef.current });
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = () => {
      setIsConnected(false);
    };

    // Định nghĩa các event listener
    const handleSeatStateSync = (data: { showtimeId: string; lockedSeats: string[]; bookedSeats: string[] }) => {
      if (data.showtimeId !== currentShowtimeIdRef.current) return;
      console.log(`[SocketContext] seat_state_sync: showtimeId=${data.showtimeId}`, data);
      setLockedSeats(data.lockedSeats || []);
      setBookedSeats(data.bookedSeats || []);
    };

    const handleSeatLocked = (data: { showtimeId: string; seats: string[] }) => {
      if (data.showtimeId !== currentShowtimeIdRef.current) return;
      console.log(`[SocketContext] seat_locked: showtimeId=${data.showtimeId}`, data);
      
      setLockedSeats((prev) => {
        const next = new Set([...prev, ...data.seats]);
        return Array.from(next);
      });
      setBookedSeats((prev) => prev.filter((seat) => !data.seats.includes(seat)));
    };

    const handleSeatBooked = (data: { showtimeId: string; seats: string[] }) => {
      if (data.showtimeId !== currentShowtimeIdRef.current) return;
      console.log(`[SocketContext] seat_booked: showtimeId=${data.showtimeId}`, data);

      setBookedSeats((prev) => {
        const next = new Set([...prev, ...data.seats]);
        return Array.from(next);
      });
      setLockedSeats((prev) => prev.filter((seat) => !data.seats.includes(seat)));
    };

    const handleSeatReleased = (data: { showtimeId: string; seats: string[] }) => {
      if (data.showtimeId !== currentShowtimeIdRef.current) return;
      console.log(`[SocketContext] seat_released: showtimeId=${data.showtimeId}`, data);

      setLockedSeats((prev) => prev.filter((seat) => !data.seats.includes(seat)));
      setBookedSeats((prev) => prev.filter((seat) => !data.seats.includes(seat)));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('seat_state_sync', handleSeatStateSync);
    socket.on('seat_locked', handleSeatLocked);
    socket.on('seat_booked', handleSeatBooked);
    socket.on('seat_released', handleSeatReleased);

    const handleBeforeUnload = () => {
      if (currentShowtimeIdRef.current) {
        socket.emit('leave_showtime', { showtimeId: currentShowtimeIdRef.current });
      }
      socket.disconnect();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('seat_state_sync', handleSeatStateSync);
      socket.off('seat_locked', handleSeatLocked);
      socket.off('seat_booked', handleSeatBooked);
      socket.off('seat_released', handleSeatReleased);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        hasEverConnected,
        disconnectSocket,
        lockedSeats,
        bookedSeats,
        joinShowtime,
        leaveShowtime,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
