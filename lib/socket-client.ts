import io from 'socket.io-client';

export function createSocket() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').trim();
  const opts = {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    withCredentials: true,
    autoConnect: false,
  };
  return base ? io(base, opts) : io(opts);
}
