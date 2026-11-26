import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon, IconBadge } from '../Icon'
import { ExerciseThumb } from '../ExerciseAnim'
import { Page, Sheet, Stepper, Loading } from '../components'
import { db, defaultBlocks, kindOf, MUSCLE_ICONS, MUSCLES, type CardioBlock, type Exercise, type PlanExercise } from '../db'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function PlanEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'nova'
  const planId = isNew ? null : Number(id)
  const [picking, setPicking] = useState(false)
  const [muscle, setMuscle] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Ficha nova: cria na hora e troca a URL, para tudo ser salvo automaticamente.
  const creating = useRef(false)
  useEffect(() => {
    if (!isNew || creating.current) return
    creating.current = true
    void (async () => {
      const count = await db.plans.count()
      const newId = await db.plans.add({ name: `Treino ${String.fromCharCode(65 + count)}`, order: count })
      navigate(`/fichas/${newId}`, { replace: true })
    })()
  }, [isNew, navigate])

  const plan = useLiveQuery(async () => (planId ? db.plans.get(planId) : undefined), [planId])
  const items = useLiveQuery(async () => (planId ? db.planExercises.where('planId').equals(planId).sortBy('order') : ([] as PlanExercise[])), [planId])
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  if (!planId || !plan || !items || !exercises) return <Loading />
  const exOf = (eid: number) => exercises.find((e) => e.id === eid)

  async function addExercise(ex: Exercise) {
    const base = { planId: planId!, exerciseId: ex.id, order: items!.length, weight: 0 }
    const kind = kindOf(ex)
    if (kind === 'cardio') await db.planExercises.add({ ...base, sets: 1, reps: 0, blocks: defaultBlocks(ex.metric) })
    else if (kind === 'time') await db.planExercises.add({ ...base, sets: 3, reps: 0, seconds: 30 })
    else await db.planExercises.add({ ...base, sets: 3, reps: kind === 'bodyweight' ? 12 : 10 })
    closePicker()
  }

  function closePicker() {
    setPicking(false)
    setMuscle(null)
    setQuery('')
  }

  async function move(it: PlanExercise, dir: -1 | 1) {
    const j = items!.indexOf(it) + dir
    const other = items![j]
    if (!other) return
    await db.planExercises.update(it.id, { order: other.order })
    await db.planExercises.update(other.id, { order: it.order })
  }

  async function removePlan() {
    if (!confirm(`Apagar a ficha "${plan!.name}"? Os treinos já feitos continuam no histórico.`)) return
    await db.planExercises.where('planId').equals(planId!).delete()
    await db.plans.delete(planId!)
    navigate('/treinos')
  }

  const q = norm(query.trim())
  const found = q ? exercises.filter((e) => norm(e.name).includes(q)).slice(0, 40) : []

  return (
    <Page title="Editar ficha" action={<button type="button" className="link" onClick={() => navigate(-1)}>Pronto</button>}>
      <input
        className="title-input"
        defaultValue={plan.name}
        key={plan.id}
        aria-label="Nome da ficha"
        onBlur={(e) => e.target.value.trim() && void db.plans.update(plan.id, { name: e.target.value.trim() })}
      />

      {items.map((it, i) => {
        const ex = exOf(it.exerciseId)
        const kind = kindOf(ex)
        return (
          <section key={it.id} className="card plan-item">
            <div className="card-head">
              <h2>
                <span className="inline-icon"><ExerciseThumb name={ex?.name} muscle={ex?.muscle} slug={ex?.slug} size={44} /></span> {ex?.name ?? '?'}
              </h2>
              <div className="row-actions">
                <button type="button" className="icon-btn" aria-label="Subir" disabled={i === 0} onClick={() => void move(it, -1)}>↑</button>
                <button type="button" className="icon-btn" aria-label="Descer" disabled={i === items.length - 1} onClick={() => void move(it, 1)}>↓</button>
                <button type="button" className="icon-btn" aria-label="Remover" onClick={() => confirm(`Tirar ${ex?.name ?? 'este exercício'} da ficha?`) && void db.planExercises.delete(it.id)}>×</button>
              </div>
            </div>

            {kind === 'cardio' ? (
              <BlocksEditor blocks={it.blocks ?? defaultBlocks(ex?.metric)} metric={ex?.metric} onChange={(blocks) => void db.planExercises.update(it.id, { blocks })} />
            ) : kind === 'time' ? (
              <div className="steppers">
                <Stepper label="Séries" value={it.sets} step={1} min={1} onChange={(v) => void db.planExercises.update(it.id, { sets: v })} />
                <Stepper label="Segundos" value={it.seconds ?? 30} step={5} min={5} onChange={(v) => void db.planExercises.update(it.id, { seconds: v })} />
              </div>
            ) : kind === 'bodyweight' ? (
              <div className="steppers">
                <Stepper label="Séries" value={it.sets} step={1} min={1} onChange={(v) => void db.planExercises.update(it.id, { sets: v })} />
                <Stepper label="Reps" value={it.reps} step={1} min={1} onChange={(v) => void db.planExercises.update(it.id, { reps: v })} />
              </div>
            ) : (
              <div className="steppers three">
                <Stepper label="Séries" value={it.sets} step={1} min={1} onChange={(v) => void db.planExercises.update(it.id, { sets: v })} />
                <Stepper label="Reps" value={it.reps} step={1} min={1} onChange={(v) => void db.planExercises.update(it.id, { reps: v })} />
                <Stepper label="kg" value={it.weight} step={1} min={0} onChange={(v) => void db.planExercises.update(it.id, { weight: v })} />
              </div>
            )}
            <input
              className="note-input"
              placeholder="Observação (opcional)…"
              defaultValue={it.note ?? ''}
              aria-label="Observação"
              onBlur={(e) => void db.planExercises.update(it.id, { note: e.target.value.trim() || undefined })}
            />
          </section>
        )
      })}

      <button type="button" className="hero-btn secondary" onClick={() => setPicking(true)}>
        <Icon name="plus" size={26} strokeWidth={2.6} />
        <span>Adicionar exercício</span>
      </button>

      <button type="button" className="btn danger full" onClick={() => void removePlan()}>Apagar ficha</button>

      {picking && (
        <Sheet title={muscle ? muscle : 'Adicionar exercício'} onClose={closePicker}>
          {!muscle && (
            <input
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar entre 302 exercícios…"
              aria-label="Buscar exercício"
              autoComplete="off"
            />
          )}
          {q ? (
            <div className="option-grid">
              {found.map((e) => (
                <button key={e.id} type="button" className="option" onClick={() => void addExercise(e)}>
                  <ExerciseThumb name={e.name} muscle={e.muscle} slug={e.slug} size={72} />
                  <span>{e.name}</span>
                </button>
              ))}
              {found.length === 0 && <p className="muted">Nenhum exercício com esse nome.</p>}
            </div>
          ) : !muscle ? (
            <div className="option-grid">
              {MUSCLES.filter((m) => exercises.some((e) => e.muscle === m)).map((m) => (
                <button key={m} type="button" className="option" onClick={() => setMuscle(m)}>
                  <IconBadge name={MUSCLE_ICONS[m]} size={48} />
                  <span>{m}</span>
                  <small className="muted">{exercises.filter((e) => e.muscle === m).length} exercícios</small>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="option-grid">
                {exercises.filter((e) => e.muscle === muscle).map((e) => (
                  <button key={e.id} type="button" className="option" onClick={() => void addExercise(e)}>
                    <ExerciseThumb name={e.name} muscle={e.muscle} slug={e.slug} size={72} />
                    <span>{e.name}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="link" onClick={() => setMuscle(null)}>← Outros grupos</button>
            </>
          )}
        </Sheet>
      )}
    </Page>
  )
}

/** Editor dos blocos do cardio: tempo e velocidade/inclinação (esteira) ou nível (bike, elíptico...). */
export function BlocksEditor({ blocks, metric, onChange }: { blocks: CardioBlock[]; metric?: string; onChange: (b: CardioBlock[]) => void }) {
  const speed = metric === 'speed'
  const set = (i: number, patch: Partial<CardioBlock>) => onChange(blocks.map((b, k) => (k === i ? { ...b, ...patch } : b)))
  const total = blocks.reduce((s, b) => s + b.min, 0)
  const interval: CardioBlock[] = speed
    ? [{ min: 5, speed: 5, incline: 0 }, { min: 5, speed: 10, incline: 0 }, { min: 5, speed: 5, incline: 0 }, { min: 5, speed: 10, incline: 0 }]
    : [{ min: 5, level: 4 }, { min: 5, level: 10 }, { min: 5, level: 4 }, { min: 5, level: 10 }]

  return (
    <div className="blocks">
      <p className="muted small">
        {blocks.length === 1 ? 'Ritmo único' : `${blocks.length} blocos (intervalado)`} · total {total} min
      </p>
      {blocks.map((b, i) => (
        <div key={i} className="block-row">
          <span className="block-n">{i + 1}</span>
          <div className={`steppers ${speed ? 'three' : ''}`}>
            <Stepper label="Min" value={b.min} step={1} min={1} onChange={(v) => set(i, { min: v })} />
            {speed ? (
              <>
                <Stepper label="Vel. km/h" value={b.speed ?? 6} step={0.5} min={1} onChange={(v) => set(i, { speed: v })} />
                <Stepper label="Incl. %" value={b.incline ?? 0} step={1} min={0} onChange={(v) => set(i, { incline: v })} />
              </>
            ) : (
              <Stepper label="Nível" value={b.level ?? 5} step={1} min={1} onChange={(v) => set(i, { level: Math.min(20, v) })} />
            )}
          </div>
          {blocks.length > 1 && (
            <button type="button" className="icon-btn" aria-label={`Tirar o bloco ${i + 1}`} onClick={() => onChange(blocks.filter((_, k) => k !== i))}>
              ×
            </button>
          )}
        </div>
      ))}
      <div className="quiz-alt">
        <button type="button" className="btn ghost" onClick={() => onChange([...blocks, { ...blocks[blocks.length - 1] }])}>+ Bloco</button>
        <button type="button" className="btn ghost" onClick={() => onChange(interval)}>Intervalado</button>
      </div>
    </div>
  )
}
