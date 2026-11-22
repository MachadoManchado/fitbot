import { db, estimate1RM, formatDuration, ON_DIET, shiftDate, today, waterGoalFor } from './db'

export interface Insight {
  kind: 'general' | 'train' | 'diet'
  icon: string
  title: string
  text: string
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** Gera dicas e observações a partir dos dados (regras simples, tudo no aparelho). */
export async function buildInsights(): Promise<Insight[]> {
  const out: Insight[] = []
  const workouts = (await db.workouts.toArray()).filter((w) => w.startedAt && w.endedAt)
  const meals = await db.mealLogs.toArray()

  if (workouts.length === 0 && meals.length === 0) {
    return [{ kind: 'general', icon: 'sparkles', title: 'Prazer, sou seu guia!', text: 'Faça seu primeiro treino ou registre uma refeição, e eu começo a te mostrar como você está indo.' }]
  }

  // Sequência de dias ativos (treino ou dieta seguida), contando de hoje para trás.
  const activeDays = new Set([...workouts.map((w) => w.date), ...meals.filter((m) => ON_DIET.includes(m.status)).map((m) => m.date)])
  let streak = 0
  let d = today()
  if (!activeDays.has(d)) d = shiftDate(d, -1)
  while (activeDays.has(d)) {
    streak++
    d = shiftDate(d, -1)
  }
  if (streak >= 2) out.push({ kind: 'general', icon: 'flame', title: `${streak} dias seguidos`, text: 'Constância é o que mais traz resultado para quem está começando. Continue!' })

  if (workouts.length >= 2) {
    const durations = workouts.map((w) => w.endedAt! - w.startedAt!)
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length
    out.push({ kind: 'train', icon: 'timer', title: `Treino médio: ${formatDuration(avg)}`, text: `Em ${workouts.length} treinos registrados.` })

    const longest = workouts.reduce((a, b) => (b.endedAt! - b.startedAt! > a.endedAt! - a.startedAt! ? b : a))
    out.push({ kind: 'train',
      icon: 'hourglass',
      title: `Treino mais longo: ${formatDuration(longest.endedAt! - longest.startedAt!)}`,
      text: `${longest.name}, em ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(longest.startedAt!))}.`,
    })

    const hours = workouts.map((w) => new Date(w.startedAt!).getHours())
    const period = (h: number) => (h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite')
    const counts = new Map<string, number>()
    hours.forEach((h) => counts.set(period(h), (counts.get(period(h)) ?? 0) + 1))
    const fav = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    out.push({ kind: 'train', icon: 'clock', title: `Você costuma treinar de ${fav[0]}`, text: `${fav[1]} de ${workouts.length} treinos começaram nesse período.` })

    const dayCounts = new Array(7).fill(0)
    workouts.forEach((w) => dayCounts[new Date(w.startedAt!).getDay()]++)
    const bestDay = dayCounts.indexOf(Math.max(...dayCounts))
    if (dayCounts[bestDay] >= 2) out.push({ kind: 'train', icon: 'calendar', title: `Dia favorito: ${WEEKDAYS[bestDay]}`, text: 'É o dia da semana em que você mais treina.' })

    // Rendimento por período: volume médio por treino.
    const vol = new Map<string, number[]>()
    for (const w of workouts) {
      const sets = await db.sets.where('workoutId').equals(w.id).toArray()
      const v = sets.reduce((s, x) => s + x.reps * x.weight, 0)
      const p = period(new Date(w.startedAt!).getHours())
      vol.set(p, [...(vol.get(p) ?? []), v])
    }
    if (vol.size >= 2) {
      const best = [...vol.entries()].map(([p, vs]) => [p, vs.reduce((a, b) => a + b, 0) / vs.length] as const).sort((a, b) => b[1] - a[1])[0]
      out.push({ kind: 'train', icon: 'zap', title: `Mais rendimento de ${best[0]}`, text: 'Nos treinos desse período você levanta mais peso no total.' })
    }
  }

  // Evolução de força: o exercício que mais melhorou.
  const sets = await db.sets.toArray()
  const allWorkouts = new Map((await db.workouts.toArray()).map((w) => [w.id, w]))
  const byEx = new Map<number, { date: string; e1: number }[]>()
  for (const s of sets) {
    const w = allWorkouts.get(s.workoutId)
    if (!w || s.weight <= 0) continue
    byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), { date: w.date, e1: estimate1RM(s.weight, s.reps) }])
  }
  let bestGain: { exId: number; pct: number } | null = null
  for (const [exId, rows] of byEx) {
    const dates = [...new Set(rows.map((r) => r.date))].sort()
    if (dates.length < 2) continue
    const first = Math.max(...rows.filter((r) => r.date === dates[0]).map((r) => r.e1))
    const last = Math.max(...rows.filter((r) => r.date === dates[dates.length - 1]).map((r) => r.e1))
    const pct = ((last - first) / first) * 100
    if (pct > 0 && (!bestGain || pct > bestGain.pct)) bestGain = { exId, pct }
  }
  if (bestGain) {
    const ex = await db.exercises.get(bestGain.exId)
    out.push({ kind: 'train', icon: 'trending-up', title: `+${Math.round(bestGain.pct)}% de força`, text: `No ${ex?.name ?? 'exercício'}, comparando o primeiro e o último treino.` })
  }

  // Dieta: últimos 7 dias.
  const start = shiftDate(today(), -6)
  const week = meals.filter((m) => m.date >= start)
  if (week.length > 0) {
    const ok = week.filter((m) => ON_DIET.includes(m.status)).length
    const pct = Math.round((ok / week.length) * 100)
    out.push({ kind: 'diet',
      icon: pct >= 70 ? 'salad' : 'utensils',
      title: `${pct}% das refeições na dieta`,
      text: pct >= 70 ? 'Ótimo! Não precisa ser perfeito, precisa ser frequente.' : 'Que tal deixar opções mais fáceis na dieta? Assim fica mais simples seguir.',
    })
    const skipped = week.filter((m) => m.status === 'skipped')
    if (skipped.length >= 3) {
      const counts = new Map<string, number>()
      skipped.forEach((m) => counts.set(m.mealType, (counts.get(m.mealType) ?? 0) + 1))
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      out.push({ kind: 'diet', icon: 'skip-forward', title: `Você pulou ${top[0].toLowerCase()} ${top[1]}x`, text: 'Se essa refeição não encaixa na rotina, vale ajustar a dieta.' })
    }
  }

  // Água: últimos 7 dias.
  const waterWeek = await db.water.where('date').aboveOrEqual(start).toArray()
  if (waterWeek.length > 0) {
    const byDay = new Map<string, number>()
    waterWeek.forEach((w) => byDay.set(w.date, (byDay.get(w.date) ?? 0) + w.ml))
    const avg = [...byDay.values()].reduce((a, b) => a + b, 0) / byDay.size
    const lastWeight = (await db.body.orderBy('date').reverse().toArray()).find((b) => b.weight !== undefined)?.weight
    const goalsRow = (await db.settings.get('goals'))?.value as { waterMl?: number } | undefined
    const goal = waterGoalFor(lastWeight, false, goalsRow?.waterMl)
    const ok = avg >= goal * 0.9
    out.push({
      kind: 'diet',
      icon: 'glass-water',
      title: `Água: média de ${(avg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L por dia`,
      text: ok ? 'Hidratação em dia. Isso ajuda no treino e na disposição.' : `Sua meta é cerca de ${(goal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L. Deixe uma garrafa por perto para lembrar.`,
    })
  }

  // Besteiras: últimos 7 dias.
  const treats = await db.treats.where('date').aboveOrEqual(start).toArray()
  if (treats.length > 0) {
    const counts = new Map<string, { n: number; icon: string }>()
    treats.forEach((t) => counts.set(t.name, { n: (counts.get(t.name)?.n ?? 0) + 1, icon: t.icon }))
    const [topName, top] = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0]
    const days = new Set(treats.map((t) => t.date)).size
    out.push({
      kind: 'diet',
      icon: top.icon,
      title: `${treats.length} besteira(s) em ${days} dia(s) da semana`,
      text:
        treats.length <= 3
          ? `A mais comum foi ${topName.toLowerCase()}. Tá tranquilo, equilíbrio também faz parte.`
          : `A mais comum foi ${topName.toLowerCase()} (${top.n}x). Que tal deixar uma opção gostosa da dieta à mão para a hora da vontade?`,
    })
  }

  return out
}
