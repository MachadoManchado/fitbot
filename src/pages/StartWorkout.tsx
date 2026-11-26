import { useLiveQuery } from 'dexie-react-hooks'
import { Loading } from '../components'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { IconBadge } from '../Icon'
import { db, today, type SessionItem } from '../db'
import { setActiveSession, useActiveSession } from '../hooks'

export default function StartWorkout() {
  const navigate = useNavigate()
  const active = useActiveSession()

  const plans = useLiveQuery(async () => {
    const ps = await db.plans.orderBy('order').toArray()
    const lastByPlan = new Map<number, string>()
    for (const w of await db.workouts.orderBy('date').toArray()) if (w.planId) lastByPlan.set(w.planId, w.date)
    return Promise.all(
      ps.map(async (p) => ({ ...p, count: await db.planExercises.where('planId').equals(p.id).count(), last: lastByPlan.get(p.id) })),
    )
  }, [])

  if (active === undefined || plans === undefined) return <Loading />
  if (active) return <Navigate to="/sessao" replace />

  // Sugestão: a ficha feita há mais tempo (ou nunca feita).
  const suggested = [...plans].filter((p) => p.count > 0).sort((a, b) => (a.last ?? '') < (b.last ?? '') ? -1 : 1)[0]

  async function start(planId: number, name: string) {
    const items = await db.planExercises.where('planId').equals(planId).sortBy('order')
    if (items.length === 0) {
      navigate(`/fichas/${planId}`)
      return
    }
    const workoutId = await db.workouts.add({ date: today(), name, planId, startedAt: Date.now() })
    const sessionItems: SessionItem[] = items.map((i) => ({ exerciseId: i.exerciseId, sets: i.blocks?.length ?? i.sets, reps: i.reps, weight: i.weight, note: i.note, done: 0, seconds: i.seconds, blocks: i.blocks }))
    await setActiveSession({ workoutId, planId, items: sessionItems, current: 0 })
    navigate('/sessao', { replace: true })
  }

  return (
    <div className="page fullscreen">
      <header className="page-head">
        <h1>Qual treino hoje?</h1>
        <Link to="/treinos" className="link">Fechar</Link>
      </header>
      <div className="choice-grid">
        {plans.map((p) => (
          <button key={p.id} type="button" className={`choice${suggested?.id === p.id ? ' suggested' : ''}`} onClick={() => void start(p.id, p.name)}>
            {suggested?.id === p.id && <span className="badge">Sugerido</span>}
            <IconBadge name="dumbbell" size={52} tone="train" />
            <strong>{p.name}</strong>
            <span className="muted small">{p.count} exercícios</span>
          </button>
        ))}
      </div>
      <Link to="/fichas/nova" className="btn ghost full">+ Criar ficha nova</Link>
    </div>
  )
}
