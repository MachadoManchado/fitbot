import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FoodIcon } from '../Icon'
import WaterCard from '../WaterCard'
import { DatePicker, Page, Loading } from '../components'
import { usePrefs } from '../hooks'
import { db, MEAL_ICONS, MEAL_TYPES, ON_DIET, today } from '../db'

export default function Diet() {
  const [date, setDate] = useState(today())
  const logs = useLiveQuery(() => db.mealLogs.where('date').equals(date).toArray(), [date])
  const treats = useLiveQuery(() => db.treats.where('date').equals(date).toArray(), [date])
  const prefs = usePrefs()
  if (!logs || !treats || !prefs) return <Loading />

  const followed = logs.filter((l) => ON_DIET.includes(l.status)).length
  const q = date !== today() ? `?data=${date}` : ''
  // Ceia é opcional: não entra na conta do dia.
  const expected = 3 + prefs.snacks
  const kcal = logs.reduce((s, l) => s + (l.kcal ?? 0), 0)
  const ceia = logs.find((l) => l.mealType === 'Ceia')

  function tile(type: (typeof MEAL_TYPES)[number]) {
    const mine = logs!.filter((l) => l.mealType === type)
    const slots = type === 'Lanche' ? prefs!.snacks : 1
    const log = mine[mine.length - 1]
    const okCount = mine.filter((l) => ON_DIET.includes(l.status)).length
    const complete = mine.length >= slots
    const partial = mine.length > 0 && !complete
    // Lanche com 2+ por dia: o quadrado vai enchendo de verde (metade, um terço...).
    const fill = partial ? Math.round((mine.length / slots) * 100) : 0
    return (
      <Link
        key={type}
        to={`/refeicao/${encodeURIComponent(type)}${q}`}
        className={`meal-tile${complete && log ? ` logged ${log.status}` : ''}${partial ? ' partial' : ''}`}
        style={partial ? ({ '--fill': `${fill}%` } as React.CSSProperties) : undefined}
      >
        <FoodIcon value={log ? log.icon : MEAL_ICONS[type]} size={44} />
        <strong>{type}</strong>
        <span className="muted small clamp">
          {slots > 1 ? `${mine.length} de ${slots}${log ? ` · ${log.label}` : ''}` : log ? log.label : 'Registrar'}
        </span>
        {complete && okCount > 0 && <span className="check" aria-label="Na dieta">✓</span>}
      </Link>
    )
  }

  return (
    <Page title="Dieta" action={<Link to="/dieta/editar" className="link">Editar dieta</Link>}>
      <DatePicker value={date} onChange={setDate} />

      <p className="day-summary">
        {followed === 0 ? 'Toque numa refeição para registrar.' : `${followed} de ${expected} refeições na dieta`}
        {prefs.mode === 'completa' && kcal > 0 && <span className="block small">~{kcal} kcal registradas</span>}
      </p>

      <div className="meal-grid">{MEAL_TYPES.filter((t) => t !== 'Ceia').map(tile)}</div>

      <div className="extra-row">
        <Link to={`/refeicao/Ceia${q}`} className={`mini-tile${ceia ? ` logged ${ceia.status}` : ''}`}>
          <FoodIcon value={ceia ? ceia.icon : MEAL_ICONS.Ceia} size={30} />
          <span>
            <strong>Ceia</strong>
            <span className="muted small block clamp">{ceia ? ceia.label : 'Opcional'}</span>
          </span>
          {ceia && ON_DIET.includes(ceia.status) && <span className="check" aria-label="Na dieta">✓</span>}
        </Link>
        <Link to={`/besteira${q}`} className="mini-tile treat">
          <FoodIcon value="🍩" size={30} />
          <span>
            <strong>Besteira</strong>
            <span className="muted small block clamp">{treats.length === 0 ? 'Sem julgamento' : `${treats.length} hoje`}</span>
          </span>
        </Link>
      </div>

      <WaterCard date={date} />
    </Page>
  )
}
