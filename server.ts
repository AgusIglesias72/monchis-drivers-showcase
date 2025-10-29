// server.ts (en la raíz del proyecto)

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initIO } from './lib/socket/server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Inicializar Socket.io
  initIO(server);

  server.listen(port, () => {
    console.log(`
┌─────────────────────────────────────────┐
│  🚀 Server running on:                  │
│     http://${hostname}:${port}          │
│                                         │
│  🔌 WebSocket path:                     │
│     /api/socketio                       │
└─────────────────────────────────────────┘
    `);
  });

  // Graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, () => {
      console.log(`\n${signal} received, closing server...`);
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  });
});