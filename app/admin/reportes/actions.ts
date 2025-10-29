// app/admin/reportes/actions.ts

'use server';

import { auth } from '@clerk/nextjs/server';
import { backgroundJobsService } from '@/lib/services/background-jobs.service';
import { JobType, JobStatus } from '@prisma/client';

/**
 * Obtiene el historial de jobs del usuario con filtros opcionales
 */
export async function getJobsHistory(filters?: {
  type?: JobType;
  status?: JobStatus;
  limit?: number;
}) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('No autorizado');
    }

    const jobs = await backgroundJobsService.getByUser(userId, filters);
    
    // Serializar para pasar al cliente
    return jobs.map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      current: job.current,
      total: job.total,
      metadata: job.metadata as any,
      result: job.result as any,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    }));
    
  } catch (error: any) {
    console.error('Error obteniendo historial:', error);
    throw error;
  }
}

/**
 * Obtiene un job específico por ID
 */
export async function getJobById(jobId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('No autorizado');
    }

    const job = await backgroundJobsService.getById(jobId);
    
    if (!job) {
      throw new Error('Job no encontrado');
    }
    
    if (job.userId !== userId) {
      throw new Error('No tienes permiso para ver este job');
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      current: job.current,
      total: job.total,
      logs: job.logs as string[],
      metadata: job.metadata as any,
      result: job.result as any,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    };
    
  } catch (error: any) {
    console.error('Error obteniendo job:', error);
    throw error;
  }
}

/**
 * Cancela un job activo
 */
export async function cancelJob(jobId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('No autorizado');
    }

    await backgroundJobsService.cancel(jobId, userId);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('Error cancelando job:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de jobs del usuario
 */
export async function getJobsStats() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('No autorizado');
    }

    const allJobs = await backgroundJobsService.getByUser(userId, { limit: 100 });
    
    const stats = {
      total: allJobs.length,
      completed: allJobs.filter(j => j.status === 'COMPLETED').length,
      failed: allJobs.filter(j => j.status === 'FAILED').length,
      processing: allJobs.filter(j => j.status === 'PROCESSING').length,
      queued: allJobs.filter(j => j.status === 'QUEUED').length,
    };
    
    return stats;
    
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
}