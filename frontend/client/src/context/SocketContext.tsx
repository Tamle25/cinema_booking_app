'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  /** true nếu socket đã từng kết nối thành công ít nhất 1 lần trong session này */
  hasEverConnected: boolean;
  /** Hàm disconnect thủ công (dùng khi logout, session invalid) */
  disconnectSocket: () => void;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
  hasEverConnected: false,
  disconnectSocket: () => {},
});

export const useSocket = () => useContext(SocketContext);

// Singleton: gắn vào window để tránh bị mất khi HMR reload module (dev mode)
// Khi HMR reload, biến module-level bị reset → tạo socket mới → socket cũ bị disconnect
// Gắn vào window giúp giữ socket xuyên suốt các lần HMR reload
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

  // Nếu đã có socket, chưa bị destroyed, và đang connected hoặc đang kết nối → tái sử dụng
  if (existing && !isSocketDestroyed()) {
    console.log('[SocketProvider] Reusing existing socket, ID:', existing.id);
    return existing;
  }

  // Nếu socket bị destroyed (do logout/manual disconnect) → cleanup và tạo mới
  if (existing) {
    console.log('[SocketProvider] Previous socket was destroyed, creating new one');
    existing.removeAllListeners();
    setGlobalSocket(null);
  }
  setSocketDestroyed(false);

  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:4001';
  console.log(`[SocketProvider] Creating new WebSocket connection to ${wsUrl}`);

  const newSocket = io(wsUrl, {
    transports: ['websocket'],
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
  // Dùng ref để giữ socket singleton, tránh tạo lại khi re-render
  const socketRef = useRef<Socket | null>(null);

  // Chỉ khởi tạo socket 1 lần
  if (socketRef.current === null) {
    socketRef.current = getOrCreateSocket();
  }

  const socket = socketRef.current;

  const [isConnected, setIsConnected] = useState(() => socket ? socket.connected : false);
  const [hasEverConnected, setHasEverConnected] = useState(false);

  // Ref để track hasEverConnected (tránh stale closure trong beforeunload)
  const hasEverConnectedRef = useRef(false);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('[SocketProvider] Manual disconnect requested (logout/session invalid)');
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
      socketRef.current = null;
      setGlobalSocket(null);
      setSocketDestroyed(true);
      setIsConnected(false);
      setHasEverConnected(false);
      hasEverConnectedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('[SocketProvider] ✅ Connected to WS Server, Socket ID:', socket.id);
      setIsConnected(true);
      setHasEverConnected(true);
      hasEverConnectedRef.current = true;
    };

    const handleDisconnect = (reason: string) => {
      console.log('[SocketProvider] ❌ Disconnected from WS Server, Reason:', reason);
      setIsConnected(false);
      // KHÔNG reset hasEverConnected → để booking page biết đây là "mất kết nối" chứ không phải "chưa từng kết nối"
    };

    const handleConnectError = (error: Error) => {
      console.error('[SocketProvider] ⚠️ Connection Error:', error.message);
      setIsConnected(false);
    };

    const handleReconnect = (attempt: number) => {
      console.log(`[SocketProvider] 🔄 Reconnected after ${attempt} attempt(s)`);
    };

    const handleReconnectAttempt = (attempt: number) => {
      console.log(`[SocketProvider] 🔄 Reconnect attempt #${attempt}`);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect', handleReconnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    // Nếu socket đã connected sẵn (ví dụ re-mount), cập nhật state
    if (socket.connected) {
      setIsConnected(true);
      setHasEverConnected(true);
      hasEverConnectedRef.current = true;
    }

    // beforeunload: disconnect khi user thực sự đóng tab/refresh
    const handleBeforeUnload = () => {
      console.log('[SocketProvider] 🚪 Window beforeunload - disconnecting socket');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Cleanup: CHỈ gỡ listeners, KHÔNG disconnect socket
      // Socket sẽ sống suốt vòng đời app (singleton)
      console.log('[SocketProvider] Cleaning up event listeners (socket stays alive)');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect', handleReconnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, hasEverConnected, disconnectSocket }}>
      {children}
    </SocketContext.Provider>
  );
};
