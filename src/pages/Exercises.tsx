import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Page } from '../components'
import { db } from '../db'

const MUSCLES = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Cardio', 'Outro']

export default function Exercises() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState(MUSCLES[0])
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  async function add() {
    if (!name.trim()) return
    await db.exercises.add({ name: name.trim(), muscle })
    setName('')
  }

  async function remove(id: number) {
    const used = await db.sets.where('exerciseId').equals(id).count()
    if (used > 0) {
      alert(`Este exercício tem ${used} série(s) registrada(s) e não pode ser apagado.`)
      return
    }
    await db.exercises.delete(id)
  }

  const groups = MUSCLES.map((m) => ({ m, items: (exercises ?? []).filter((e) => e.muscle === m) })).filter((g) => g.items.length)

  return (
    <Page title="Exercícios" action={<button type="button" className="link" onClick={() => navigate(-1)}>Voltar</button>}>
      <Card title="Novo exercício">
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Supino reto…" autoComplete="off" aria-label="Nome do exercício" />
          <select value={muscle} onChange={(e) => setMuscle(e.target.value)} aria-label="Grupo muscular">
            {MUSCLES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <button type="submit" className="btn primary">Salvar</button>
        </form>
      </Card>
      {groups.map((g) => (
        <Card key={g.m} title={g.m}>
          <ul className="list">
            {g.items.map((e) => (
              <li key={e.id} className="row">
                <span>{e.name}</span>
                <button type="button" className="icon-btn" aria-label={`Apagar ${e.name}`} onClick={() => void remove(e.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </Page>
  )
}
