export const meta = {
  name: 'fable-codex',
  description: 'Fable (claude-fable-5) orquesta, Codex (ChatGPT) implementa en paralelo por módulo',
  phases: [
    { title: 'Plan', detail: 'Fable analiza el repo y descompone la tarea', model: 'claude-fable-5' },
    { title: 'Implementar', detail: 'Workers de Codex en paralelo (archivos no superpuestos)' },
    { title: 'Revisar', detail: 'Fable consolida diffs y emite veredicto', model: 'claude-fable-5' },
  ],
}

const PLAN_SCHEMA = {
  type: 'object',
  required: ['summary', 'tasks'],
  properties: {
    summary: { type: 'string' },
    tasks: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'title', 'codex_prompt', 'files'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          codex_prompt: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          depends_on: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

const WORKER_RESULT_SCHEMA = {
  type: 'object',
  required: ['task_id', 'success', 'summary'],
  properties: {
    task_id: { type: 'string' },
    success: { type: 'boolean' },
    summary: { type: 'string' },
    diff: { type: 'string' },
    error: { type: 'string' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  required: ['verdict', 'summary'],
  properties: {
    verdict: { type: 'string', enum: ['approved', 'needs_fixes', 'rejected'] },
    summary: { type: 'string' },
    per_task: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          task_id: { type: 'string' },
          status: { type: 'string', enum: ['ok', 'partial', 'failed', 'skipped'] },
          notes: { type: 'string' },
        },
      },
    },
    action_items: { type: 'array', items: { type: 'string' } },
  },
}

function buildWorkerPrompt(task) {
  return `You are a Codex implementation worker. Your only job is to run Codex CLI and report the result.

## Your Task (id: ${task.id})
${task.title}

## Steps

1. Write the Codex instruction to a temp file:

cat > /tmp/codex-task-${task.id}.txt << 'CODEX_PROMPT_EOF'
${task.codex_prompt}
CODEX_PROMPT_EOF

2. Run Codex:

codex exec --dangerously-bypass-approvals-and-sandbox --ephemeral -o /tmp/codex-out-${task.id}.txt - < /tmp/codex-task-${task.id}.txt

3. Read the output:

cat /tmp/codex-out-${task.id}.txt

4. Capture changes:

git diff HEAD

5. Report via StructuredOutput with task_id="${task.id}", success (true/false), summary, diff (full git diff), error if any.

Do NOT make file changes yourself. Only run the commands and report.`
}

const task = typeof args === 'string' ? args : (args && args.task) ? args.task : null

if (!task) {
  log('ERROR: No task provided. Use: Workflow({ name: "fable-codex", args: { task: "..." } })')
  return { error: 'No task provided' }
}

log(`Tarea: "${task}"`)

phase('Plan')

const plan = await agent(
  `Sos el orquestador de un sistema multi-agente para el repo Monchis Drivers (Next.js 15 + TypeScript + shadcn/ui + Prisma).

## Tarea a implementar
${task}

## Tu trabajo

1. Lee CLAUDE.md primero, luego explorá los archivos específicos necesarios
2. Descomponé en subtareas INDEPENDIENTES para workers de Codex CLI
3. Cada subtarea debe:
   - Tocar archivos DISTINTOS (no superpuestos con otras subtareas)
   - Tener un codex_prompt completo, autónomo y en inglés con TODO el contexto (rutas, patrones, snippets relevantes)
   - Ser implementable sin preguntas
4. Si la tarea es simple, devolvé 1 tarea. Si hay orden, usá depends_on.

## Restricciones clave para incluir en cada codex_prompt
- TypeScript strict — no any, no assertions innecesarias
- DS components en components/ds/ — preferir sobre HTML nativo
- Tokens Tailwind v4 — no hardcodear colores hex cuando existe token
- bg-primary es rojo de marca (#E52050), nunca neutralizar
- Server components por defecto, use client solo cuando necesario
- No comentarios obvios, no archivos doc extra, no builds`,
  { model: 'claude-fable-5', schema: PLAN_SCHEMA, phase: 'Plan' },
)

log(`Plan: ${plan.tasks.length} subtarea(s) — ${plan.tasks.map(t => t.title).join(' | ')}`)
log(plan.summary)

phase('Implementar')

const results = await parallel(
  plan.tasks.map(t => () =>
    agent(buildWorkerPrompt(t), {
      label: `codex:${t.id}`,
      phase: 'Implementar',
      schema: WORKER_RESULT_SCHEMA,
    })
  )
)

const ok = results.filter(Boolean).filter(r => r.success).length
const fail = results.filter(Boolean).filter(r => !r.success).length
log(`Workers: ${ok} ok, ${fail} fallidos`)

phase('Revisar')

const review = await agent(
  `Sos Fable, orquestador del repo Monchis Drivers. Revisá los resultados de los workers de Codex.

## Tarea original
${task}

## Plan ejecutado
${JSON.stringify(plan.tasks.map(t => ({ id: t.id, title: t.title, files: t.files })), null, 2)}

## Resultados
${results.filter(Boolean).map(r =>
  `### ${r.task_id} — ${r.success ? 'OK' : 'FALLO'}
${r.summary}
${r.error ? 'Error: ' + r.error : ''}
Diff:
${r.diff || '(sin cambios)'}`
).join('\n\n')}

## Evaluación

1. ¿Cada worker completó su subtarea?
2. ¿El código sigue patrones del repo? (TS strict, DS components, tokens)
3. ¿Inconsistencias entre módulos?
4. ¿La tarea original quedó resuelta?
5. ¿Faltó algo?

Si verdict != approved, listá action_items concretos.`,
  { model: 'claude-fable-5', schema: REVIEW_SCHEMA, phase: 'Revisar' },
)

log(`Veredicto: ${review.verdict.toUpperCase()} — ${review.summary}`)
if (review.action_items && review.action_items.length > 0) {
  log(`Action items: ${review.action_items.join(' | ')}`)
}

return { task, plan, results: results.filter(Boolean), review }
