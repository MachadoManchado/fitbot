import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FoodIcon, Icon, IconBadge } from '../Icon'
import { Page, Sheet } from '../components'
import { db, MEAL_ICONS, MEAL_TYPES, type DietItem, type DietOption, type MealType } from '../db'

// Comidas usam emojis coloridos (cores reais), por escolha do usuário.
const ICONS = ['🍳', '🥚', '🍞', '🥖', '🫓', '🥞', '🌽', '🥣', '🍚', '🫘', '🍝', '🍠', '🥔', '🥐', '🥪', '🌯', '🍗', '🥩', '🐟', '🧀', '🥛', '🥜', '🥤', '☕', '🧃', '🍵', '🥬', '🍅', '🥕', '🧅', '🥒', '🥦', '🥗', '🥑', '🍌', '🍎', '🍐', '🍓', '🍇', '🧡', '🍲', '🍛']
const GROUPS = ['Carboidrato', 'Proteína', 'Salada', 'Bebida', 'Fruta', 'Leve']

type Tab = 'options' | 'items'

export default function DietEditor() {
  const navigate = useNavigate()
  const [meal, setMeal] = useState<MealType>('Café da manhã')
  const [tab, setTab] = useState<Tab>('options')
  const [editingOption, setEditingOption] = useState<DietOption | 'new' | null>(null)
  const [editingItem, setEditingItem] = useState<DietItem | { group: string } | null>(null)
  const options = useLiveQuery(() => db.dietOptions.where('mealType').equals(meal).sortBy('order'), [meal])
  const items = useLiveQuery(() => db.dietItems.where('mealType').equals(meal).sortBy('order'), [meal])

  const groups = [...new Set([...(items ?? []).map((i) => i.group)])]

  return (
    <Page title="Editar dieta" action={<button type="button" className="link" onClick={() => navigate(-1)}>Pronto</button>}>
      <div className="chips scroll-x">
        {MEAL_TYPES.map((m) => (
          <button key={m} type="button" className={`chip${m === meal ? ' active' : ''}`} onClick={() => setMeal(m)}>
            <FoodIcon value={MEAL_ICONS[m]} size={16} /> {m}
          </button>
        ))}
      </div>

      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'options'} className={tab === 'options' ? 'active' : ''} onClick={() => setTab('options')}>
          Refeições prontas
        </button>
        <button type="button" role="tab" aria-selected={tab === 'items'} className={tab === 'items' ? 'active' : ''} onClick={() => setTab('items')}>
          Ingredientes
        </button>
      </div>

      {tab === 'options' ? (
        <>
          <p className="muted small">Atalhos para refeições completas (botão "Refeição pronta" no registro).</p>
          <div className="option-grid editor">
            {options?.map((o) => (
              <button key={o.id} type="button" className="option" onClick={() => setEditingOption(o)}>
                <FoodIcon value={o.icon} size={36} />
                <span>{o.name}</span>
              </button>
            ))}
            <button type="button" className="option add" onClick={() => setEditingOption('new')}>
              <IconBadge name="plus" size={52} tone="neutral" />
              <span>Nova opção</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted small">Os ingredientes de cada etapa do registro. Os 4 primeiros de cada grupo aparecem em botões grandes; o resto fica em "Mais opções".</p>
          {groups.map((g) => (
            <section key={g} className="build-group">
              <h2>{g}</h2>
              <div className="chip-grid">
                {items!.filter((i) => i.group === g).map((i) => (
                  <button key={i.id} type="button" className="food-chip" onClick={() => setEditingItem(i)}>
                    <FoodIcon value={i.icon} size={24} />
                    <span>{i.name}</span>
                  </button>
                ))}
                <button type="button" className="food-chip add" onClick={() => setEditingItem({ group: g })}><Icon name="plus" size={18} /> Item</button>
              </div>
            </section>
          ))}
          <div className="chips">
            {GROUPS.filter((g) => !groups.includes(g)).map((g) => (
              <button key={g} type="button" className="chip" onClick={() => setEditingItem({ group: g })}><Icon name="plus" size={16} /> Grupo {g.toLowerCase()}</button>
            ))}
          </div>
        </>
      )}

      {editingOption && (
        <OptionSheet meal={meal} option={editingOption === 'new' ? null : editingOption} nextOrder={options?.length ?? 0} onClose={() => setEditingOption(null)} />
      )}
      {editingItem && (
        <ItemSheet meal={meal} item={'id' in editingItem ? editingItem : null} group={editingItem.group} nextOrder={items?.length ?? 0} onClose={() => setEditingItem(null)} />
      )}
    </Page>
  )
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="icon-grid" role="radiogroup" aria-label="Ícone">
      {ICONS.map((ic) => (
        <button key={ic} type="button" role="radio" aria-checked={ic === value} className={`icon-choice${ic === value ? ' active' : ''}`} onClick={() => onChange(ic)}>
          <FoodIcon value={ic} size={22} />
        </button>
      ))}
    </div>
  )
}

function OptionSheet({ meal, option, nextOrder, onClose }: { meal: MealType; option: DietOption | null; nextOrder: number; onClose: () => void }) {
  const [name, setName] = useState(option?.name ?? '')
  const [icon, setIcon] = useState(option?.icon ?? ICONS[0])

  async function save() {
    if (!name.trim()) return
    if (option) await db.dietOptions.update(option.id, { name: name.trim(), icon })
    else await db.dietOptions.add({ mealType: meal, name: name.trim(), icon, order: nextOrder })
    onClose()
  }

  return (
    <Sheet title={option ? 'Editar opção' : `Nova opção – ${meal}`} onClose={onClose}>
      <form className="stack-form" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <input value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pão com ovo…" aria-label="Nome da opção" />
        <IconPicker value={icon} onChange={setIcon} />
        <button type="submit" className="btn primary full">Salvar</button>
        {option && (
          <button type="button" className="btn danger full" onClick={() => { if (confirm(`Remover "${option.name}"?`)) void db.dietOptions.delete(option.id).then(onClose) }}>
            Remover opção
          </button>
        )}
      </form>
    </Sheet>
  )
}

function ItemSheet({ meal, item, group, nextOrder, onClose }: { meal: MealType; item: DietItem | null; group: string; nextOrder: number; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [icon, setIcon] = useState(item?.icon ?? ICONS[0])

  async function save() {
    if (!name.trim()) return
    if (item) await db.dietItems.update(item.id, { name: name.trim(), icon })
    else await db.dietItems.add({ mealType: meal, group, name: name.trim(), icon, order: nextOrder })
    onClose()
  }

  return (
    <Sheet title={item ? `Editar item – ${group}` : `Novo item – ${group}`} onClose={onClose}>
      <form className="stack-form" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <input value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} placeholder="Ex.: Cuscuz…" aria-label="Nome do item" />
        <IconPicker value={icon} onChange={setIcon} />
        <button type="submit" className="btn primary full">Salvar</button>
        {item && (
          <button type="button" className="btn danger full" onClick={() => void db.dietItems.delete(item.id).then(onClose)}>
            Remover item
          </button>
        )}
      </form>
    </Sheet>
  )
}
