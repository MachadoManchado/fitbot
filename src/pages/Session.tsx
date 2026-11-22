import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconBadge } from '../Icon'
import { animFor, ExerciseAnim, ExerciseThumb } from '../ExerciseAnim'
import { Sheet, Stepper, Toast, fmt, Loading } from '../components'
import { db, formatDuration, MUSCLE_ICONS, type ActiveSession } from '../db'
import { setActiveSession, useActiveSession } from '../hooks'
import Mascot from '../Mascot'

interface Summary {
  duration: number
  exercises: number
  total: number
  sets: number
  volume: number
}

export default function Session() {
  const navigate = useNavigate()
  const session = useActiveSession()
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const workout = useLiveQuery(async () => (session ? db.workouts.get(session.workoutId) : undefined), [session?.workoutId])
  const [now, setNow] = useState(Date.now())
  const [toast, setToast] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [similar, setSimilar] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  if (summary) return <SummaryScreen summary={summary} />
  if (session === undefined || !exercises) return <Loading />
  if (session === null) {
    return (
      <div className="page fullscreen center">
        <p className="muted">Nenhum treino em andamento.</p>
        <Link to="/treinar" className="btn primary">Iniciar treino</Link>
      </div>
    )
  }

  const s: ActiveSession = session
  const item = s.items[s.current]
  const ex = exercises.find((e) => e.id === item.exerciseId)
  const pending = s.items.map((it, i) => ({ it, i })).filter(({ it }) => it.done < it.sets)
  const elapsed = workout?.startedAt ? now - workout.startedAt : 0

  const save = (next: ActiveSession) => setActiveSession(next)
  const go = (i: number) => save({ ...s, current: (i + s.items.length) % s.items.length })
  const patchItem = (patch: Partial<typeof item>) =>
    save({ ...s, items: s.items.map((it, i) => (i === s.current ? { ...it, ...patch } : it)) })

  async function completeSet() {
    if (item.done >= item.sets) return
    await db.sets.add({ workoutId: s.workoutId, exerciseId: item.exerciseId, reps: item.reps, weight: item.weight, createdAt: Date.now() })
    const items = s.items.map((it, i) => (i === s.current ? { ...it, done: it.done + 1 } : it))
    const finishedExercise = items[s.current].done >= items[s.current].sets
    if (!finishedExercise) {
      await save({ ...s, items })
      return
    }
    const nextPending = findNextPending(items, s.current)
    if (nextPending === -1) {
      await save({ ...s, items })
      setToast('Último exercício concluído!')
      setTimeout(() => void finish({ ...s, items }), 900)
      return
    }
    setToast('Exercício concluído! Próximo →')
    await save({ ...s, items })
    setTimeout(() => void save({ ...s, items, current: nextPending }), 700)
  }

  function askEnd() {
    if (pending.length > 0) {
      setToast(`Faltam ${pending.length} exercício(s)`)
      void go(pending[0].i)
      setTimeout(() => setConfirmEnd(true), 900)
    } else {
      void finish(s)
    }
  }

  async function finish(state: ActiveSession) {
    const endedAt = Date.now()
    await db.workouts.update(state.workoutId, { endedAt })
    const sets = await db.sets.where('workoutId').equals(state.workoutId).toArray()
    // Atualiza a ficha com as cargas e repetições usadas hoje (menos digitação no próximo treino).
    const planItems = await db.planExercises.where('planId').equals(state.planId).toArray()
    for (const it of state.items) {
      const pe = planItems.find((p) => p.exerciseId === it.exerciseId)
      if (pe && it.done > 0 && (pe.weight !== it.weight || pe.reps !== it.reps)) await db.planExercises.update(pe.id, { weight: it.weight, reps: it.reps })
    }
    const w = await db.workouts.get(state.workoutId)
    setSummary({
      duration: endedAt - (w?.startedAt ?? endedAt),
      exercises: state.items.filter((i) => i.done >= i.sets).length,
      total: state.items.length,
      sets: sets.length,
      volume: sets.reduce((sum, x) => sum + x.reps * x.weight, 0),
    })
    await setActiveSession(null)
  }

  async function discard() {
    if (!confirm('Descartar este treino? As séries registradas serão apagadas.')) return
    await db.sets.where('workoutId').equals(s.workoutId).delete()
    await db.workouts.delete(s.workoutId)
    await setActiveSession(null)
    navigate('/treinos')
  }

  const similarList = exercises.filter((e) => ex && e.muscle === ex.muscle && e.id !== ex.id)

  return (
    <div
      className="page fullscreen session"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 60) void go(s.current + (dx < 0 ? 1 : -1))
      }}
    >
      <header className="session-head">
        <button type="button" className="btn ghost small-btn" onClick={askEnd}>Encerrar</button>
        <span className="timer" aria-label="Tempo de treino">{formatClock(elapsed)}</span>
        <span className="muted small">{s.current + 1}/{s.items.length}</span>
      </header>

      <div className="ex-dots" aria-hidden="true">
        {s.items.map((it, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            className={`ex-dot${i === s.current ? ' current' : ''}${it.done >= it.sets ? ' done' : it.done > 0 ? ' partial' : ''}`}
            onClick={() => void go(i)}
          />
        ))}
      </div>

      <article className="ex-card" key={`${s.current}-${item.exerciseId}`}>
        <div className="ex-media">
          {animFor(ex?.name) ? (
            <ExerciseAnim slug={animFor(ex?.name)!} label={ex?.name} />
          ) : (
            <IconBadge name={MUSCLE_ICONS[ex?.muscle ?? 'Outro'] ?? 'dumbbell'} size={88} />
          )}
        </div>
        <h1 className="ex-title">{ex?.name ?? 'Exercício'}</h1>
        <p className="muted ex-sub">{item.note || ex?.muscle}</p>

        <div className="set-pips" aria-label={`Série ${Math.min(item.done + 1, item.sets)} de ${item.sets}`}>
          {Array.from({ length: item.sets }, (_, i) => (
            <span key={i} className={`pip${i < item.done ? ' done' : i === item.done ? ' now' : ''}`} />
          ))}
        </div>
        <p className="set-label">
          {item.done >= item.sets ? 'Concluído ✓' : `Série ${item.done + 1} de ${item.sets}`}
        </p>

        <div className="steppers">
          <Stepper label="Repetições" value={item.reps} step={1} min={1} onChange={(v) => void patchItem({ reps: v })} />
          <Stepper label="Carga (kg)" value={item.weight} step={1} min={0} onChange={(v) => void patchItem({ weight: v })} />
        </div>

        <div className="ex-actions">
          <button type="button" className="btn ghost" onClick={() => setSimilar(true)}>⇄ Parecidos</button>
          {item.done > 0 && item.done < item.sets && (
            <button type="button" className="btn ghost" onClick={() => void patchItem({ done: item.sets })}>Pular resto</button>
          )}
        </div>
      </article>

      <div className="session-foot">
        <button type="button" className="icon-btn big" aria-label="Exercício anterior" onClick={() => void go(s.current - 1)}>‹</button>
        <button type="button" className="btn primary huge" disabled={item.done >= item.sets} onClick={() => void completeSet()}>
          {item.done >= item.sets ? 'Feito ✓' : 'Concluir série'}
        </button>
        <button type="button" className="icon-btn big" aria-label="Próximo exercício" onClick={() => void go(s.current + 1)}>›</button>
      </div>

      {toast && <Toast>{toast}</Toast>}

      {similar && (
        <Sheet title={`Parecidos com ${ex?.name ?? ''}`} onClose={() => setSimilar(false)}>
          {similarList.length === 0 && <p className="muted">Nenhum exercício parecido cadastrado.</p>}
          <div className="option-grid">
            {similarList.map((e) => (
              <button
                key={e.id}
                type="button"
                className="option"
                onClick={() => {
                  void patchItem({ exerciseId: e.id, done: 0 })
                  setSimilar(false)
                  setToast(`Trocado por ${e.name}`)
                }}
              >
                <ExerciseThumb name={e.name} muscle={e.muscle} size={72} />
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {confirmEnd && (
        <Sheet title="Finalizar o treino?" onClose={() => setConfirmEnd(false)}>
          <p className="muted">
            Ainda faltam {pending.length} exercício(s). Você pode continuar de onde parou ou finalizar assim mesmo.
          </p>
          <div className="stack-form">
            <button type="button" className="btn primary full" onClick={() => setConfirmEnd(false)}>Continuar treinando</button>
            <button type="button" className="btn ghost full" onClick={() => { setConfirmEnd(false); void finish(s) }}>Finalizar mesmo assim</button>
            <button type="button" className="link small danger-text" onClick={() => void discard()}>Descartar treino</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function findNextPending(items: ActiveSession['items'], from: number): number {
  for (let k = 1; k <= items.length; k++) {
    const i = (from + k) % items.length
    if (items[i].done < items[i].sets) return i
  }
  return -1
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function SummaryScreen({ summary }: { summary: Summary }) {
  const all = summary.exercises === summary.total
  return (
    <div className="page fullscreen center summary">
      <Mascot mood={all ? 'great' : 'good'} size={160} />
      <h1>{all ? 'Treino completo!' : 'Treino registrado!'}</h1>
      <div className="details-grid">
        <div className="mini-stat"><strong>{formatDuration(summary.duration)}</strong><span className="muted small">duração</span></div>
        <div className="mini-stat"><strong>{summary.exercises}/{summary.total}</strong><span className="muted small">exercícios</span></div>
        <div className="mini-stat"><strong>{summary.sets}</strong><span className="muted small">séries</span></div>
        <div className="mini-stat"><strong>{fmt(summary.volume, 0)} kg</strong><span className="muted small">volume</span></div>
      </div>
      <p className="muted small">As cargas que você usou hoje já ficaram salvas na ficha para o próximo treino.</p>
      <Link to="/" className="btn primary full">Voltar ao início</Link>
    </div>
  )
}
