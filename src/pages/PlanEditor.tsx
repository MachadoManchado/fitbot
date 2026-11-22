import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon, IconBadge } from '../Icon'
import { ExerciseThumb } from '../ExerciseAnim'
import { Page, Sheet, Stepper, Loading } from '../components'
import { db, MUSCLE_ICONS, MUSCLES, type PlanExercise } from '../db'

export default function PlanEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'nova'
  const planId = isNew ? null : Number(id)
  const [picking, setPicking] = useState(false)
  const [muscle, setMuscle] = useState<string | null>(null)

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
  const exName = (eid: number) => exercises.find((e) => e.id === eid)?.name ?? '?'
  const exMuscle = (eid: number) => exercises.find((e) => e.id === eid)?.muscle ?? 'Outro'

  async function addExercise(exerciseId: number) {
    await db.planExercises.add({ planId: planId!, exerciseId, sets: 3, reps: 10, weight: 0, order: items!.length })
    setPicking(false)
    setMuscle(null)
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

  return (
    <Page title="Editar ficha" action={<button type="button" className="link" onClick={() => navigate(-1)}>Pronto</button>}>
      <input
        className="title-input"
        defaultValue={plan.name}
        key={plan.id}
        aria-label="Nome da ficha"
        onBlur={(e) => e.target.value.trim() && void db.plans.update(plan.id, { name: e.target.value.trim() })}
      />

      {items.map((it, i) => (
        <section key={it.id} className="card plan-item">
          <div className="card-head">
            <h2>
              <span className="inline-icon"><ExerciseThumb name={exName(it.exerciseId)} muscle={exMuscle(it.exerciseId)} size={44} /></span> {exName(it.exerciseId)}
            </h2>
            <div className="row-actions">
              <button type="button" className="icon-btn" aria-label="Subir" disabled={i === 0} onClick={() => void move(it, -1)}>↑</button>
              <button type="button" className="icon-btn" aria-label="Descer" disabled={i === items.length - 1} onClick={() => void move(it, 1)}>↓</button>
              <button type="button" className="icon-btn" aria-label="Remover" onClick={() => confirm(`Tirar ${exName(it.exerciseId)} da ficha?`) && void db.planExercises.delete(it.id)}>×</button>
            </div>
          </div>
          <div className="steppers three">
            <Stepper label="Séries" value={it.sets} step={1} min={1} onChange={(v) => void db.planExercises.update(it.id, { sets: v })} />
            <Stepper label="Reps" value={it.reps} step={1} min={1} onChange={(v) => void db.planExercises.update(it.id, { reps: v })} />
            <Stepper label="kg" value={it.weight} step={1} min={0} onChange={(v) => void db.planExercises.update(it.id, { weight: v })} />
          </div>
          <input
            className="note-input"
            placeholder="Observação (opcional)…"
            defaultValue={it.note ?? ''}
            aria-label="Observação"
            onBlur={(e) => void db.planExercises.update(it.id, { note: e.target.value.trim() || undefined })}
          />
        </section>
      ))}

      <button type="button" className="hero-btn secondary" onClick={() => setPicking(true)}>
        <Icon name="plus" size={26} strokeWidth={2.6} />
        <span>Adicionar exercício</span>
      </button>

      <button type="button" className="btn danger full" onClick={() => void removePlan()}>Apagar ficha</button>

      {picking && (
        <Sheet title={muscle ? muscle : 'Qual grupo muscular?'} onClose={() => { setPicking(false); setMuscle(null) }}>
          {!muscle ? (
            <div className="option-grid">
              {MUSCLES.filter((m) => exercises.some((e) => e.muscle === m)).map((m) => (
                <button key={m} type="button" className="option" onClick={() => setMuscle(m)}>
                  <IconBadge name={MUSCLE_ICONS[m]} size={48} />
                  <span>{m}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="option-grid">
                {exercises.filter((e) => e.muscle === muscle).map((e) => (
                  <button key={e.id} type="button" className="option" onClick={() => void addExercise(e.id)}>
                    <ExerciseThumb name={e.name} muscle={e.muscle} size={72} />
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
