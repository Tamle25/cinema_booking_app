'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  hasEverConnected: boolean;
  disconnectSocket: () => void;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
  hasEverConnected: false,
  disconnectSocket: () => {},
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

  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:4001';

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
  const [socket, setSocket] = useState<Socket | null>(() => getOrCreateSocket());
  const [isConnected, setIsConnected] = useState(() => socket ? socket.connected : false);
  const [hasEverConnected, setHasEverConnected] = useState(() => Boolean(socket?.connected));

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket.removeAllListeners();
      setSocket(null);
      setGlobalSocket(null);
      setSocketDestroyed(true);
      setIsConnected(false);
      setHasEverConnected(false);
    }
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setHasEverConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = () => {
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    const handleBeforeUnload = () => {
      socket.disconnect();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, hasEverConnected, disconnectSocket }}>
      {children}
    </SocketContext.Provider>
  );
};
