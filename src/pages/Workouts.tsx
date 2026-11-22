import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, IconBadge } from '../Icon'
import { Page } from '../components'
import { db, formatDate, formatDuration } from '../db'
import { useActiveSession } from '../hooks'

export default function Workouts() {
  const active = useActiveSession()
  const [showHistory, setShowHistory] = useState(false)

  const plans = useLiveQuery(async () => {
    const ps = await db.plans.orderBy('order').toArray()
    return Promise.all(ps.map(async (p) => ({ ...p, count: await db.planExercises.where('planId').equals(p.id).count() })))
  }, [])

  const history = useLiveQuery(async () => {
    const ws = await db.workouts.orderBy('date').reverse().limit(30).toArray()
    return Promise.all(ws.map(async (w) => ({ ...w, sets: await db.sets.where('workoutId').equals(w.id).count() })))
  }, [])

  return (
    <Page title="Treinos" action={<Link to="/exercicios" className="link">Exercícios</Link>}>
      <Link to="/treinar" className="hero-btn">
        <Icon name="play" size={30} strokeWidth={2.6} />
        <span>{active ? 'Continuar treino' : 'Iniciar treino'}</span>
      </Link>

      <h2 className="section-title">Minhas fichas</h2>
      <div className="tile-grid">
        {plans?.map((p) => (
          <Link key={p.id} to={`/fichas/${p.id}`} className="tile">
            <IconBadge name="clipboard-list" size={48} tone="train" />
            <strong>{p.name}</strong>
            <span className="muted small">{p.count} exercícios · editar</span>
          </Link>
        ))}
        <Link to="/fichas/nova" className="tile tile-add">
          <Icon name="plus" size={30} strokeWidth={2.4} />
          <strong>Nova ficha</strong>
        </Link>
      </div>

      <button type="button" className="link details-toggle" onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory}>
        {showHistory ? 'Ocultar histórico' : 'Ver histórico'}
      </button>
      {showHistory && (
        <ul className="list card">
          {history?.length === 0 && <li className="muted">Nenhum treino ainda.</li>}
          {history?.map((w) => (
            <li key={w.id}>
              <Link to={`/treinos/${w.id}`} className="row-link">
                <span>
                  {w.name}
                  <span className="muted small block">{formatDate(w.date)}</span>
                </span>
                <span className="muted small right">
                  {w.sets} séries
                  {w.startedAt && w.endedAt && <span className="block">{formatDuration(w.endedAt - w.startedAt)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
