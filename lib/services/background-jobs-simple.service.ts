// lib/services/background-jobs-simple.service.ts
// Versión SIN Socket.io - solo DB

import { prisma } from '@/lib/prisma';
import { JobType, JobStatus } from '@prisma/client';

export interface CreateJobInput {
  type: JobType;
  userId: string;
  metadata: any;
  total?: number;
}

export const backgroundJobsService = {
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
    return job;
  },

  async getById(jobId: string) {
    return await prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });
  },

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
    return job;
  },

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

    return job;
  },

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
  },

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
  },

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
    return job;
  },

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
    return job;
  },

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
    return updatedJob;
  },
};