import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FoodIcon, Icon } from '../Icon'
import { Page, Sheet } from '../components'
import { db, MEAL_ICONS, MEAL_TYPES, type DietItem, type MealType } from '../db'
import { FoodPicker } from '../FoodPicker'
import { findFood } from '../foodCatalog'

const UNITS = ['unidade', 'fatia', 'colher de sopa', 'colher de servir', 'concha', 'copo', 'xícara', 'porção', 'pote', 'pedaço']

// Comidas usam emojis coloridos (cores reais), por escolha do usuário.
const ICONS = ['🍳', '🥚', '🍞', '🥖', '🫓', '🥞', '🌽', '🥣', '🍚', '🫘', '🍝', '🍠', '🥔', '🥐', '🥪', '🌯', '🍗', '🥩', '🐟', '🧀', '🥛', '🥜', '🥤', '☕', '🧃', '🍵', '🥬', '🍅', '🥕', '🧅', '🥒', '🥦', '🥗', '🥑', '🍌', '🍎', '🍐', '🍓', '🍇', '🧡', '🍲', '🍛']
const GROUPS = ['Carboidrato', 'Proteína', 'Salada', 'Bebida', 'Fruta', 'Leve', 'Outros']

export default function DietEditor() {
  const navigate = useNavigate()
  const [meal, setMeal] = useState<MealType>('Café da manhã')
  const [editingItem, setEditingItem] = useState<DietItem | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)
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

      {(
        <>
          <p className="muted small">As comidas de cada etapa do registro. Toque numa para editar ou tirar. As 4 primeiras de cada grupo aparecem em botões grandes; o resto fica em "Mais opções".</p>
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
                <button type="button" className="food-chip add" onClick={() => setAddingTo(g)}><Icon name="plus" size={18} /> Adicionar</button>
              </div>
            </section>
          ))}
          <div className="chips">
            {GROUPS.filter((g) => !groups.includes(g)).map((g) => (
              <button key={g} type="button" className="chip" onClick={() => setAddingTo(g)}><Icon name="plus" size={16} /> Grupo {g.toLowerCase()}</button>
            ))}
          </div>
        </>
      )}

      {editingItem && (
        <ItemSheet meal={meal} item={editingItem} group={editingItem.group} nextOrder={items?.length ?? 0} onClose={() => setEditingItem(null)} />
      )}
      {addingTo && <FoodPicker meal={meal} group={addingTo} existing={items ?? []} onClose={() => setAddingTo(null)} />}
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

function ItemSheet({ meal, item, group, nextOrder, onClose }: { meal: MealType; item: DietItem | null; group: string; nextOrder: number; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [icon, setIcon] = useState(item?.icon ?? ICONS[0])
  const [unit, setUnit] = useState(item?.unit ?? (item && findFood(item.name)?.[3]) ?? 'porção')

  async function save() {
    if (!name.trim()) return
    if (item) await db.dietItems.update(item.id, { name: name.trim(), icon, unit })
    else await db.dietItems.add({ mealType: meal, group, name: name.trim(), icon, order: nextOrder, unit })
    onClose()
  }

  return (
    <Sheet title={item ? `Editar item – ${group}` : `Novo item – ${group}`} onClose={onClose}>
      <form className="stack-form" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <input value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} placeholder="Ex.: Cuscuz…" aria-label="Nome do item" />
        <IconPicker value={icon} onChange={setIcon} />
        <p className="muted small">Medida (para marcar a quantidade):</p>
        <div className="unit-chips">
          {[...new Set([unit, ...UNITS])].map((u) => (
            <button key={u} type="button" className={`chip${u === unit ? ' active' : ''}`} onClick={() => setUnit(u)}>{u}</button>
          ))}
        </div>
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
