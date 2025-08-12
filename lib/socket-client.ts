import io from "socket.io-client";

export function createSocket() {
  // If running in the browser, use the current site's origin
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BASE_URL || "").trim();

  const opts = {
    transports: ["websocket"], // prefer websocket first
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    withCredentials: true,
    autoConnect: false,
  };

  return io(base, opts);
}
