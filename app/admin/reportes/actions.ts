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
    
    // Serializar las fechas para que sean JSON-safe
    return jobs.map(job => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
    }));
    
  } catch (error: any) {
    console.error('Error obteniendo historial de jobs:', error);
    throw new Error(error.message || 'Error al obtener el historial');
  }
}

/**
 * Cancela un job en ejecución
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
    throw new Error(error.message || 'Error al cancelar el job');
  }
}

/**
 * Obtiene las estadísticas de jobs del usuario
 */
export async function getJobsStats() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      throw new Error('No autorizado');
    }

    const allJobs = await backgroundJobsService.getByUser(userId);
    
    const stats = {
      total: allJobs.length,
      pending: allJobs.filter(j => j.status === 'QUEUED').length,
      processing: allJobs.filter(j => j.status === 'PROCESSING').length,
      completed: allJobs.filter(j => j.status === 'COMPLETED').length,
      failed: allJobs.filter(j => j.status === 'FAILED').length,
      cancelled: allJobs.filter(j => j.status === 'CANCELLED').length,
    };
    
    return stats;
    
  } catch (error: any) {
    console.error('Error obteniendo stats de jobs:', error);
    throw new Error(error.message || 'Error al obtener estadísticas');
  }
}

/**
 * Obtiene los detalles de un job específico
 */
export async function getJobDetails(jobId: string) {
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
      throw new Error('No autorizado para ver este job');
    }

    // Serializar las fechas
    return {
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
    };
    
  } catch (error: any) {
    console.error('Error obteniendo detalles de job:', error);
    throw new Error(error.message || 'Error al obtener detalles del job');
  }
}