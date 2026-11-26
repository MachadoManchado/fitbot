import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconBadge } from '../Icon'
import { animFor, ExerciseAnim, ExerciseThumb } from '../ExerciseAnim'
import { Sheet, Stepper, Toast, fmt, Loading } from '../components'
import { db, defaultBlocks, formatDuration, kindOf, MUSCLE_ICONS, type ActiveSession, type CardioBlock, type SessionItem } from '../db'
import { setActiveSession, useActiveSession, usePrefs } from '../hooks'
import Mascot from '../Mascot'
import { sfx } from '../sfx'

interface Summary {
  duration: number
  exercises: number
  total: number
  sets: number
  volume: number
  cardioMin: number
  kcal?: number
}

/** Gasto estimado (MET × peso × horas). Só aparece na interface completa; é uma estimativa grosseira. */
const MET = { strength: 5, bodyweight: 4.5, time: 4, cardio: 7 } as const

export default function Session() {
  const navigate = useNavigate()
  const session = useActiveSession()
  const prefs = usePrefs()
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const workout = useLiveQuery(async () => (session ? db.workouts.get(session.workoutId) : undefined), [session?.workoutId])
  const [now, setNow] = useState(Date.now())
  const [toast, setToast] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [similar, setSimilar] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  // Cronômetro da série por tempo / bloco de cardio: quando termina (ms) ou quanto falta se pausado.
  const [timerEnd, setTimerEnd] = useState<number | null>(null)
  const [paused, setPaused] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)
  const firing = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const s = session ?? null
  const item = s ? s.items[s.current] : undefined
  const ex = item && exercises ? exercises.find((e) => e.id === item.exerciseId) : undefined
  const kind = kindOf(ex)
  const blocks: CardioBlock[] = item?.blocks ?? defaultBlocks(ex?.metric)

  // Cronômetro chegou a zero: conclui a série/bloco sozinho.
  useEffect(() => {
    if (timerEnd === null || now < timerEnd || firing.current) return
    firing.current = true
    sfx.timer()
    setTimerEnd(null)
    void completeSet().finally(() => (firing.current = false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, timerEnd])

  if (summary) return <SummaryScreen summary={summary} detailed={prefs?.mode === 'completa'} />
  if (session === undefined || !exercises || !prefs) return <Loading />
  if (session === null || !s || !item) {
    return (
      <div className="page fullscreen center">
        <p className="muted">Nenhum treino em andamento.</p>
        <Link to="/treinar" className="btn primary">Iniciar treino</Link>
      </div>
    )
  }

  const total = kind === 'cardio' ? blocks.length : item.sets
  const pending = s.items.map((it, i) => ({ it, i })).filter(({ it }) => it.done < (it.blocks?.length ?? it.sets))
  const elapsed = workout?.startedAt ? now - workout.startedAt : 0
  const block = blocks[Math.min(item.done, blocks.length - 1)]
  const timed = kind === 'time' || kind === 'cardio'
  const fullSeconds = kind === 'cardio' ? block.min * 60 : (item.seconds ?? 30)
  const left = timerEnd !== null ? Math.max(0, Math.ceil((timerEnd - now) / 1000)) : (paused ?? fullSeconds)

  const save = (next: ActiveSession) => setActiveSession(next)
  const resetTimer = () => {
    setTimerEnd(null)
    setPaused(null)
  }
  const go = (i: number) => {
    resetTimer()
    return save({ ...s, current: (i + s.items.length) % s.items.length })
  }
  const patchItem = (patch: Partial<SessionItem>) => save({ ...s, items: s.items.map((it, i) => (i === s.current ? { ...it, ...patch } : it)) })
  const patchBlock = (patch: Partial<CardioBlock>) => patchItem({ blocks: blocks.map((b, i) => (i === Math.min(item.done, blocks.length - 1) ? { ...b, ...patch } : b)) })

  async function completeSet() {
    const cur = s!.items[s!.current]
    const curTotal = kind === 'cardio' ? blocks.length : cur.sets
    if (cur.done >= curTotal) return
    const base = { workoutId: s!.workoutId, exerciseId: cur.exerciseId, createdAt: Date.now() }
    if (kind === 'cardio') {
      const b = blocks[cur.done]
      const doneSec = timerEnd !== null || paused !== null ? b.min * 60 - left : b.min * 60
      await db.sets.add({ ...base, reps: 0, weight: 0, seconds: Math.max(1, doneSec), speed: b.speed, incline: b.incline, level: b.level })
    } else if (kind === 'time') {
      const sec = cur.seconds ?? 30
      await db.sets.add({ ...base, reps: 0, weight: cur.weight, seconds: timerEnd !== null || paused !== null ? sec - left : sec })
    } else {
      await db.sets.add({ ...base, reps: cur.reps, weight: cur.weight })
    }
    resetTimer()
    const items = s!.items.map((it, i) => (i === s!.current ? { ...it, done: it.done + 1, blocks: kind === 'cardio' ? blocks : it.blocks } : it))
    const finishedExercise = items[s!.current].done >= curTotal
    sfx.set()
    if (!finishedExercise) {
      await save({ ...s!, items })
      return
    }
    const nextPending = findNextPending(items, s!.current)
    if (nextPending === -1) {
      await save({ ...s!, items })
      setToast('Último exercício concluído!')
      setTimeout(() => void finish({ ...s!, items }), 900)
      return
    }
    setToast('Exercício concluído! Próximo →')
    await save({ ...s!, items })
    setTimeout(() => void save({ ...s!, items, current: nextPending }), 700)
  }

  function startOrPause() {
    if (timerEnd !== null) {
      setPaused(Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)))
      setTimerEnd(null)
      return
    }
    sfx.tap()
    setTimerEnd(Date.now() + (paused ?? fullSeconds) * 1000)
    setPaused(null)
  }

  function askEnd() {
    if (pending.length > 0) {
      setToast(`Faltam ${pending.length} exercício(s)`)
      void go(pending[0].i)
      setTimeout(() => setConfirmEnd(true), 900)
    } else {
      void finish(s!)
    }
  }

  async function finish(state: ActiveSession) {
    const endedAt = Date.now()
    await db.workouts.update(state.workoutId, { endedAt })
    const sets = await db.sets.where('workoutId').equals(state.workoutId).toArray()
    // Atualiza a ficha com o que foi usado hoje (menos digitação no próximo treino).
    const planItems = await db.planExercises.where('planId').equals(state.planId).toArray()
    for (const it of state.items) {
      const pe = planItems.find((p) => p.exerciseId === it.exerciseId)
      if (!pe || it.done === 0) continue
      await db.planExercises.update(pe.id, { weight: it.weight, reps: it.reps, seconds: it.seconds, blocks: it.blocks ?? pe.blocks })
    }
    const w = await db.workouts.get(state.workoutId)
    const duration = endedAt - (w?.startedAt ?? endedAt)
    const cardioSec = sets.filter((x) => x.seconds && !x.reps && x.speed !== undefined || x.level !== undefined).reduce((a, x) => a + (x.seconds ?? 0), 0)
    const lastWeight = (await db.body.orderBy('date').reverse().toArray()).find((b) => b.weight !== undefined)?.weight ?? 70
    const mainKind = kindOf(exercises?.find((e) => e.id === state.items[0]?.exerciseId))
    sfx.workout()
    setSummary({
      duration,
      exercises: state.items.filter((i) => i.done >= (i.blocks?.length ?? i.sets)).length,
      total: state.items.length,
      sets: sets.length,
      volume: sets.reduce((sum, x) => sum + x.reps * x.weight, 0),
      cardioMin: Math.round(cardioSec / 60),
      kcal: Math.round(MET[mainKind] * lastWeight * (duration / 3600000)),
    })
    await setActiveSession(null)
  }

  async function discard() {
    if (!confirm('Descartar este treino? As séries registradas serão apagadas.')) return
    await db.sets.where('workoutId').equals(s!.workoutId).delete()
    await db.workouts.delete(s!.workoutId)
    await setActiveSession(null)
    navigate('/treinos')
  }

  const similarList = exercises.filter((e) => ex && e.muscle === ex.muscle && e.id !== ex.id)
  const unit = kind === 'cardio' ? 'Bloco' : 'Série'
  const finishedHere = item.done >= total

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
            className={`ex-dot${i === s.current ? ' current' : ''}${it.done >= (it.blocks?.length ?? it.sets) ? ' done' : it.done > 0 ? ' partial' : ''}`}
            onClick={() => void go(i)}
          />
        ))}
      </div>

      <article className="ex-card" key={`${s.current}-${item.exerciseId}`}>
        <div className="ex-media">
          {animFor(ex) ? (
            <ExerciseAnim slug={animFor(ex)!} label={ex?.name} />
          ) : (
            <IconBadge name={MUSCLE_ICONS[ex?.muscle ?? 'Outro'] ?? 'dumbbell'} size={88} />
          )}
        </div>
        <h1 className="ex-title">{ex?.name ?? 'Exercício'}</h1>
        <p className="muted ex-sub">{item.note || ex?.muscle}</p>

        <div className="set-pips" aria-label={`${unit} ${Math.min(item.done + 1, total)} de ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`pip${i < item.done ? ' done' : i === item.done ? ' now' : ''}`} />
          ))}
        </div>
        <p className="set-label">{finishedHere ? 'Concluído ✓' : `${unit} ${item.done + 1} de ${total}`}</p>

        {timed && !finishedHere && (
          <div className={`countdown${timerEnd !== null ? ' running' : ''}`} aria-live="polite">
            {formatClock(left * 1000)}
          </div>
        )}

        {kind === 'cardio' ? (
          !finishedHere && (
            <div className={`steppers ${ex?.metric === 'speed' ? '' : ''}`}>
              {ex?.metric === 'speed' ? (
                <>
                  <Stepper label="Vel. km/h" value={block.speed ?? 6} step={0.5} min={1} onChange={(v) => void patchBlock({ speed: v })} />
                  <Stepper label="Incl. %" value={block.incline ?? 0} step={1} min={0} onChange={(v) => void patchBlock({ incline: v })} />
                </>
              ) : (
                <>
                  <Stepper label="Nível" value={block.level ?? 5} step={1} min={1} onChange={(v) => void patchBlock({ level: Math.min(20, v) })} />
                  <Stepper label="Minutos" value={block.min} step={1} min={1} onChange={(v) => void patchBlock({ min: v })} />
                </>
              )}
            </div>
          )
        ) : kind === 'time' ? (
          <div className="steppers">
            <Stepper label="Segundos" value={item.seconds ?? 30} step={5} min={5} onChange={(v) => { resetTimer(); void patchItem({ seconds: v }) }} />
            <Stepper label="Peso extra (kg)" value={item.weight} step={1} min={0} onChange={(v) => void patchItem({ weight: v })} />
          </div>
        ) : (
          <div className="steppers">
            <Stepper label="Repetições" value={item.reps} step={1} min={1} onChange={(v) => void patchItem({ reps: v })} />
            <Stepper label={kind === 'bodyweight' ? 'Peso extra (kg)' : 'Carga (kg)'} value={item.weight} step={1} min={0} onChange={(v) => void patchItem({ weight: v })} />
          </div>
        )}

        {kind === 'cardio' && blocks.length > 1 && (
          <ol className="block-list">
            {blocks.map((b, i) => (
              <li key={i} className={i < item.done ? 'done' : i === item.done ? 'now' : ''}>
                {b.min} min · {ex?.metric === 'speed' ? `${fmt(b.speed ?? 0)} km/h${b.incline ? ` · ${b.incline}%` : ''}` : `nível ${b.level ?? 5}`}
              </li>
            ))}
          </ol>
        )}

        <div className="ex-actions">
          <button type="button" className="btn ghost" onClick={() => setSimilar(true)}>⇄ Parecidos</button>
          {item.done > 0 && item.done < total && (
            <button type="button" className="btn ghost" onClick={() => void patchItem({ done: total })}>Pular resto</button>
          )}
        </div>
      </article>

      <div className="session-foot">
        <button type="button" className="icon-btn big" aria-label="Exercício anterior" onClick={() => void go(s.current - 1)}>‹</button>
        {timed && !finishedHere ? (
          <div className="timed-actions">
            <button type="button" className="btn primary huge" onClick={startOrPause}>
              {timerEnd !== null ? 'Pausar' : paused !== null ? 'Continuar' : '▶ Iniciar'}
            </button>
            <button type="button" className="btn ghost" onClick={() => void completeSet()}>Concluir</button>
          </div>
        ) : (
          <button type="button" className="btn primary huge" disabled={finishedHere} onClick={() => void completeSet()}>
            {finishedHere ? 'Feito ✓' : 'Concluir série'}
          </button>
        )}
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
                  resetTimer()
                  const k = kindOf(e)
                  void patchItem({
                    exerciseId: e.id,
                    done: 0,
                    seconds: k === 'time' ? (item.seconds ?? 30) : item.seconds,
                    blocks: k === 'cardio' ? (item.blocks ?? defaultBlocks(e.metric)) : undefined,
                    sets: k === 'cardio' ? (item.blocks ?? defaultBlocks(e.metric)).length : item.sets,
                  })
                  setSimilar(false)
                  setToast(`Trocado por ${e.name}`)
                }}
              >
                <ExerciseThumb name={e.name} muscle={e.muscle} slug={e.slug} size={72} />
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {confirmEnd && (
        <Sheet title="Finalizar o treino?" onClose={() => setConfirmEnd(false)}>
          <p className="muted">Ainda faltam {pending.length} exercício(s). Você pode continuar de onde parou ou finalizar assim mesmo.</p>
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
    if (items[i].done < (items[i].blocks?.length ?? items[i].sets)) return i
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

function SummaryScreen({ summary, detailed }: { summary: Summary; detailed: boolean }) {
  const all = summary.exercises === summary.total
  return (
    <div className="page fullscreen center summary">
      <Mascot mood={all ? 'great' : 'good'} size={160} activity="flex" />
      <h1>{all ? 'Treino completo!' : 'Treino registrado!'}</h1>
      <div className="details-grid">
        <div className="mini-stat"><strong>{formatDuration(summary.duration)}</strong><span className="muted small">duração</span></div>
        <div className="mini-stat"><strong>{summary.exercises}/{summary.total}</strong><span className="muted small">exercícios</span></div>
        <div className="mini-stat"><strong>{summary.sets}</strong><span className="muted small">séries / blocos</span></div>
        {summary.volume > 0 ? (
          <div className="mini-stat"><strong>{fmt(summary.volume, 0)} kg</strong><span className="muted small">volume</span></div>
        ) : (
          <div className="mini-stat"><strong>{summary.cardioMin} min</strong><span className="muted small">de cardio</span></div>
        )}
        {detailed && summary.kcal !== undefined && (
          <div className="mini-stat"><strong>~{summary.kcal} kcal</strong><span className="muted small">gasto estimado</span></div>
        )}
      </div>
      <p className="muted small">O que você usou hoje já ficou salvo na ficha para o próximo treino.</p>
      <Link to="/" className="btn primary full">Voltar ao início</Link>
    </div>
  )
}
