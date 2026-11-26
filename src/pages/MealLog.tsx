import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FoodIcon, PixelIcon } from '../Icon'
import { Loading } from '../components'
import { db, formatDate, MEAL_ICONS, MEAL_TYPES, today, type DietItem, type LoggedFood, type MealStatus, type MealType } from '../db'
import Mascot from '../Mascot'
import { FoodPicker } from '../FoodPicker'
import { findFood, fmtQty, pluralUnit } from '../foodCatalog'
import { usePrefs } from '../hooks'
import { sfx } from '../sfx'

const LETTERS = ['A', 'B', 'C', 'D']
const MAIN = 4 // quantos itens aparecem em botões grandes; o resto vai para "Mais opções"

const FEMININE = new Set(['proteína', 'salada', 'bebida', 'fruta', 'verdura', 'sobremesa', 'gordura'])

function groupTitle(g: string): string {
  const lower = g.toLowerCase()
  if (lower === 'leve') return 'Escolha algo leve'
  if (lower === 'outros') return 'Algo mais?'
  return `Escolha ${FEMININE.has(lower) ? 'uma' : 'um'} ${lower}`
}

/** Calorias por unidade e unidade de medida (do item ou do catálogo). */
const kcalOf = (it: DietItem) => it.kcal ?? findFood(it.name)?.[4]
const unitOf = (it: DietItem) => it.unit ?? findFood(it.name)?.[3] ?? 'porção'

/**
 * Registro de refeição em etapas, estilo jogo: uma etapa por grupo
 * (carboidrato → proteína → bebida...). Toque para marcar; pode marcar mais de um.
 * Nas interfaces detalhada/completa aparece a quantidade embaixo de cada comida marcada.
 */
export default function MealLog() {
  const { meal } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const mealType = (MEAL_TYPES as readonly string[]).includes(meal ?? '') ? (meal as MealType) : 'Almoço'
  const date = params.get('data') ?? today()
  const prep = mealType === 'Ceia' ? 'na' : 'no'

  const [step, setStep] = useState(0)
  // id do item → quantidade (na interface simples fica 1).
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [more, setMore] = useState(false)
  const [adding, setAdding] = useState(false)
  const [celebrate, setCelebrate] = useState<null | MealStatus>(null)
  const prefs = usePrefs()

  const items = useLiveQuery(() => db.dietItems.where('mealType').equals(mealType).sortBy('order'), [mealType])
  const logs = useLiveQuery(() => db.mealLogs.where('[date+mealType]').equals([date, mealType]).sortBy('time'), [date, mealType])
  // Lanche pode ter mais de um por dia (meta nas configurações); as outras refeições, um só.
  const slots = mealType === 'Lanche' ? (prefs?.snacks ?? 1) : 1
  const existing = logs && logs.length >= slots ? logs[logs.length - 1] : undefined

  useEffect(() => {
    window.scrollTo(0, 0)
    setMore(false)
  }, [step])

  async function save(status: MealStatus, label: string, icon: string, extra?: { items?: LoggedFood[]; kcal?: number }) {
    const data = { date, mealType, status, label, icon, time: Date.now(), items: extra?.items, kcal: extra?.kcal }
    if (existing) await db.mealLogs.update(existing.id, data)
    else await db.mealLogs.add(data)
    const good = status === 'option' || status === 'built'
    if (good && slots > 1 && !existing && (logs?.length ?? 0) + 1 === slots) sfx.goal()
    else if (good) sfx.meal()
    else sfx.soft()
    setCelebrate(status)
    setTimeout(() => navigate(-1), good ? 1300 : 800)
  }

  if (celebrate) {
    const good = celebrate === 'option' || celebrate === 'built'
    return (
      <div className="page fullscreen center celebrate">
        <Mascot mood={good ? 'great' : 'ok'} size={170} activity={good ? 'flex' : 'look'} />
        <h1>{good ? 'Boa! Na dieta ✓' : celebrate === 'other' ? 'Anotado!' : 'Tudo bem, próxima refeição!'}</h1>
      </div>
    )
  }

  if (!items || !logs || !prefs) return <Loading />
  const detailed = prefs.mode !== 'simples'
  const showKcal = prefs.mode === 'completa'

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
        <p className="muted">Nenhuma comida cadastrada {prep} {mealType.toLowerCase()}.</p>
        <button type="button" className="btn primary" onClick={() => setAdding(true)}>Escolher comidas</button>
        <button type="button" className="link" onClick={close}>Voltar</button>
        {adding && <FoodPicker meal={mealType} group="Carboidrato" existing={items} onClose={() => setAdding(false)} />}
      </div>
    )
  }

  const group = groups[Math.min(step, groups.length - 1)]
  const groupItems = items.filter((i) => i.group === group)
  const main = groupItems.slice(0, MAIN)
  const rest = groupItems.slice(MAIN)
  const isLast = step >= groups.length - 1
  const isOn = (id: number) => picked[id] !== undefined
  const pickedHere = groupItems.filter((i) => isOn(i.id)).length
  const chosen = items.filter((i) => isOn(i.id))
  const totalKcal = Math.round(chosen.reduce((s, i) => s + (kcalOf(i) ?? 0) * picked[i.id], 0))

  const toggle = (id: number) => {
    sfx.tap()
    setPicked((p) => {
      const n = { ...p }
      if (n[id] !== undefined) delete n[id]
      else n[id] = 1
      return n
    })
  }
  const setQty = (id: number, q: number) => setPicked((p) => ({ ...p, [id]: Math.max(0.5, q) }))

  /** − 2 fatias + (embaixo da comida escolhida). */
  const qtyRow = (it: DietItem) => {
    const q = picked[it.id]
    const k = kcalOf(it)
    return (
      <div className="qty-row">
        <button type="button" className="step-btn" aria-label={`Menos ${it.name}`} onClick={() => setQty(it.id, q > 1 ? q - 1 : 0.5)}>−</button>
        <span className="qty-val">
          {fmtQty(q)} {pluralUnit(unitOf(it), q)}
          {showKcal && k !== undefined && <small>~{Math.round(k * q)} kcal</small>}
        </span>
        <button type="button" className="step-btn" aria-label={`Mais ${it.name}`} onClick={() => setQty(it.id, q < 1 ? 1 : q + 1)}>+</button>
      </div>
    )
  }

  function next() {
    if (!isLast) {
      setStep((s) => s + 1)
      return
    }
    if (chosen.length === 0) return
    const logged: LoggedFood[] = chosen.map((i) => {
      const k = kcalOf(i)
      const q = picked[i.id]
      return detailed
        ? { name: i.name, icon: i.icon, qty: q, unit: unitOf(i), kcal: k !== undefined ? Math.round(k * q) : undefined }
        : { name: i.name, icon: i.icon }
    })
    const label = detailed
      ? logged.map((l) => `${fmtQty(l.qty!)} ${pluralUnit(l.unit!, l.qty!)} de ${l.name.toLowerCase()}`).join(', ')
      : chosen.map((i) => i.name).join(', ')
    void save('built', label, chosen[0].icon, { items: logged, kcal: detailed ? totalKcal : undefined })
  }

  const totalPicked = chosen.length
  const nextLabel = isLast
    ? totalPicked
      ? `Registrar (${totalPicked})${showKcal && totalKcal ? ` · ~${totalKcal} kcal` : ''}`
      : 'Escolha pelo menos um'
    : pickedHere
      ? 'Continuar'
      : 'Pular'
  const slotLabel = slots > 1 ? ` · ${Math.min(logs.length + 1, slots)}º de ${slots}` : ''

  return (
    <div className="page fullscreen quiz">
      {header(step === 0 ? close : () => setStep((s) => s - 1), `Etapa ${step + 1} de ${groups.length}`, (step + 1) / groups.length)}

      <div className="quiz-q">
        <span className="muted small">
          <FoodIcon value={MEAL_ICONS[mealType]} size={16} /> {mealType}
          {slotLabel}
        </span>
        <h1>{groupTitle(group)}</h1>
        <p className="muted small">Pode marcar mais de um.</p>
      </div>

      {step === 0 &&
        logs.map((l, i) => (
          <div key={l.id} className="logged-strip">
            <span>
              {slots > 1 ? `${i + 1}º lanche` : 'Já registrado'}: <b>{l.label}</b>
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label="Apagar este registro"
              onClick={() => confirm(`Apagar o registro (${l.label})?`) && void db.mealLogs.delete(l.id)}
            >
              <PixelIcon name="trash" size={20} />
            </button>
          </div>
        ))}

      <div className="quiz-options">
        {main.map((it, i) => {
          const on = isOn(it.id)
          const k = kcalOf(it)
          return (
            <div key={it.id} className="quiz-cell">
              <button type="button" aria-pressed={on} className={`quiz-option${on ? ' selected' : ''}`} onClick={() => toggle(it.id)}>
                <span className="quiz-letter">{on ? '✓' : LETTERS[i]}</span>
                <FoodIcon value={it.icon} size={46} />
                <span>{it.name}</span>
                {showKcal && !on && k !== undefined && <small className="muted kcal-hint">~{k} kcal</small>}
              </button>
              {detailed && on && qtyRow(it)}
            </div>
          )
        })}
        <button type="button" className="quiz-option add-food" onClick={() => setAdding(true)}>
          <PixelIcon name="plus" size={28} />
          <span>Adicionar</span>
        </button>
      </div>

      {rest.length > 0 && (
        <div className="more-options">
          <button type="button" className="link" aria-expanded={more} onClick={() => setMore((m) => !m)}>
            {more ? 'Menos opções' : `Mais opções (${rest.length})`}
            {!more && rest.some((r) => isOn(r.id)) && ' ✓'}
          </button>
          {more && (
            <ul className="check-list">
              {rest.map((it) => {
                const on = isOn(it.id)
                return (
                  <li key={it.id}>
                    <button type="button" aria-pressed={on} className={`check-row${on ? ' on' : ''}`} onClick={() => toggle(it.id)}>
                      <span className="check-box">{on ? '✓' : ''}</span>
                      <FoodIcon value={it.icon} size={24} />
                      <span>{it.name}</span>
                    </button>
                    {detailed && on && qtyRow(it)}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {adding && (
        <FoodPicker
          meal={mealType}
          group={group}
          existing={items}
          onAdded={(id) => setPicked((p) => ({ ...p, [id]: 1 }))}
          onClose={() => setAdding(false)}
        />
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
