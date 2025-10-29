// lib/socket/server.ts

import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketServer | null = null;

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io no inicializado. Llama a initIO primero.');
  }
  return io;
}

export function initIO(httpServer: HTTPServer): SocketServer {
  if (io) {
    console.log('⚠️  Socket.io ya está inicializado');
    return io;
  }

  io = new SocketServer(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);

    // Cliente se suscribe a un job específico
    socket.on('subscribe-job', (jobId: string) => {
      socket.join(`job:${jobId}`);
      console.log(`📡 Cliente ${socket.id} suscrito a job ${jobId}`);
    });

    socket.on('unsubscribe-job', (jobId: string) => {
      socket.leave(`job:${jobId}`);
      console.log(`📴 Cliente ${socket.id} desuscrito de job ${jobId}`);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Cliente desconectado:', socket.id);
    });
  });

  console.log('✅ Socket.io inicializado en /api/socketio');
  return io;
}

// ============================================================================
// FUNCIONES HELPER PARA EMITIR EVENTOS
// ============================================================================

/**
 * Emite una actualización general del job
 */
export function emitJobUpdate(jobId: string, data: any) {
  try {
    const io = getIO();
    io.to(`job:${jobId}`).emit('job-update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error emitiendo job-update:', error);
  }
}

/**
 * Emite un nuevo log
 */
export function emitJobLog(jobId: string, message: string) {
  try {
    const io = getIO();
    io.to(`job:${jobId}`).emit('job-log', {
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error emitiendo job-log:', error);
  }
}

/**
 * Emite actualización de progreso
 */
export function emitJobProgress(jobId: string, current: number, total: number) {
  try {
    const io = getIO();
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    io.to(`job:${jobId}`).emit('job-progress', {
      current,
      total,
      percentage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error emitiendo job-progress:', error);
  }
}

/**
 * Emite evento de job completado
 */
export function emitJobCompleted(jobId: string, result: any) {
  try {
    const io = getIO();
    io.to(`job:${jobId}`).emit('job-completed', {
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error emitiendo job-completed:', error);
  }
}

/**
 * Emite evento de job fallido
 */
export function emitJobFailed(jobId: string, error: string) {
  try {
    const io = getIO();
    io.to(`job:${jobId}`).emit('job-failed', {
      error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error emitiendo job-failed:', error);
  }
}

/**
 * Emite evento de cambio de status
 */
export function emitJobStatusChange(jobId: string, status: string) {
  try {
    const io = getIO();
    io.to(`job:${jobId}`).emit('job-status-change', {
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error emitiendo job-status-change:', error);
  }
}