import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PixelIcon } from '../Icon'
import { fmt, Loading, Toast } from '../components'
import { CUP_ML, db, formatDate, mealForNow, today, weekdayShort } from '../db'
import { useActiveSession, useGoals, useRecentDays, useWater, weekScore } from '../hooks'
import Mascot, { mascotMessage } from '../Mascot'

const MOOD_LABEL = { great: 'EM ALTA', good: 'BEM', ok: 'NO RITMO', sleepy: 'BATERIA BAIXA' } as const

/** Início no estilo de bichinho virtual: um aparelhinho com tela LCD e 3 botões. */
export default function Home() {
  const goals = useGoals()
  const days = useRecentDays(7)
  const active = useActiveSession()
  const water = useWater(today())
  const [details, setDetails] = useState(false)
  const [toast, setToast] = useState('')
  const date = today()
  const nextMeal = mealForNow()

  const loggedNext = useLiveQuery(() => db.mealLogs.where('[date+mealType]').equals([date, nextMeal]).count(), [date, nextMeal])
  const lastBody = useLiveQuery(async () => (await db.body.orderBy('date').reverse().toArray()).find((b) => b.weight !== undefined), [])

  if (!days) return <Loading />
  const s = weekScore(days, goals.workoutsPerWeek)
  const hearts = Math.round((s.score / 100) * 4)
  const todayDiet = days[days.length - 1]?.meals ?? 0

  function drink() {
    void db.water.add({ date, ml: CUP_ML, time: Date.now() })
    setToast('+1 copo de água')
    setTimeout(() => setToast(''), 1800)
  }

  return (
    <div className="page home">
      <header className="home-head">
        <span className="muted small">{formatDate(date)}</span>
        <Link to="/perfil" className="profile-btn" aria-label="Perfil (peso, medidas, metas e configurações)">
          <PixelIcon name="user" size={22} />
        </Link>
      </header>

      <section className="console" aria-label="Seu guia">
        <div className="console-head">
          <span className="console-led" aria-hidden="true" />
          <span className="console-name">FIT·BOT</span>
          <span className="console-mood">{MOOD_LABEL[s.mood]}</span>
        </div>

        <div className="panel meters" aria-label="Seus indicadores">
          <Meter label="TREINO" value={s.trained} max={goals.workoutsPerWeek} />
          <Meter label="DIETA" value={todayDiet} max={5} />
          <Meter label="ÁGUA" value={water ? water.drunk : 0} max={water ? water.goal : 2000} />
          <Meter label="HUMOR" value={s.score} max={100} />
        </div>

        <Link to="/guia" className="panel screen" aria-label="Abrir o guia">
          <span className="screen-hearts" aria-label={`Semana: ${hearts} de 4 corações`}>
            {Array.from({ length: 4 }, (_, i) => (
              <PixelIcon key={i} name="heart" size={14} className={i < hearts ? 'on' : 'off'} />
            ))}
          </span>
          <Mascot mood={s.mood} size={120} />
          <p className="screen-talk">{mascotMessage(s.mood, s.trained, goals.workoutsPerWeek)}</p>
        </Link>

        <div className="console-buttons">
          <Link to="/treinar" className="pad-btn">
            <PixelIcon name="dumbbell" size={24} />
            <span>{active ? 'CONTINUAR' : 'TREINAR'}</span>
          </Link>
          <Link to={`/refeicao/${encodeURIComponent(nextMeal)}`} className={`pad-btn${loggedNext ? ' done' : ''}`}>
            <PixelIcon name={loggedNext ? 'check' : 'bowl'} size={24} />
            <span>{loggedNext ? 'COMEU' : 'COMER'}</span>
          </Link>
          <button type="button" className="pad-btn" onClick={drink}>
            <PixelIcon name="drop" size={24} />
            <span>+ÁGUA</span>
          </button>
        </div>
      </section>

      <div className="week-dots" aria-label="Últimos 7 dias">
        {days.map((d) => (
          <div key={d.date} className="week-dot">
            <span className={`dot${d.trained ? ' trained' : ''}${d.meals > 0 ? ' ate' : ''}`} title={formatDate(d.date)}>
              {d.trained ? <PixelIcon name="fire" size={18} /> : d.meals > 0 ? <PixelIcon name="check" size={18} /> : null}
            </span>
            <span className="muted small">{weekdayShort(d.date)}</span>
          </div>
        ))}
      </div>

      <button type="button" className="link details-toggle" onClick={() => setDetails((d) => !d)} aria-expanded={details}>
        {details ? 'Ocultar detalhes' : 'Ver detalhes'}
      </button>

      {details && (
        <div className="details-grid">
          <div className="mini-stat">
            <strong>{s.trained}/{goals.workoutsPerWeek}</strong>
            <span className="muted small">treinos na semana</span>
          </div>
          <div className="mini-stat">
            <strong>{s.logged ? Math.round((s.followed / s.logged) * 100) : 0}%</strong>
            <span className="muted small">refeições na dieta</span>
          </div>
          <div className="mini-stat">
            <strong>{lastBody ? `${fmt(lastBody.weight)} kg` : '–'}</strong>
            <span className="muted small">último peso</span>
          </div>
          <div className="mini-stat">
            <strong>{water ? `${fmt(water.drunk / 1000, 2)}/${fmt(water.goal / 1000, 2)} L` : '–'}</strong>
            <span className="muted small">água hoje</span>
          </div>
          <div className="mini-stat">
            <strong>{s.score}</strong>
            <span className="muted small">nota da semana</span>
          </div>
        </div>
      )}
      {toast && <Toast>{toast}</Toast>}
    </div>
  )
}

/** Barra de status em segmentos (como nos aparelhinhos de bichinho virtual). */
function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const SEG = 8
  const on = Math.max(0, Math.min(SEG, Math.round((value / Math.max(1, max)) * SEG)))
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
      <span className="meter-label">{label}</span>
      <span className="meter-bar" aria-hidden="true">
        {Array.from({ length: SEG }, (_, i) => (
          <i key={i} className={i < on ? 'on' : ''} />
        ))}
      </span>
    </div>
  )
}
