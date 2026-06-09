"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:5000";
    const socketInstance = io(API_URL);

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("🟢 Connected to Live Sync Engine");
      
      // Optionally emit a join event with user ID to create personalized rooms
      if (user?.id) {
        socketInstance.emit("join-user-room", user.id);
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("🔴 Disconnected from Live Sync Engine");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
