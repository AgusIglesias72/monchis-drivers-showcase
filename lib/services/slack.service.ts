import "server-only"

// Notificaciones a Slack vía Incoming Webhook. Una sola URL por ahora
// (SLACK_WEBHOOK_URL apunta al canal destino). El texto usa mrkdwn de Slack.
const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || ""

export interface SlackResult {
  ok: boolean
  error?: string
}

export async function sendSlackMessage(text: string): Promise<SlackResult> {
  if (!WEBHOOK_URL) {
    return { ok: false, error: "SLACK_WEBHOOK_URL no configurado" }
  }
  try {
    const res = await fetch(WEBHOOK_URL, {
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
