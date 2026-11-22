import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FoodIcon } from '../Icon'
import WaterCard from '../WaterCard'
import { DatePicker, Page, Loading } from '../components'
import { db, MEAL_ICONS, MEAL_TYPES, ON_DIET, today } from '../db'

export default function Diet() {
  const [date, setDate] = useState(today())
  const logs = useLiveQuery(() => db.mealLogs.where('date').equals(date).toArray(), [date])
  const treats = useLiveQuery(() => db.treats.where('date').equals(date).toArray(), [date])
  if (!logs || !treats) return <Loading />

  const followed = logs.filter((l) => ON_DIET.includes(l.status)).length
  const q = date !== today() ? `?data=${date}` : ''

  return (
    <Page title="Dieta" action={<Link to="/dieta/editar" className="link">Editar dieta</Link>}>
      <DatePicker value={date} onChange={setDate} />

      <p className="day-summary">
        {followed === 0 ? 'Toque numa refeição para registrar.' : `${followed} de ${MEAL_TYPES.length} refeições na dieta`}
      </p>

      <div className="meal-grid">
        {MEAL_TYPES.map((type) => {
          const log = logs.find((l) => l.mealType === type)
          return (
            <Link key={type} to={`/refeicao/${encodeURIComponent(type)}${q}`} className={`meal-tile${log ? ` logged ${log.status}` : ''}`}>
              <FoodIcon value={log ? log.icon : MEAL_ICONS[type]} size={44} />
              <strong>{type}</strong>
              <span className="muted small clamp">{log ? log.label : 'Registrar'}</span>
              {log && ON_DIET.includes(log.status) && <span className="check" aria-label="Na dieta">✓</span>}
            </Link>
          )
        })}
      </div>

      <WaterCard date={date} />

      <Link to={`/besteira${q}`} className="treat-btn">
        <FoodIcon value="🍩" size={32} />
        <span>
          Registrar besteira
          <span className="muted small block">{treats.length === 0 ? 'Fora das refeições, sem julgamento' : `${treats.length} hoje: ${treats.map((t) => t.name.toLowerCase()).join(', ')}`}</span>
        </span>
      </Link>
    </Page>
  )
}
