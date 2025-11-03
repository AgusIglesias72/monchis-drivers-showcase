// scripts/debug-job.ts
// Ejecutar con: npx tsx scripts/debug-job.ts <jobId>

import { prisma } from '@/lib/prisma';

async function debugJob(jobId: string) {
  console.log(`🔍 Investigando job: ${jobId}\n`);
  
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId }
  });

  if (!job) {
    console.error('❌ Job no encontrado');
    return;
  }

  console.log('📊 Estado del Job:');
  console.log('─'.repeat(50));
  console.log(`ID: ${job.id}`);
  console.log(`Tipo: ${job.type}`);
  console.log(`Estado: ${job.status}`);
  console.log(`Progreso: ${job.progress}% (${job.current}/${job.total})`);
  console.log(`Creado: ${job.createdAt}`);
  console.log(`Iniciado: ${job.startedAt || 'No iniciado'}`);
  console.log(`Completado: ${job.completedAt || 'No completado'}`);
  console.log(`Error: ${job.error || 'Sin errores'}`);
  console.log('─'.repeat(50));
  
  console.log('\n📝 Metadata:');
  console.log(JSON.stringify(job.metadata, null, 2));
  
  console.log('\n📋 Logs:');
  if (Array.isArray(job.logs) && job.logs.length > 0) {
    job.logs.forEach((log, i) => {
      console.log(`${i + 1}. ${log}`);
    });
  } else {
    console.log('Sin logs registrados');
  }

  if (job.result) {
    console.log('\n✅ Resultado:');
    console.log(JSON.stringify(job.result, null, 2));
  }

  // Verificar si el job está "stuck"
  if (job.status === 'QUEUED' || job.status === 'PROCESSING') {
    const now = new Date();
    const created = new Date(job.createdAt);
    const minutesSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60);
    
    console.log(`\n⏱️  Tiempo desde creación: ${minutesSinceCreation.toFixed(1)} minutos`);
    
    if (job.status === 'QUEUED' && minutesSinceCreation > 2) {
      console.log('⚠️  WARNING: El job está en QUEUED por más de 2 minutos');
      console.log('   Posibles causas:');
      console.log('   1. El processor no se está ejecutando');
      console.log('   2. Hay un error en el código del processor');
      console.log('   3. El job no se está actualizando correctamente');
    }
    
    if (job.status === 'PROCESSING' && minutesSinceCreation > 30) {
      console.log('⚠️  WARNING: El job está en PROCESSING por más de 30 minutos');
      console.log('   Revisa si el proceso se trabó o si es normal para este caso');
    }
  }
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('❌ Por favor proporciona un jobId');
  console.log('Uso: npx tsx scripts/debug-job.ts <jobId>');
  process.exit(1);
}

debugJob(jobId)
  .then(() => {
    console.log('\n✅ Debug completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });