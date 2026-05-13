// app/api/postulaciones/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { postulacionesStatsService } from '@/lib/services/postulaciones-stats.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get('status') || undefined,
      searchTerm: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const result = await postulacionesStatsService.getPostulaciones(filters);
    
    return NextResponse.json({
      success: true,
      ...result
    });
    
  } catch (error: any) {
    console.error('Error obteniendo postulaciones:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error al obtener postulaciones'
      },
      { status: 500 }
    );
  }
}