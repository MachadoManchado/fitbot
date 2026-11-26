import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card, Empty, Page, numOrUndef } from '../components'
import { db, formatDate, formatDuration, type Exercise, type WorkoutSet, describeSet } from '../db'

export default function WorkoutDetail() {
  const { id } = useParams()
  const workoutId = Number(id)
  const navigate = useNavigate()
  const [pickId, setPickId] = useState('')
  const [extra, setExtra] = useState<number[]>([])

  const workout = useLiveQuery(() => db.workouts.get(workoutId), [workoutId])
  const sets = useLiveQuery(() => db.sets.where('workoutId').equals(workoutId).sortBy('createdAt'), [workoutId])
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  if (workout === undefined || !sets || !exercises) return <Page title="Treino"><Empty>Carregando…</Empty></Page>

  const exMap = new Map(exercises.map((e) => [e.id, e]))
  const order: number[] = []
  for (const s of sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId)
  for (const e of extra) if (!order.includes(e)) order.push(e)

  async function remove() {
    if (!confirm('Apagar este treino e todas as séries?')) return
    await db.sets.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
    navigate('/treinos')
  }

  return (
    <Page title={workout.name} action={<Link to="/treinos" className="link">Voltar</Link>}>
      <div className="workout-meta">
        <input
          type="date"
          value={workout.date}
          aria-label="Data do treino"
          onChange={(e) => e.target.value && void db.workouts.update(workoutId, { date: e.target.value })}
        />
        <span className="muted small">
          {formatDate(workout.date)}
          {workout.startedAt && workout.endedAt && (
            <span className="block">
              {new Date(workout.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}–
              {new Date(workout.endedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {formatDuration(workout.endedAt - workout.startedAt)}
            </span>
          )}
        </span>
      </div>

      {order.length === 0 && <Empty>Adicione o primeiro exercício abaixo.</Empty>}

      {order.map((exId) => {
        const ex = exMap.get(exId)
        if (!ex) return null
        return <ExerciseBlock key={exId} exercise={ex} workoutId={workoutId} workoutDate={workout.date} sets={sets.filter((s) => s.exerciseId === exId)} />
      })}

      <Card title="Adicionar exercício">
        <div className="inline-form">
          <select value={pickId} onChange={(e) => setPickId(e.target.value)} aria-label="Exercício">
            <option value="">Escolha…</option>
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.muscle})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn primary"
            disabled={!pickId}
            onClick={() => {
              setExtra((x) => [...x, Number(pickId)])
              setPickId('')
            }}
          >
            Adicionar
          </button>
        </div>
        <Link to="/exercicios" className="link small">Criar exercício novo</Link>
      </Card>

      <textarea
        className="notes"
        placeholder="Anotações do treino…"
        defaultValue={workout.notes ?? ''}
        onBlur={(e) => void db.workouts.update(workoutId, { notes: e.target.value })}
        aria-label="Anotações"
      />

      <button type="button" className="btn danger full" onClick={() => void remove()}>
        Apagar treino
      </button>
    </Page>
  )
}

function ExerciseBlock({ exercise, workoutId, workoutDate, sets }: { exercise: Exercise; workoutId: number; workoutDate: string; sets: WorkoutSet[] }) {
  const last = sets[sets.length - 1]
  const [reps, setReps] = useState(last ? String(last.reps) : '')
  const [weight, setWeight] = useState(last ? String(last.weight) : '')

  const previous = useLiveQuery(async () => {
    const all = await db.sets.where('exerciseId').equals(exercise.id).toArray()
    const otherIds = [...new Set(all.filter((s) => s.workoutId !== workoutId).map((s) => s.workoutId))]
    const ws = (await db.workouts.bulkGet(otherIds)).filter((w) => w && w.date <= workoutDate)
    ws.sort((a, b) => (a!.date < b!.date ? 1 : -1))
    const prev = ws[0]
    if (!prev) return null
    return { date: prev.date, sets: all.filter((s) => s.workoutId === prev.id).sort((a, b) => a.createdAt - b.createdAt) }
  }, [exercise.id, workoutId, workoutDate])

  async function addSet() {
    const r = numOrUndef(reps)
    const w = numOrUndef(weight) ?? 0
    if (!r || r <= 0) return
    await db.sets.add({ workoutId, exerciseId: exercise.id, reps: r, weight: w, createdAt: Date.now() })
  }

  return (
    <Card title={exercise.name}>
      {previous && (
        <p className="muted small">
          Última vez ({formatDate(previous.date)}): {previous.sets.map((s) => describeSet(s)).join(' · ')}
        </p>
      )}
      {sets.length > 0 && (
        <table className="sets">
          <thead>
            <tr>
              <th>Série</th>
              <th colSpan={2}>Feito</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {sets.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td colSpan={2}>{describeSet(s)}</td>
                <td>
                  <button type="button" className="icon-btn" aria-label="Apagar série" onClick={() => confirm('Apagar esta série?') && void db.sets.delete(s.id)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form
        className="set-form"
        onSubmit={(e) => {
          e.preventDefault()
          void addSet()
        }}
      >
        <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="Reps" aria-label="Repetições" />
        <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg" aria-label="Carga em kg" />
        <button type="submit" className="btn primary">+ Série</button>
      </form>
    </Card>
  )
}
