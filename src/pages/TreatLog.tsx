import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FoodIcon, PixelIcon } from '../Icon'
import { db, formatDate, today, TREATS } from '../db'
import Mascot from '../Mascot'
import { sfx } from '../sfx'

/** Registrar besteiras (fora das refeições), para avaliar depois. */
export default function TreatLog() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const date = params.get('data') ?? today()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [done, setDone] = useState(false)
  const todays = useLiveQuery(() => db.treats.where('date').equals(date).toArray(), [date])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  async function save() {
    const now = Date.now()
    const rows = TREATS.flatMap(([name, icon]) => Array.from({ length: counts[name] ?? 0 }, () => ({ date, name, icon, time: now })))
    if (rows.length) await db.treats.bulkAdd(rows)
    sfx.soft()
    setDone(true)
    setTimeout(() => navigate(-1), 1200)
  }

  if (done) {
    return (
      <div className="page fullscreen center celebrate">
        <Mascot mood="ok" size={160} />
        <h1>Anotado, sem culpa!</h1>
        <p className="muted">Registrar já ajuda a perceber o padrão.</p>
      </div>
    )
  }

  return (
    <div className="page fullscreen quiz">
      <header className="page-head">
        <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => navigate(-1)}>×</button>
        <span className="muted small">{date === today() ? 'Hoje' : formatDate(date)}</span>
      </header>

      <div className="quiz-q">
        <FoodIcon value="🍩" size={52} />
        <h1>Qual besteira rolou?</h1>
        <p className="muted small">Toque uma vez para cada vez que comeu.</p>
      </div>

      <div className="chip-grid three">
        {TREATS.map(([name, icon]) => {
          const n = counts[name] ?? 0
          return (
            <div key={name} className="treat-cell">
              <button
                type="button"
                className={`food-chip tall${n ? ' active' : ''}`}
                aria-label={n ? `${name}: ${n}. Tocar para somar mais um` : name}
                onClick={() => setCounts((c) => ({ ...c, [name]: n + 1 }))}
              >
                {n > 0 && <span className="count-badge" aria-hidden="true">{n}</span>}
                <FoodIcon value={icon} size={38} />
                <span>{name}</span>
              </button>
              {n > 0 && (
                <button type="button" className="minus-btn" aria-label={`Tirar um ${name}`} onClick={() => setCounts((c) => ({ ...c, [name]: n - 1 }))}>
                  −
                </button>
              )}
            </div>
          )
        })}
      </div>

      {todays && todays.length > 0 && (
        <div className="logged-strip">
          <span>
            Já registrado hoje: <b>{todays.map((t) => t.name.toLowerCase()).join(', ')}</b>
          </span>
          <button type="button" className="icon-btn" aria-label="Desfazer o último registro" onClick={() => void db.treats.delete(todays[todays.length - 1].id)}>
            <PixelIcon name="undo" size={20} />
          </button>
        </div>
      )}

      <div className="build-foot">
        <button type="button" className="btn primary huge full" disabled={total === 0} onClick={() => void save()}>
          {total === 0 ? 'Toque no que comeu' : `Registrar (${total})`}
        </button>
      </div>
    </div>
  )
}
