// lib/services/background-jobs.service.ts

import { prisma } from '@/lib/prisma';
import { JobType, JobStatus } from '@prisma/client';
import { 
  emitJobUpdate, 
  emitJobLog, 
  emitJobProgress,
  emitJobCompleted,
  emitJobFailed,
  emitJobStatusChange
} from '@/lib/socket/server';

export interface CreateJobInput {
  type: JobType;
  userId: string;
  metadata: any;
  total?: number;
}

export const backgroundJobsService = {
  /**
   * Crea un nuevo job en la base de datos
   */
  async create(input: CreateJobInput) {
    const job = await prisma.backgroundJob.create({
      data: {
        type: input.type,
        userId: input.userId,
        status: 'QUEUED',
        metadata: input.metadata,
        total: input.total || 0,
        logs: [],
      },
    });

    console.log(`✅ Job ${job.id} creado: ${job.type}`);

    // Emitir evento WebSocket de creación
    emitJobUpdate(job.id, {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: 0,
      current: 0,
      total: job.total,
    });

    return job;
  },

  /**
   * Obtiene un job por ID
   */
  async getById(jobId: string) {
    return await prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });
  },

  /**
   * Actualiza el status de un job
   */
  async updateStatus(jobId: string, status: JobStatus, error?: string) {
    const updates: any = { status };
    
    if (status === 'PROCESSING') {
      updates.startedAt = new Date();
    }
    
    if (status === 'COMPLETED' || status === 'FAILED') {
      updates.completedAt = new Date();
    }
    
    if (error) {
      updates.error = error;
    }

    const job = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: updates,
    });

    console.log(`📊 Job ${jobId} → ${status}`);

    // Emitir eventos WebSocket
    emitJobStatusChange(jobId, status);
    emitJobUpdate(jobId, {
      status: job.status,
      error: job.error,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    });

    if (status === 'FAILED' && error) {
      emitJobFailed(jobId, error);
    }

    return job;
  },

  /**
   * Actualiza el progreso de un job
   */
  async updateProgress(jobId: string, current: number, total?: number) {
    const percentage = total ? Math.round((current / total) * 100) : 0;
    
    const job = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        current,
        total: total || undefined,
        progress: percentage,
      },
    });

    // Emitir evento WebSocket
    emitJobProgress(jobId, current, total || job.total);

    return job;
  },

  /**
   * Agrega un log al job
   */
  async addLog(jobId: string, message: string) {
    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
      select: { logs: true },
    });
    
    if (!job) {
      console.warn(`⚠️  Job ${jobId} no encontrado para agregar log`);
      return;
    }
    
    const logs = Array.isArray(job.logs) ? job.logs : [];
    const timestampedLog = `[${new Date().toISOString()}] ${message}`;
    logs.push(timestampedLog);
    
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { logs },
    });

    // Emitir evento WebSocket
    emitJobLog(jobId, timestampedLog);
  },

  /**
   * Agrega múltiples logs en batch (más eficiente)
   */
  async addLogs(jobId: string, messages: string[]) {
    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
      select: { logs: true },
    });
    
    if (!job) {
      console.warn(`⚠️  Job ${jobId} no encontrado para agregar logs`);
      return;
    }
    
    const logs = Array.isArray(job.logs) ? job.logs : [];
    const timestampedLogs = messages.map(
      msg => `[${new Date().toISOString()}] ${msg}`
    );
    logs.push(...timestampedLogs);
    
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { logs },
    });

    // Emitir cada log por WebSocket
    timestampedLogs.forEach(log => emitJobLog(jobId, log));
  },

  /**
   * Guarda el resultado final del job
   */
  async saveResult(jobId: string, result: any) {
    const job = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        result,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    console.log(`✅ Job ${jobId} completado exitosamente`);

    // Emitir evento de completado
    emitJobCompleted(jobId, result);
    emitJobStatusChange(jobId, 'COMPLETED');

    return job;
  },

  /**
   * Marca el job como fallido
   */
  async markAsFailed(jobId: string, error: string) {
    const job = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error,
        completedAt: new Date(),
      },
    });

    console.error(`❌ Job ${jobId} falló: ${error}`);

    // Emitir eventos
    emitJobFailed(jobId, error);
    emitJobStatusChange(jobId, 'FAILED');

    return job;
  },

  /**
   * Obtiene jobs por usuario con filtros opcionales
   */
  async getByUser(userId: string, filters?: {
    type?: JobType;
    status?: JobStatus;
    limit?: number;
  }) {
    const where: any = { userId };
    
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;

    return await prisma.backgroundJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 20,
    });
  },

  /**
   * Obtiene todos los jobs activos (en cola o procesando)
   */
  async getActive() {
    return await prisma.backgroundJob.findMany({
      where: {
        status: {
          in: ['QUEUED', 'PROCESSING'],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * Cancela un job (si está en cola o procesando)
   */
  async cancel(jobId: string, userId: string) {
    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Job no encontrado');
    }

    if (job.userId !== userId) {
      throw new Error('No autorizado para cancelar este job');
    }

    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      throw new Error('No se puede cancelar un job que ya terminó');
    }

    const updatedJob = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    console.log(`🚫 Job ${jobId} cancelado por usuario`);

    emitJobStatusChange(jobId, 'CANCELLED');
    emitJobUpdate(jobId, { status: 'CANCELLED' });

    return updatedJob;
  },
};