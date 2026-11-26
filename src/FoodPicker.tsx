import { useState } from 'react'
import { FoodIcon } from './Icon'
import { Sheet } from './components'
import { db, type DietItem, type MealType } from './db'
import { FOOD_GROUPS, FOODS, type FoodRow } from './foodCatalog'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Grupos da dieta que não existem no catálogo caem em "Outros" (ex.: "Leve"). */
const catalogGroup = (g: string) => ((FOOD_GROUPS as readonly string[]).includes(g) ? g : 'Outros')

/**
 * Painel para adicionar comidas à dieta tocando (catálogo com ~90 comidas),
 * com busca e opção de criar uma comida com nome próprio.
 * O que é adicionado fica salvo na dieta daquela refeição.
 */
export function FoodPicker({
  meal,
  group,
  existing,
  onAdded,
  onClose,
}: {
  meal: MealType
  group: string
  existing: DietItem[]
  onAdded?: (id: number) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(catalogGroup(group))
  const have = new Set(existing.map((e) => norm(e.name)))
  const q = norm(query.trim())
  const list = (q ? FOODS.filter((f) => norm(f[0]).includes(q)) : FOODS.filter((f) => f[2] === filter)).filter((f) => !have.has(norm(f[0])))

  async function add(row: FoodRow | null) {
    const name = row ? row[0] : query.trim()
    if (!name) return
    const id = await db.dietItems.add({
      mealType: meal,
      group,
      name,
      icon: row ? row[1] : '🍽️',
      order: existing.length,
      unit: row?.[3] ?? 'porção',
      kcal: row?.[4],
    })
    onAdded?.(id)
    onClose()
  }

  return (
    <Sheet title={`Adicionar – ${group}`} onClose={onClose}>
      <input
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar comida…"
        aria-label="Buscar comida"
        autoComplete="off"
      />
      {!q && (
        <div className="chips scroll-x">
          {FOOD_GROUPS.map((g) => (
            <button key={g} type="button" className={`chip${g === filter ? ' active' : ''}`} onClick={() => setFilter(g)}>
              {g}
            </button>
          ))}
        </div>
      )}
      <div className="food-pick-grid">
        {list.map((f) => (
          <button key={f[0]} type="button" className="option" onClick={() => void add(f)}>
            <FoodIcon value={f[1]} size={36} />
            <span>{f[0]}</span>
          </button>
        ))}
      </div>
      {q && (
        <button type="button" className="btn ghost full" onClick={() => void add(null)}>
          + Criar “{query.trim()}”
        </button>
      )}
      {!q && list.length === 0 && <p className="muted small">Tudo deste grupo já está na sua dieta. Busque pelo nome para criar outra.</p>}
    </Sheet>
  )
}
