import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FoodIcon, PixelIcon } from '../Icon'
import { Loading } from '../components'
import { db, formatDate, MEAL_ICONS, MEAL_TYPES, today, type MealStatus, type MealType } from '../db'
import Mascot from '../Mascot'

const LETTERS = ['A', 'B', 'C', 'D']
const MAIN = 4 // quantos itens aparecem em botões grandes; o resto vai para "Mais opções"

const FEMININE = new Set(['proteína', 'salada', 'bebida', 'fruta', 'verdura', 'sobremesa', 'gordura'])

function groupTitle(g: string): string {
  const lower = g.toLowerCase()
  if (lower === 'leve') return 'Escolha algo leve'
  return `Escolha ${FEMININE.has(lower) ? 'uma' : 'um'} ${lower}`
}

/**
 * Registro de refeição em etapas, estilo jogo: uma etapa por grupo
 * (carboidrato → proteína → bebida...). Toque para marcar; pode marcar mais de um.
 */
export default function MealLog() {
  const { meal } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const mealType = (MEAL_TYPES as readonly string[]).includes(meal ?? '') ? (meal as MealType) : 'Almoço'
  const date = params.get('data') ?? today()
  const prep = mealType === 'Ceia' ? 'na' : 'no'

  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<number[]>([])
  const [more, setMore] = useState(false)
  const [celebrate, setCelebrate] = useState<null | MealStatus>(null)

  const items = useLiveQuery(() => db.dietItems.where('mealType').equals(mealType).sortBy('order'), [mealType])
  const existing = useLiveQuery(() => db.mealLogs.where('[date+mealType]').equals([date, mealType]).first(), [date, mealType])

  useEffect(() => {
    window.scrollTo(0, 0)
    setMore(false)
  }, [step])

  async function save(status: MealStatus, label: string, icon: string, optionId?: number) {
    const data = { date, mealType, status, label, icon, optionId, time: Date.now() }
    if (existing) await db.mealLogs.update(existing.id, data)
    else await db.mealLogs.add(data)
    setCelebrate(status)
    setTimeout(() => navigate(-1), status === 'option' || status === 'built' ? 1300 : 800)
  }

  if (celebrate) {
    const good = celebrate === 'option' || celebrate === 'built'
    return (
      <div className="page fullscreen center celebrate">
        <Mascot mood={good ? 'great' : 'ok'} size={170} />
        <h1>{good ? 'Boa! Na dieta ✓' : celebrate === 'other' ? 'Anotado!' : 'Tudo bem, próxima refeição!'}</h1>
      </div>
    )
  }

  if (!items) return <Loading />

  const close = () => navigate(-1)
  const header = (onBack: () => void, label: string, progress?: number) => (
    <header className="quiz-head">
      <button type="button" className="icon-btn" aria-label={step === 0 ? 'Fechar' : 'Voltar'} onClick={onBack}>
        {step === 0 ? '×' : '‹'}
      </button>
      {progress !== undefined ? (
        <div className="quiz-progress" aria-label={label}>
          <div style={{ width: `${progress * 100}%` }} />
        </div>
      ) : (
        <span className="muted small">{label}</span>
      )}
      <span className="muted small">{date === today() ? 'Hoje' : formatDate(date)}</span>
    </header>
  )

  /* ---------- Etapas por grupo */
  const groups = [...new Set(items.map((i) => i.group))]
  if (groups.length === 0) {
    return (
      <div className="page fullscreen center">
        <p className="muted">Nenhum ingrediente cadastrado {prep} {mealType.toLowerCase()}.</p>
        <Link to="/dieta/editar" className="btn primary">Cadastrar ingredientes</Link>
        <button type="button" className="link" onClick={close}>Voltar</button>
      </div>
    )
  }

  const group = groups[Math.min(step, groups.length - 1)]
  const groupItems = items.filter((i) => i.group === group)
  const main = groupItems.slice(0, MAIN)
  const rest = groupItems.slice(MAIN)
  const isLast = step >= groups.length - 1
  const pickedHere = groupItems.filter((i) => picked.includes(i.id)).length
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  function next() {
    if (!isLast) {
      setStep((s) => s + 1)
      return
    }
    const chosen = items!.filter((i) => picked.includes(i.id))
    if (chosen.length === 0) return
    void save('built', chosen.map((i) => i.name).join(', '), chosen[0].icon)
  }

  const totalPicked = picked.length
  const nextLabel = isLast ? (totalPicked ? `Registrar (${totalPicked})` : 'Escolha pelo menos um') : pickedHere ? 'Continuar' : 'Pular'

  return (
    <div className="page fullscreen quiz">
      {header(step === 0 ? close : () => setStep((s) => s - 1), `Etapa ${step + 1} de ${groups.length}`, (step + 1) / groups.length)}

      <div className="quiz-q">
        <span className="muted small">
          <FoodIcon value={MEAL_ICONS[mealType]} size={16} /> {mealType}
        </span>
        <h1>{groupTitle(group)}</h1>
        <p className="muted small">Pode marcar mais de um.</p>
      </div>

      {existing && step === 0 && (
        <div className="logged-strip">
          <span>
            Já registrado: <b>{existing.label}</b>
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Apagar o registro atual"
            onClick={() => confirm(`Apagar o registro (${existing.label})?`) && void db.mealLogs.delete(existing.id).then(close)}
          >
            <PixelIcon name="trash" size={20} />
          </button>
        </div>
      )}

      <div className="quiz-options">
        {main.map((it, i) => {
          const on = picked.includes(it.id)
          return (
            <button key={it.id} type="button" aria-pressed={on} className={`quiz-option${on ? ' selected' : ''}`} onClick={() => toggle(it.id)}>
              <span className="quiz-letter">{on ? '✓' : LETTERS[i]}</span>
              <FoodIcon value={it.icon} size={46} />
              <span>{it.name}</span>
            </button>
          )
        })}
      </div>

      {rest.length > 0 && (
        <div className="more-options">
          <button type="button" className="link" aria-expanded={more} onClick={() => setMore((m) => !m)}>
            {more ? 'Menos opções' : `Mais opções (${rest.length})`}
            {!more && rest.some((r) => picked.includes(r.id)) && ' ✓'}
          </button>
          {more && (
            <ul className="check-list">
              {rest.map((it) => {
                const on = picked.includes(it.id)
                return (
                  <li key={it.id}>
                    <button type="button" aria-pressed={on} className={`check-row${on ? ' on' : ''}`} onClick={() => toggle(it.id)}>
                      <span className="check-box">{on ? '✓' : ''}</span>
                      <FoodIcon value={it.icon} size={24} />
                      <span>{it.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <div className="build-foot">
        <button type="button" className="btn primary huge full" disabled={isLast && totalPicked === 0} onClick={next}>
          {nextLabel}
        </button>
        {step === 0 && (
          <div className="quiz-alt">
            <button type="button" className="btn ghost" onClick={() => void save('other', 'Fora da dieta', '🍽️')}>
              Comi fora da dieta
            </button>
            <button type="button" className="btn ghost" onClick={() => void save('skipped', 'Pulei', '⏭️')}>
              Pulei
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
