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

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, phone_numbers, image_url } = evt.data

    const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)
    const userEmail = primaryEmail?.email_address || ''

    // Como usamos invitaciones de Clerk, ya no necesitamos validar allowlist
    // Todos los usuarios que lleguen acá fueron invitados desde el dashboard
    await prisma.adminUser.create({
      data: {
        id: id, // Usar clerkId como PK
        clerkId: id,
        email: userEmail,
        firstName: first_name,
        lastName: last_name,
        fullName: `${first_name || ''} ${last_name || ''}`.trim(),
        phoneNumber: phone_numbers?.find(p => p.id === evt.data.primary_phone_number_id)?.phone_number,
        profileImageUrl: image_url,
        role: 'ADMIN', // Por defecto ADMIN, puedes ajustar manualmente después
        isActive: true,
      },
    })

    console.log(`[CLERK WEBHOOK] Usuario creado en DB: ${userEmail}`)
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, phone_numbers, image_url } = evt.data

    const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id)
    const primaryPhone = phone_numbers?.find(p => p.id === evt.data.primary_phone_number_id)

    await prisma.adminUser.update({
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

    console.log(`[CLERK WEBHOOK] Usuario actualizado: ${primaryEmail?.email_address}`)
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    // Soft delete
    await prisma.adminUser.update({
      where: { clerkId: id },
      data: {
        isActive: false,
      },
    })

    console.log(`[CLERK WEBHOOK] Usuario desactivado: ${id}`)
  }

  return new Response('Webhook processed', { status: 200 })
}