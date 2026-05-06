// scripts/verify-phone-normalization.ts
// Verifica la nueva normalización E.164 para ManyChat y comprueba qué formato
// tienen los drivers que fallaron al disparar el flow.

import { prisma } from '../lib/prisma';

function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) throw new Error('Teléfono vacío o inválido');

  if (digits.startsWith('595')) return `+${digits}`;
  if (digits.startsWith('54') && digits.length >= 12) return `+${digits}`;

  if (digits.startsWith('0') && digits.length === 10) {
    return `+595${digits.substring(1)}`;
  }
  if (digits.length === 9) {
    return `+595${digits}`;
  }
  if (digits.length >= 12) return `+${digits}`;

  return `+595${digits}`;
}

function oldNormalize(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) throw new Error('Teléfono vacío o inválido');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

async function main() {
  console.log('=== TEST UNITARIO normalizeE164 ===\n');

  const cases: Array<{ input: string; expected: string; desc: string }> = [
    { input: '0981234567', expected: '+595981234567', desc: 'PY local con 0' },
    { input: '981234567', expected: '+595981234567', desc: 'PY local sin 0' },
    { input: '595981234567', expected: '+595981234567', desc: 'PY con código país' },
    { input: '+595981234567', expected: '+595981234567', desc: 'PY E.164 ya normalizado' },
    { input: '595 981 234 567', expected: '+595981234567', desc: 'PY con espacios' },
    { input: '0981-234-567', expected: '+595981234567', desc: 'PY con guiones' },
    { input: '+5491134567890', expected: '+5491134567890', desc: 'Argentina E.164' },
    { input: '5491134567890', expected: '+5491134567890', desc: 'Argentina sin +' },
  ];

  let pass = 0;
  let fail = 0;
  for (const c of cases) {
    const got = normalizeE164(c.input);
    const old = (() => {
      try {
        return oldNormalize(c.input);
      } catch {
        return 'ERROR';
      }
    })();
    const ok = got === c.expected;
    if (ok) pass++;
    else fail++;
    const marker = ok ? '✓' : '✗';
    console.log(
      `${marker} ${c.desc.padEnd(28)} input="${c.input.padEnd(18)}" → new="${got}" (old="${old}") expected="${c.expected}"`
    );
  }
  console.log(`\nTotal: ${pass} pass / ${fail} fail\n`);

  console.log('=== DRIVER FALLIDO cmon1mg4l0001jr04qd9x0poh ===\n');

  const driver = await prisma.formDriver.findUnique({
    where: { id: 'cmon1mg4l0001jr04qd9x0poh' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      manychatSubscriberId: true,
      status: true,
    },
  });

  if (!driver) {
    console.log('Driver no encontrado.');
  } else {
    console.log('Datos en DB:');
    console.log(JSON.stringify(driver, null, 2));
    console.log('\nSimulación de normalización:');
    console.log(`  oldNormalize: "${oldNormalize(driver.phoneNumber)}" (lo que mandaba antes)`);
    console.log(`  newNormalize: "${normalizeE164(driver.phoneNumber)}" (lo que va a mandar ahora)`);
  }

  console.log('\n=== MUESTRA DE OTROS DRIVERS RECIENTES ===\n');

  const recent = await prisma.formDriver.findMany({
    where: { manychatSubscriberId: null },
    select: { id: true, firstName: true, phoneNumber: true, status: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  for (const d of recent) {
    const oldVal = (() => {
      try {
        return oldNormalize(d.phoneNumber);
      } catch {
        return 'ERROR';
      }
    })();
    const newVal = (() => {
      try {
        return normalizeE164(d.phoneNumber);
      } catch {
        return 'ERROR';
      }
    })();
    const wouldFail = !oldVal.match(/^\+\d{10,15}$/) || oldVal.startsWith('+0');
    const marker = wouldFail ? '⚠️ ' : '   ';
    console.log(
      `${marker}${d.id.slice(-6)}  raw="${d.phoneNumber.padEnd(18)}" old="${oldVal.padEnd(18)}" new="${newVal}"`
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
