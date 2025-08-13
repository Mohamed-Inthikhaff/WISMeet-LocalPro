// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Fallback to .env if .env.local doesn't exist
if (!process.env.NEXT_PUBLIC_STREAM_API_KEY) {
  require('dotenv').config({ path: '.env' });
}

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_STREAM_API_KEY',
  'STREAM_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  console.error('Please check your .env.local or .env file');
  process.exit(1);
}

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let io; // singleton

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Log every incoming request path (briefly)
      console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

      // Handle Next.js requests - this will handle all routes including /api/*
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io once with proper CORS and error logging
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: dev ? true : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
      transports: ['polling', 'websocket'], // polling first for stability
      allowEIO3: true, // Allow Engine.IO v3 clients
    });

    // Import and setup socket handlers
    const { setupSocketHandlers } = require('./lib/socket.js');
    
    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      socket.on('error', (err) => {
        console.error('Socket error:', err);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', socket.id, reason);
      });

      // Setup application-specific handlers
      setupSocketHandlers(socket, io);
    });

    console.log('Socket.io server initialized with hardened configuration');
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 