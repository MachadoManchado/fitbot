import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_GOALS, MEAL_TYPES, ON_DIET, shiftDate, today, waterGoalFor, type ActiveSession, type Goals } from './db'

export function useGoals(): Goals {
  const row = useLiveQuery(() => db.settings.get('goals'), [])
  const v = row?.value as Partial<Goals> | undefined
  return { ...DEFAULT_GOALS, ...(v && typeof v.workoutsPerWeek === 'number' ? v : {}), targetWeight: v?.targetWeight, waterMl: v?.waterMl }
}

export async function saveGoals(goals: Goals) {
  await db.settings.put({ key: 'goals', value: goals })
}

export function useActiveSession(): ActiveSession | null | undefined {
  return useLiveQuery(async () => ((await db.settings.get('activeSession'))?.value as ActiveSession | undefined) ?? null, [])
}

export async function setActiveSession(s: ActiveSession | null) {
  if (s) await db.settings.put({ key: 'activeSession', value: s })
  else await db.settings.delete('activeSession')
}

export interface DayStat {
  date: string
  trained: boolean
  meals: number // refeições seguindo a dieta
  logged: number // refeições registradas (qualquer)
  treats: number // besteiras
}

/** Resumo dos últimos N dias (para o guia e a home). */
export function useRecentDays(n = 7): DayStat[] | undefined {
  return useLiveQuery(async () => {
    const end = today()
    const start = shiftDate(end, -(n - 1))
    const [workouts, meals, treats] = await Promise.all([
      db.workouts.where('date').between(start, end, true, true).toArray(),
      db.mealLogs.where('date').between(start, end, true, true).toArray(),
      db.treats.where('date').between(start, end, true, true).toArray(),
    ])
    const days: DayStat[] = []
    for (let i = 0; i < n; i++) {
      const date = shiftDate(start, i)
      const dm = meals.filter((m) => m.date === date)
      days.push({
        date,
        trained: workouts.some((w) => w.date === date && (w.endedAt !== undefined || w.startedAt === undefined)),
        meals: dm.filter((m) => ON_DIET.includes(m.status)).length,
        logged: dm.length,
        treats: treats.filter((t) => t.date === date).length,
      })
    }
    return days
  }, [n])
}

export type Mood = 'great' | 'good' | 'ok' | 'sleepy'

/** Nota de 0 a 100 da última semana: metade treino, metade dieta. */
export function weekScore(days: DayStat[], workoutsPerWeek: number) {
  const trained = days.filter((d) => d.trained).length
  const dietDays = days.filter((d) => d.logged > 0)
  const followed = days.reduce((s, d) => s + d.meals, 0)
  const logged = days.reduce((s, d) => s + d.logged, 0)
  const trainPart = Math.min(1, trained / Math.max(1, workoutsPerWeek))
  const treats = days.reduce((s, d) => s + d.treats, 0)
  // Cada besteira tira um pouquinho da parte da dieta (sem drama: 5% cada).
  const dietPart = logged > 0 ? Math.max(0, followed / logged - treats * 0.05) : 0
  const score = Math.round((trainPart * 0.5 + dietPart * 0.5 * Math.min(1, dietDays.length / 4)) * 100)
  const mood: Mood = score >= 80 ? 'great' : score >= 55 ? 'good' : score >= 25 ? 'ok' : 'sleepy'
  return { score, mood, trained, followed, logged, treats }
}

export const MEALS_PER_DAY = MEAL_TYPES.length

/** Água do dia: quanto bebeu, meta (pelo peso + treino, ou a meta manual) e os registros. */
export function useWater(date: string) {
  const goals = useGoals()
  return useLiveQuery(async () => {
    const [logs, body, workouts] = await Promise.all([
      db.water.where('date').equals(date).sortBy('time'),
      db.body.orderBy('date').reverse().toArray(),
      db.workouts.where('date').equals(date).count(),
    ])
    const weight = body.find((b) => b.weight !== undefined)?.weight
    const drunk = logs.reduce((s, l) => s + l.ml, 0)
    return { logs, drunk, goal: waterGoalFor(weight, workouts > 0, goals.waterMl), auto: goals.waterMl === undefined, weight }
  }, [date, goals.waterMl])
}
