import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PixelIcon } from '../Icon'
import { fmt, Loading, Toast } from '../components'
import { CUP_ML, db, formatDate, mealForNow, today, weekdayShort } from '../db'
import { useActiveSession, useGoals, usePrefs, useRecentDays, useWater, weekScore } from '../hooks'
import Mascot from '../Mascot'
import { botLines } from '../messages'
import { sfx } from '../sfx'

const MOOD_LABEL = { great: 'EM ALTA', good: 'BEM', ok: 'NO RITMO', sleepy: 'BATERIA BAIXA' } as const

/** Início no estilo de bichinho virtual: um aparelhinho com tela LCD e 3 botões. */
export default function Home() {
  const goals = useGoals()
  const days = useRecentDays(7)
  const active = useActiveSession()
  const water = useWater(today())
  const [details, setDetails] = useState(false)
  const [toast, setToast] = useState('')
  const [line, setLine] = useState(0)
  const prefs = usePrefs()

  // O robô troca de fala/atividade sozinho a cada 9 s.
  useEffect(() => {
    const t = setInterval(() => setLine((l) => l + 1), 9000)
    return () => clearInterval(t)
  }, [])
  const date = today()
  const nextMeal = mealForNow()

  const loggedNext = useLiveQuery(() => db.mealLogs.where('[date+mealType]').equals([date, nextMeal]).count(), [date, nextMeal])
  const lastBody = useLiveQuery(async () => (await db.body.orderBy('date').reverse().toArray()).find((b) => b.weight !== undefined), [])

  if (!days || !prefs) return <Loading />
  const s = weekScore(days, goals.workoutsPerWeek)
  const hearts = Math.round((s.score / 100) * 4)
  const todayStat = days[days.length - 1]
  const todayDiet = todayStat?.meals ?? 0
  const mealsExpected = 3 + prefs.snacks
  const lastTrained = days.map((d) => d.trained).lastIndexOf(true)
  const lastWater = water?.logs[water.logs.length - 1]

  const lines = botLines({
    hour: new Date().getHours(),
    mood: s.mood,
    trainedWeek: s.trained,
    goalWeek: goals.workoutsPerWeek,
    trainedToday: !!todayStat?.trained,
    activeWorkout: !!active,
    waterDrunk: water?.drunk ?? 0,
    waterGoal: water?.goal ?? 2000,
    lastWaterMin: lastWater ? (Date.now() - lastWater.time) / 60000 : null,
    mealsToday: todayDiet,
    mealsExpected,
    nextMeal,
    nextMealLogged: !!loggedNext,
    treatsToday: todayStat?.treats ?? 0,
    daysSinceWorkout: lastTrained === -1 ? 7 : days.length - 1 - lastTrained,
  })
  const current = lines[line % lines.length]

  function drink() {
    const before = water?.drunk ?? 0
    const goal = water?.goal ?? 2000
    void db.water.add({ date, ml: CUP_ML, time: Date.now() })
    if (before < goal && before + CUP_ML >= goal) {
      sfx.goal()
      setToast('Meta de água batida!')
    } else {
      sfx.water()
      setToast('+1 copo de água')
    }
    setLine(0)
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
          <Meter label="DIETA" value={todayDiet} max={mealsExpected} />
          <Meter label="ÁGUA" value={water ? water.drunk : 0} max={water ? water.goal : 2000} />
          <Meter label="BATERIA" value={s.score} max={100} />
        </div>

        <div className="panel screen">
          <span className="screen-hearts" aria-label={`Semana: ${hearts} de 4 corações`}>
            {Array.from({ length: 4 }, (_, i) => (
              <PixelIcon key={i} name="heart" size={14} className={i < hearts ? 'on' : 'off'} />
            ))}
          </span>
          <button
            type="button"
            className="bot-btn"
            aria-label="Tocar no robô"
            onClick={() => {
              sfx.tap()
              setLine((l) => l + 1)
            }}
          >
            <Mascot mood={s.mood} size={120} activity={current.activity} key={line % lines.length} />
          </button>
          <Link to="/guia" className="screen-talk" key={current.text}>
            {current.text} <span className="talk-more">›</span>
          </Link>
        </div>

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

      <section className="week" aria-label="Últimos 7 dias">
        <div className="week-grid">
          {days.map((d, i) => {
            const diet = d.meals >= mealsExpected ? 'full' : d.meals > 0 ? 'half' : ''
            return (
              <div key={d.date} className={`week-day${i === days.length - 1 ? ' today' : ''}`} title={formatDate(d.date)}>
                <span className="muted small">{weekdayShort(d.date)}</span>
                <span className={`wk wk-train${d.trained ? ' on' : ''}`} aria-label={d.trained ? 'treinou' : 'sem treino'}>
                  <PixelIcon name="dumbbell" size={16} />
                </span>
                <span className={`wk wk-diet ${diet}`} aria-label={`${d.meals} refeição(ões) na dieta`}>
                  <PixelIcon name="bowl" size={16} />
                </span>
              </div>
            )
          })}
        </div>
        <p className="week-legend muted small">
          <span><i className="lg lg-train" /> treinou</span>
          <span><i className="lg lg-diet" /> dieta do dia</span>
          <span><i className="lg lg-half" /> parte da dieta</span>
        </p>
      </section>

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
