import "server-only"

// Notificaciones a Slack vía Incoming Webhook. SLACK_WEBHOOK_URL es el canal
// default; un caller puede pasar otra URL de webhook (otro canal) por
// parámetro. El texto usa mrkdwn de Slack.
const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || ""

export interface SlackResult {
  ok: boolean
  error?: string
}

export async function sendSlackMessage(
  text: string,
  webhookUrl?: string,
): Promise<SlackResult> {
  const target = webhookUrl || WEBHOOK_URL
  if (!target) {
    return { ok: false, error: "SLACK_WEBHOOK_URL no configurado" }
  }
  try {
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    }
  }
}
