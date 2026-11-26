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
    const n = Math.min(mine.length, slots)
    // Lanche com 2+ por dia: o verde entra na diagonal (1º lanche = metade de baixo/esquerda, 2º completa o quadrado).
    const slotted = slots > 1 && n > 0
    return (
      <Link
        key={type}
        to={`/refeicao/${encodeURIComponent(type)}${q}`}
        aria-label={slots > 1 ? `${type}: ${n} de ${slots}` : type}
        className={`meal-tile${slotted ? ' slotted' : complete && log ? ` logged ${log.status}` : ''}`}
      >
        {slotted && (
          <span
            className="tile-fill"
            aria-hidden="true"
            style={{ '--clip-from': diagonal((n - 1) / slots), '--clip-to': diagonal(n / slots) } as React.CSSProperties}
          />
        )}
        <FoodIcon value={log ? log.icon : MEAL_ICONS[type]} size={44} />
        <strong>{type}</strong>
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
        <Link to={`/refeicao/Ceia${q}`} aria-label="Ceia (opcional)" className={`mini-tile ceia${ceia ? ` logged ${ceia.status}` : ''}`}>
          <FoodIcon value={ceia ? ceia.icon : MEAL_ICONS.Ceia} size={30} />
          <strong>Ceia</strong>
          {ceia && ON_DIET.includes(ceia.status) && <span className="check" aria-label="Na dieta">✓</span>}
        </Link>
        <Link to={`/besteira${q}`} className="mini-tile treat" aria-label={`Registrar besteira (${treats.length} hoje)`}>
          <FoodIcon value="🍩" size={30} />
          <strong>Besteira</strong>
        </Link>
      </div>

      <WaterCard date={date} />
    </Page>
  )
}

/**
 * Recorte do quadrado preenchido até a fração f, cortado na diagonal a partir do canto de baixo à esquerda.
 * Sempre 5 pontos, para a animação poder passar de um estado ao outro.
 */
function diagonal(f: number): string {
  const s = Math.max(0, Math.min(2, f * 2))
  const p = (x: number, y: number) => `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`
  if (s <= 1) return `polygon(${p(0, 1 - s)}, ${p(0, 1 - s)}, ${p(s, 1)}, ${p(s, 1)}, ${p(0, 1)})`
  return `polygon(${p(0, 0)}, ${p(s - 1, 0)}, ${p(1, 2 - s)}, ${p(1, 1)}, ${p(0, 1)})`
}
