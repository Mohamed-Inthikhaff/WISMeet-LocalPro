import io from "socket.io-client";

export function createSocket() {
  // If running in the browser, use the current site's origin
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL || "").trim();

  console.log('🔌 Creating socket connection to:', base);

  const opts = {
    transports: ["polling", "websocket"], // match server configuration
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    withCredentials: true,
    autoConnect: false,
  };

  console.log('🔌 Socket options:', opts);

  const socket = io(base, opts);
  
  // Add debugging listeners
  socket.on('connect', () => {
    console.log('✅ Socket connected successfully:', socket.id);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socket;
}
