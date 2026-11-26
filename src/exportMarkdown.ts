import { db, DEFAULT_GOALS, formatDuration, MEAL_TYPES, type Goals, describePlanItem, describeSet } from './db'

const STATUS: Record<string, string> = {
  option: 'na dieta (refeição pronta)',
  built: 'na dieta (montada)',
  other: 'fora da dieta',
  skipped: 'pulou',
}

const hhmm = (t?: number) => (t ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '–')
const br = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Intl.DateTimeFormat('pt-BR').format(new Date(y, m - 1, d)) }
const num = (n?: number) => (n === undefined ? '–' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }))
const esc = (s: string) => s.replace(/\|/g, '/')

/** Reúne todos os dados do app num texto Markdown legível (para guardar ou converter depois). */
export async function exportMarkdown(): Promise<string> {
  const [exercises, plans, planExercises, workouts, sets, dietOptions, dietItems, meals, treats, body, goalsRow] = await Promise.all([
    db.exercises.toArray(),
    db.plans.orderBy('order').toArray(),
    db.planExercises.toArray(),
    db.workouts.orderBy('date').toArray(),
    db.sets.toArray(),
    db.dietOptions.toArray(),
    db.dietItems.toArray(),
    db.mealLogs.orderBy('date').toArray(),
    db.treats.orderBy('date').toArray(),
    db.body.orderBy('date').toArray(),
    db.settings.get('goals'),
  ])
  const water = await db.water.orderBy('date').toArray()
  const goals: Goals = { ...DEFAULT_GOALS, ...((goalsRow?.value as Goals | undefined) ?? {}) }
  const exName = new Map(exercises.map((e) => [e.id, e.name]))
  const L: string[] = []

  L.push('# Fitness – exportação de dados', '')
  L.push(`Exportado em ${new Date().toLocaleString('pt-BR')}.`, '')
  L.push(
    `Resumo: ${workouts.length} treinos, ${sets.length} séries, ${meals.length} refeições, ${treats.length} besteiras, ${water.length} registros de água, ${body.length} registros de corpo.`,
    '',
  )

  L.push('## Metas', '')
  L.push(`- Treinos por semana: ${goals.workoutsPerWeek}`)
  L.push(`- Peso meta: ${goals.targetWeight !== undefined ? `${num(goals.targetWeight)} kg` : '–'}`, '')

  L.push('## Treinos feitos', '')
  if (workouts.length === 0) L.push('_Nenhum treino._', '')
  for (const w of [...workouts].reverse()) {
    const ws = sets.filter((s) => s.workoutId === w.id).sort((a, b) => a.createdAt - b.createdAt)
    const dur = w.startedAt && w.endedAt ? formatDuration(w.endedAt - w.startedAt) : '–'
    const volume = ws.reduce((s, x) => s + x.reps * x.weight, 0)
    L.push(`### ${br(w.date)} – ${w.name}`, '')
    L.push(`- Início: ${hhmm(w.startedAt)} · Fim: ${hhmm(w.endedAt)} · Duração: ${dur}`)
    L.push(`- Séries: ${ws.length} · Volume: ${num(volume)} kg`)
    if (w.notes) L.push(`- Anotações: ${w.notes}`)
    const order: number[] = []
    for (const s of ws) if (!order.includes(s.exerciseId)) order.push(s.exerciseId)
    for (const exId of order) {
      const list = ws.filter((s) => s.exerciseId === exId).map((s) => describeSet(s))
      L.push(`  - ${exName.get(exId) ?? 'Exercício apagado'}: ${list.join(', ')}`)
    }
    L.push('')
  }

  L.push('## Dieta – refeições registradas', '')
  if (meals.length === 0) L.push('_Nenhuma refeição._', '')
  else {
    L.push('| Data | Refeição | O que comeu | Situação | Hora |', '|---|---|---|---|---|')
    const byDate = [...meals].sort((a, b) => (a.date === b.date ? MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType) : a.date < b.date ? 1 : -1))
    for (const m of byDate) L.push(`| ${br(m.date)} | ${m.mealType} | ${esc(m.label)} | ${STATUS[m.status] ?? m.status} | ${hhmm(m.time)} |`)
    L.push('')
  }

  L.push('## Besteiras', '')
  if (treats.length === 0) L.push('_Nenhuma._', '')
  else {
    L.push('| Data | Hora | Besteira |', '|---|---|---|')
    for (const t of [...treats].reverse()) L.push(`| ${br(t.date)} | ${hhmm(t.time)} | ${esc(t.name)} |`)
    L.push('')
  }

  L.push('## Água (total por dia)', '')
  if (water.length === 0) L.push('_Nenhum registro._', '')
  else {
    const byDay = new Map<string, number>()
    for (const w of water) byDay.set(w.date, (byDay.get(w.date) ?? 0) + w.ml)
    L.push('| Data | Água (ml) |', '|---|---|')
    for (const [d, ml] of [...byDay.entries()].reverse()) L.push(`| ${br(d)} | ${ml} |`)
    L.push('')
  }

  L.push('## Corpo', '')
  if (body.length === 0) L.push('_Nenhum registro._', '')
  else {
    L.push('| Data | Peso (kg) | Gordura (%) | Cintura | Peito | Braço | Quadril | Coxa |', '|---|---|---|---|---|---|---|---|')
    for (const b of [...body].reverse()) L.push(`| ${br(b.date)} | ${num(b.weight)} | ${num(b.bodyFat)} | ${num(b.waist)} | ${num(b.chest)} | ${num(b.arm)} | ${num(b.hip)} | ${num(b.thigh)} |`)
    L.push('', '_Medidas em cm._', '')
  }

  L.push('## Fichas de treino', '')
  for (const p of plans) {
    L.push(`### ${p.name}`, '')
    const items = planExercises.filter((i) => i.planId === p.id).sort((a, b) => a.order - b.order)
    if (items.length === 0) L.push('_Sem exercícios._')
    for (const i of items) L.push(`- ${exName.get(i.exerciseId) ?? '?'}: ${describePlanItem(i)}${i.note ? ` (${i.note})` : ''}`)
    L.push('')
  }

  L.push('## Minha dieta (configuração)', '')
  for (const type of MEAL_TYPES) {
    L.push(`### ${type}`, '')
    const groups = [...new Set(dietItems.filter((i) => i.mealType === type).map((i) => i.group))]
    for (const g of groups) {
      const names = dietItems.filter((i) => i.mealType === type && i.group === g).sort((a, b) => a.order - b.order).map((i) => i.name)
      L.push(`- ${g}: ${names.join(', ')}`)
    }
    const ready = dietOptions.filter((o) => o.mealType === type).sort((a, b) => a.order - b.order).map((o) => o.name)
    if (ready.length) L.push(`- Refeições prontas: ${ready.join(', ')}`)
    L.push('')
  }

  L.push('## Exercícios cadastrados', '')
  const muscles = [...new Set(exercises.map((e) => e.muscle))]
  for (const m of muscles) L.push(`- ${m}: ${exercises.filter((e) => e.muscle === m).map((e) => e.name).sort().join(', ')}`)
  L.push('')

  return L.join('\n')
}
