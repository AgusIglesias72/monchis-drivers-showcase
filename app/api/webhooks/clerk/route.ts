// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    // svix.verify() ya valida:
    // - firma HMAC con CLERK_WEBHOOK_SECRET
    // - timestamp dentro de ±5 min (rechaza replays viejos)
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const eventType = evt.type

  // Idempotencia: todos los handlers usan upsert/update tolerantes a re-entrega.
  // Si Svix reintenta un mismo svix-id (red, 5xx transitorio, etc.) no genera
  // duplicados ni rompe por unique constraint.
  try {
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, phone_numbers, image_url } = evt.data

      const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)
      const userEmail = primaryEmail?.email_address || ''
      const phoneNumber = phone_numbers?.find(p => p.id === evt.data.primary_phone_number_id)?.phone_number

      // upsert hace que el retry de Svix no falle con P2002 unique constraint.
      await prisma.adminUser.upsert({
        where: { clerkId: id },
        create: {
          id: id,
          clerkId: id,
          email: userEmail,
          firstName: first_name,
          lastName: last_name,
          fullName: `${first_name || ''} ${last_name || ''}`.trim(),
          phoneNumber,
          profileImageUrl: image_url,
          role: 'ADMIN',
          isActive: true,
        },
        update: {
          email: userEmail,
          firstName: first_name,
          lastName: last_name,
          fullName: `${first_name || ''} ${last_name || ''}`.trim(),
          phoneNumber,
          profileImageUrl: image_url,
        },
      })

      console.log(`[CLERK WEBHOOK] user.created procesado: clerkId=${id}`)
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, phone_numbers, image_url } = evt.data

      const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)
      const primaryPhone = phone_numbers?.find(p => p.id === evt.data.primary_phone_number_id)

      // updateMany (vs update) no falla si el row no existe → idempotente cuando
      // el created se perdió y solo llega el updated.
      await prisma.adminUser.updateMany({
        where: { clerkId: id },
        data: {
          email: primaryEmail?.email_address || '',
          firstName: first_name,
          lastName: last_name,
          fullName: `${first_name || ''} ${last_name || ''}`.trim(),
          phoneNumber: primaryPhone?.phone_number,
          profileImageUrl: image_url,
          lastLoginAt: new Date(),
        },
      })

      console.log(`[CLERK WEBHOOK] user.updated procesado: clerkId=${id}`)
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data
      if (!id) return new Response('Missing user id', { status: 400 })

      // Soft delete. updateMany es no-op si no existe → idempotente.
      await prisma.adminUser.updateMany({
        where: { clerkId: id },
        data: { isActive: false },
      })

      console.log(`[CLERK WEBHOOK] user.deleted procesado: clerkId=${id}`)
    }
  } catch (err) {
    console.error('[CLERK WEBHOOK] error procesando evento', {
      svixId: svix_id,
      eventType,
      error: err instanceof Error ? err.message : String(err),
    })
    // 500 → Svix reintenta automáticamente con backoff.
    return new Response('Processing error', { status: 500 })
  }

  return new Response('Webhook processed', { status: 200 })
}