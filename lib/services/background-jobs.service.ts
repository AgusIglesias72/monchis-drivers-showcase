// lib/services/background-jobs.service.ts
// Versión mejorada con logs detallados

import { prisma } from '@/lib/prisma';
import { JobType, JobStatus } from '@prisma/client';

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
    console.log(`[DB] Creando job: ${input.type} para usuario ${input.userId}`);
    
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

    console.log(`✅ [DB] Job ${job.id} creado: ${job.type}`);
    return job;
  },

  /**
   * Obtiene un job por ID
   */
  async getById(jobId: string) {
    console.log(`[DB] Buscando job ${jobId}...`);
    
    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });
    
    if (job) {
      console.log(`✅ [DB] Job ${jobId} encontrado. Status: ${job.status}, Progress: ${job.progress}%`);
    } else {
      console.warn(`⚠️  [DB] Job ${jobId} NO encontrado en la base de datos`);
    }
    
    return job;
  },

  /**
   * Actualiza el status de un job
   */
  async updateStatus(jobId: string, status: JobStatus, error?: string) {
    console.log(`[DB] Actualizando job ${jobId}: ${status}`);
    
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

    try {
      const job = await prisma.backgroundJob.update({
        where: { id: jobId },
        data: updates,
      });

      console.log(`✅ [DB] Job ${jobId} → ${status}`);
      return job;
    } catch (error: any) {
      console.error(`❌ [DB] Error actualizando status de job ${jobId}:`, error.message);
      throw error;
    }
  },

  /**
   * Actualiza el progreso de un job
   */
  async updateProgress(jobId: string, current: number, total?: number) {
    const percentage = total ? Math.round((current / total) * 100) : 0;
    
    try {
      const job = await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          current,
          total: total || undefined,
          progress: percentage,
        },
      });

      // Solo log cada 10%
      if (percentage % 10 === 0 || percentage === 100) {
        console.log(`📊 [DB] Job ${jobId} progreso: ${percentage}% (${current}/${total})`);
      }

      return job;
    } catch (error: any) {
      console.error(`❌ [DB] Error actualizando progreso de job ${jobId}:`, error.message);
      throw error;
    }
  },

  /**
   * Agrega un log al job
   */
  async addLog(jobId: string, message: string) {
    try {
      const job = await prisma.backgroundJob.findUnique({
        where: { id: jobId },
        select: { logs: true },
      });
      
      if (!job) {
        console.warn(`⚠️  [DB] Job ${jobId} no encontrado para agregar log`);
        return;
      }
      
      const logs = Array.isArray(job.logs) ? job.logs : [];
      const timestampedLog = `[${new Date().toISOString()}] ${message}`;
      logs.push(timestampedLog);
      
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: { logs },
      });

      // Solo mostrar logs importantes en consola
      if (message.includes('✅') || message.includes('❌') || message.includes('🚀')) {
        console.log(`📝 [DB] Job ${jobId}: ${message}`);
      }
    } catch (error: any) {
      console.error(`❌ [DB] Error agregando log a job ${jobId}:`, error.message);
      // No throw - los logs no son críticos
    }
  },

  /**
   * Agrega múltiples logs en batch
   */
  async addLogs(jobId: string, messages: string[]) {
    try {
      const job = await prisma.backgroundJob.findUnique({
        where: { id: jobId },
        select: { logs: true },
      });
      
      if (!job) {
        console.warn(`⚠️  [DB] Job ${jobId} no encontrado para agregar logs`);
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
      
      console.log(`📝 [DB] ${messages.length} logs agregados a job ${jobId}`);
    } catch (error: any) {
      console.error(`❌ [DB] Error agregando logs batch a job ${jobId}:`, error.message);
      // No throw - los logs no son críticos
    }
  },

  /**
   * Guarda el resultado final del job
   */
  async saveResult(jobId: string, result: any) {
    console.log(`[DB] Guardando resultado final de job ${jobId}...`);
    
    try {
      const job = await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          result,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      console.log(`✅ [DB] Job ${jobId} completado exitosamente`);
      return job;
    } catch (error: any) {
      console.error(`❌ [DB] Error guardando resultado de job ${jobId}:`, error.message);
      throw error;
    }
  },

  /**
   * Marca el job como fallido
   */
  async markAsFailed(jobId: string, error: string) {
    console.log(`[DB] Marcando job ${jobId} como FAILED...`);
    
    try {
      const job = await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error,
          completedAt: new Date(),
        },
      });

      console.error(`❌ [DB] Job ${jobId} falló: ${error}`);
      return job;
    } catch (dbError: any) {
      console.error(`❌ [DB] Error marcando job ${jobId} como fallido:`, dbError.message);
      throw dbError;
    }
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
    console.log(`[DB] Intentando cancelar job ${jobId} por usuario ${userId}...`);
    
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

    console.log(`🚫 [DB] Job ${jobId} cancelado por usuario`);
    return updatedJob;
  },
};