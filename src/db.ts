import Dexie, { type EntityTable } from 'dexie'
import { EMOJI_TO_ICON } from './Icon'

/* ------------------------------------------------------------------ Tipos */

export interface Exercise {
  id: number
  name: string
  muscle: string
}

/** Ficha de treino (ex.: Treino A – Peito e tríceps). */
export interface Plan {
  id: number
  name: string
  order: number
}

export interface PlanExercise {
  id: number
  planId: number
  exerciseId: number
  sets: number
  reps: number
  weight: number
  note?: string
  order: number
}

/** Um treino feito (sessão). */
export interface Workout {
  id: number
  date: string // YYYY-MM-DD
  name: string
  planId?: number
  startedAt?: number // timestamp
  endedAt?: number
  notes?: string
}

export interface WorkoutSet {
  id: number
  workoutId: number
  exerciseId: number
  reps: number
  weight: number
  createdAt: number
}

export const MEAL_TYPES = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'] as const
export type MealType = (typeof MEAL_TYPES)[number]

export const MEAL_ICONS: Record<MealType, string> = {
  'Café da manhã': '☕',
  Almoço: '🍛',
  Lanche: '🍎',
  Jantar: '🍲',
  Ceia: '🌙',
}

/** Opção da dieta para uma refeição (o que eu planejei comer). */
export interface DietOption {
  id: number
  mealType: MealType
  name: string
  icon: string
  order: number
}

/** option = opção pronta; built = montou com itens da dieta; other = fora da dieta; skipped = pulou. */
export type MealStatus = 'option' | 'built' | 'other' | 'skipped'

export const ON_DIET: MealStatus[] = ['option', 'built']

/** Item da dieta para montar uma refeição (ex.: grupo Carboidrato → Tapioca). */
export interface DietItem {
  id: number
  mealType: MealType
  group: string
  name: string
  icon: string
  order: number
}

/** Besteira registrada (fora das refeições). */
export interface TreatLog {
  id: number
  date: string
  name: string
  icon: string
  time: number
}

export const TREATS: [string, string][] = [
  ['Doce / chocolate', '🍫'],
  ['Refrigerante', '🥤'],
  ['Salgado frito', '🥟'],
  ['Hambúrguer', '🍔'],
  ['Pizza', '🍕'],
  ['Batata frita', '🍟'],
  ['Sorvete', '🍦'],
  ['Bolo / torta', '🍰'],
  ['Biscoito / salgadinho', '🍪'],
  ['Bebida alcoólica', '🍺'],
  ['Açaí', '🫐'],
  ['Pão doce', '🥐'],
]

/** Registro de uma refeição feita. */
export interface MealLog {
  id: number
  date: string
  mealType: MealType
  status: MealStatus
  optionId?: number
  label: string
  icon: string
  time: number
}

export interface BodyLog {
  id: number
  date: string
  weight?: number
  waist?: number
  chest?: number
  arm?: number
  hip?: number
  thigh?: number
  bodyFat?: number
}

export interface Goals {
  workoutsPerWeek: number
  targetWeight?: number
  /** Meta de água por dia em ml. Sem valor: calculada pelo peso (ver waterGoalFor). */
  waterMl?: number
}

/** Água bebida (um registro por copo/garrafa). */
export interface WaterLog {
  id: number
  date: string
  ml: number
  time: number
}

export const CUP_ML = 250

/**
 * Meta diária de água: cerca de 33 ml por kg de peso (referência da EFSA, a mesma usada pelo thedryden.com),
 * mais 500 ml em dia de treino. Arredonda para copos de 250 ml. Sem peso registrado, usa 2 litros.
 */
export function waterGoalFor(weightKg: number | undefined, trainedToday: boolean, manualMl?: number): number {
  const base = manualMl ?? (weightKg ? weightKg * 33 : 2000)
  const total = base + (trainedToday && manualMl === undefined ? 500 : 0)
  return Math.max(CUP_ML * 4, Math.round(total / CUP_ML) * CUP_ML)
}

/** Treino em andamento (para continuar se fechar o app). */
export interface ActiveSession {
  workoutId: number
  planId: number
  items: SessionItem[]
  current: number
}

export interface SessionItem {
  exerciseId: number
  sets: number
  reps: number
  weight: number
  note?: string
  done: number // séries feitas
}

export interface Setting {
  key: string
  value: unknown
}

/* ------------------------------------------------------------------ Banco */

export const db = new Dexie('fitness') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  plans: EntityTable<Plan, 'id'>
  planExercises: EntityTable<PlanExercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<WorkoutSet, 'id'>
  dietOptions: EntityTable<DietOption, 'id'>
  dietItems: EntityTable<DietItem, 'id'>
  mealLogs: EntityTable<MealLog, 'id'>
  treats: EntityTable<TreatLog, 'id'>
  water: EntityTable<WaterLog, 'id'>
  body: EntityTable<BodyLog, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  exercises: '++id, name, muscle',
  workouts: '++id, date',
  sets: '++id, workoutId, exerciseId',
  foods: '++id, name',
  meals: '++id, date, foodId',
  body: '++id, date',
  settings: 'key',
})

// v2: fichas de treino, dieta por opções; sai a contagem de calorias por alimento.
db.version(2)
  .stores({
    plans: '++id, order',
    planExercises: '++id, planId, exerciseId',
    dietOptions: '++id, mealType',
    mealLogs: '++id, date, [date+mealType]',
    foods: null,
    meals: null,
  })
  .upgrade(async (tx) => {
    await seedPlansAndDiet(tx.table('exercises'), tx.table('plans'), tx.table('planExercises'), tx.table('dietOptions'))
    await tx.table('settings').put({ key: 'goals', value: DEFAULT_GOALS })
  })

// v3: montar refeição por grupos de itens e registro de besteiras.
db.version(3)
  .stores({
    dietItems: '++id, mealType',
    treats: '++id, date',
  })
  .upgrade(async (tx) => {
    await seedDietItems(tx.table('dietItems'))
  })
// v4: emojis viram ícones desenhados (Lucide/Tabler); converte o que já estava salvo.
db.version(4) // (a troca por ícones desenhados foi desfeita na v5; mantida só pela numeração)

// v5: comidas, refeições e besteiras voltam para os emojis coloridos (cores reais dos alimentos).
db.version(5).upgrade(async (tx) => {
  const reverse: Record<string, string> = { utensils: '🍽️', 'skip-forward': '⏭️' }
  for (const [emoji, key] of Object.entries(EMOJI_TO_ICON)) if (!reverse[key]) reverse[key] = emoji
  const byName = new Map<string, string>()
  for (const type of MEAL_TYPES) {
    for (const [name, icon] of SEED_DIET[type]) byName.set(`${type}|${name}`, icon)
    for (const items of Object.values(SEED_ITEMS[type])) for (const [name, icon] of items) byName.set(`${type}|${name}`, icon)
  }
  for (const [name, icon] of TREATS) byName.set(`treat|${name}`, icon)
  const isKey = (v: string) => /^[a-z0-9-]+$/.test(v)
  const back = (icon: string, lookup: string) => (isKey(icon) ? (byName.get(lookup) ?? reverse[icon] ?? icon) : icon)
  await tx.table('dietItems').toCollection().modify((r: DietItem) => void (r.icon = back(r.icon, `${r.mealType}|${r.name}`)))
  await tx.table('dietOptions').toCollection().modify((r: DietOption) => void (r.icon = back(r.icon, `${r.mealType}|${r.name}`)))
  await tx.table('treats').toCollection().modify((r: TreatLog) => void (r.icon = back(r.icon, `treat|${r.name}`)))
  await tx.table('mealLogs').toCollection().modify((r: MealLog) => void (r.icon = back(r.icon, `${r.mealType}|${r.label.split(', ')[0]}`)))
})


// v6: registro de água.
db.version(6).stores({ water: '++id, date' })

// Se outra aba (ou uma versão nova do app) precisar atualizar o banco, esta fecha e recarrega,
// em vez de deixar a atualização travada (o que deixava telas em branco).
db.on('versionchange', () => {
  db.close()
  setTimeout(() => location.reload(), 100)
  return false
})

export const DEFAULT_GOALS: Goals = { workoutsPerWeek: 3 }

export const MUSCLES = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Cardio', 'Outro']

export const MUSCLE_ICONS: Record<string, string> = {
  Peito: 'dumbbell',
  Costas: 'dumbbell',
  Pernas: 'footprints',
  Ombros: 'dumbbell',
  Bíceps: 'biceps-flexed',
  Tríceps: 'biceps-flexed',
  Abdômen: 'person-standing',
  Cardio: 'heart-pulse',
  Outro: 'activity',
}

const SEED_EXERCISES: Omit<Exercise, 'id'>[] = [
  { name: 'Supino reto', muscle: 'Peito' },
  { name: 'Supino inclinado com halteres', muscle: 'Peito' },
  { name: 'Crucifixo', muscle: 'Peito' },
  { name: 'Flexão de braço', muscle: 'Peito' },
  { name: 'Puxada frontal', muscle: 'Costas' },
  { name: 'Remada curvada', muscle: 'Costas' },
  { name: 'Remada baixa', muscle: 'Costas' },
  { name: 'Remada unilateral', muscle: 'Costas' },
  { name: 'Agachamento livre', muscle: 'Pernas' },
  { name: 'Leg press', muscle: 'Pernas' },
  { name: 'Cadeira extensora', muscle: 'Pernas' },
  { name: 'Mesa flexora', muscle: 'Pernas' },
  { name: 'Levantamento terra', muscle: 'Pernas' },
  { name: 'Afundo', muscle: 'Pernas' },
  { name: 'Panturrilha em pé', muscle: 'Pernas' },
  { name: 'Desenvolvimento com halteres', muscle: 'Ombros' },
  { name: 'Elevação lateral', muscle: 'Ombros' },
  { name: 'Elevação frontal', muscle: 'Ombros' },
  { name: 'Rosca direta', muscle: 'Bíceps' },
  { name: 'Rosca martelo', muscle: 'Bíceps' },
  { name: 'Rosca alternada', muscle: 'Bíceps' },
  { name: 'Tríceps pulley', muscle: 'Tríceps' },
  { name: 'Tríceps francês', muscle: 'Tríceps' },
  { name: 'Tríceps banco', muscle: 'Tríceps' },
  { name: 'Prancha (segundos)', muscle: 'Abdômen' },
  { name: 'Abdominal supra', muscle: 'Abdômen' },
  { name: 'Esteira (minutos)', muscle: 'Cardio' },
  { name: 'Bicicleta (minutos)', muscle: 'Cardio' },
]

const SEED_PLANS: { name: string; items: [string, number, number, number][] }[] = [
  {
    name: 'Treino A – Peito, ombro e tríceps',
    items: [
      ['Supino reto', 3, 10, 20],
      ['Supino inclinado com halteres', 3, 10, 10],
      ['Elevação lateral', 3, 12, 4],
      ['Tríceps pulley', 3, 12, 15],
    ],
  },
  {
    name: 'Treino B – Costas e bíceps',
    items: [
      ['Puxada frontal', 3, 10, 30],
      ['Remada baixa', 3, 10, 30],
      ['Rosca direta', 3, 10, 10],
      ['Rosca martelo', 3, 12, 6],
    ],
  },
  {
    name: 'Treino C – Pernas',
    items: [
      ['Agachamento livre', 3, 10, 20],
      ['Leg press', 3, 12, 60],
      ['Cadeira extensora', 3, 12, 20],
      ['Mesa flexora', 3, 12, 20],
      ['Panturrilha em pé', 3, 15, 20],
    ],
  },
]

const SEED_DIET: Record<MealType, [string, string][]> = {
  'Café da manhã': [['Pão com ovo', '🍳'], ['Tapioca com queijo', '🫓'], ['Iogurte com aveia', '🥣'], ['Frutas', '🍌']],
  Almoço: [['Arroz, feijão e frango', '🍗'], ['Arroz, feijão e carne', '🥩'], ['Prato com peixe', '🐟'], ['Marmita leve', '🥗']],
  Lanche: [['Fruta', '🍎'], ['Iogurte', '🥛'], ['Sanduíche natural', '🥪'], ['Shake de whey', '🥤']],
  Jantar: [['Igual ao almoço', '🍛'], ['Omelete', '🍳'], ['Sopa', '🍲'], ['Salada com proteína', '🥗']],
  Ceia: [['Iogurte', '🥛'], ['Fruta', '🍐'], ['Chá', '🍵']],
}

const SEED_ITEMS: Record<MealType, Record<string, [string, string][]>> = {
  'Café da manhã': {
    Carboidrato: [['Cuscuz', '🌽'], ['Tapioca', '🫓'], ['Crepioca', '🥞'], ['Pão francês', '🥖'], ['Pão de forma', '🍞'], ['Torrada', '🍞'], ['Aveia', '🥣'], ['Batata-doce', '🍠']],
    Proteína: [['Ovo', '🥚'], ['Frango / carne', '🍗'], ['Queijo / requeijão / ricota', '🧀'], ['Iogurte', '🥛']],
    Bebida: [['Café', '☕'], ['Suco', '🧃'], ['Leite', '🥛'], ['Chá', '🍵']],
    Fruta: [['Banana', '🍌'], ['Maçã', '🍎'], ['Mamão', '🧡'], ['Morango', '🍓']],
  },
  Almoço: {
    Carboidrato: [['Arroz', '🍚'], ['Feijão', '🫘'], ['Macarrão', '🍝'], ['Batata-doce', '🍠'], ['Batata', '🥔'], ['Mandioca', '🥔']],
    Proteína: [['Frango', '🍗'], ['Peixe', '🐟'], ['Carne bovina magra', '🥩'], ['Ovo', '🥚']],
    Salada: [['Alface', '🥬'], ['Tomate', '🍅'], ['Cenoura', '🥕'], ['Cebola', '🧅'], ['Pepino', '🥒'], ['Brócolis', '🥦']],
  },
  Lanche: {
    Carboidrato: [['Pão', '🍞'], ['Tapioca', '🫓'], ['Aveia', '🥣'], ['Torrada', '🍞']],
    Proteína: [['Iogurte', '🥛'], ['Ovo', '🥚'], ['Queijo', '🧀'], ['Whey', '🥤'], ['Pasta de amendoim', '🥜']],
    Fruta: [['Banana', '🍌'], ['Maçã', '🍎'], ['Pera', '🍐'], ['Uva', '🍇']],
  },
  Jantar: {
    Carboidrato: [['Arroz', '🍚'], ['Feijão', '🫘'], ['Macarrão', '🍝'], ['Batata-doce', '🍠'], ['Cuscuz', '🌽'], ['Tapioca', '🫓']],
    Proteína: [['Frango', '🍗'], ['Peixe', '🐟'], ['Carne bovina magra', '🥩'], ['Ovo', '🥚']],
    Salada: [['Alface', '🥬'], ['Tomate', '🍅'], ['Cenoura', '🥕'], ['Brócolis', '🥦']],
  },
  Ceia: {
    Leve: [['Iogurte', '🥛'], ['Fruta', '🍐'], ['Chá', '🍵'], ['Castanhas', '🥜'], ['Queijo', '🧀']],
  },
}

async function seedDietItems(table: AnyTable) {
  if ((await table.count()) > 0) return
  const rows: Omit<DietItem, 'id'>[] = []
  for (const type of MEAL_TYPES) {
    let order = 0
    for (const [group, items] of Object.entries(SEED_ITEMS[type])) for (const [name, icon] of items) rows.push({ mealType: type, group, name, icon, order: order++ })
  }
  await table.bulkAdd(rows as never[])
}

type AnyTable ={ bulkAdd: (x: never[]) => Promise<unknown>; toArray: () => Promise<unknown[]>; add: (x: never) => Promise<unknown>; count: () => Promise<number> }

async function seedPlansAndDiet(exercises: AnyTable, plans: AnyTable, planExercises: AnyTable, dietOptions: AnyTable) {
  const existing = (await exercises.toArray()) as Exercise[]
  const names = new Set(existing.map((e) => e.name))
  const missing = SEED_EXERCISES.filter((e) => !names.has(e.name))
  if (missing.length) await exercises.bulkAdd(missing as never[])
  const all = (await exercises.toArray()) as Exercise[]
  const byName = new Map(all.map((e) => [e.name, e.id]))

  if ((await plans.count()) === 0) {
    for (const [i, p] of SEED_PLANS.entries()) {
      const planId = (await plans.add({ name: p.name, order: i } as never)) as number
      await planExercises.bulkAdd(
        p.items
          .filter(([n]) => byName.has(n))
          .map(([n, sets, reps, weight], order) => ({ planId, exerciseId: byName.get(n)!, sets, reps, weight, order })) as never[],
      )
    }
  }

  if ((await dietOptions.count()) === 0) {
    const rows: Omit<DietOption, 'id'>[] = []
    for (const type of MEAL_TYPES) SEED_DIET[type].forEach(([name, icon], order) => rows.push({ mealType: type, name, icon, order }))
    await dietOptions.bulkAdd(rows as never[])
  }
}

db.on('populate', async (tx) => {
  await seedPlansAndDiet(tx.table('exercises'), tx.table('plans'), tx.table('planExercises'), tx.table('dietOptions'))
  await seedDietItems(tx.table('dietItems'))
  await tx.table('settings').put({ key: 'goals', value: DEFAULT_GOALS })
})

/* ------------------------------------------------------------------ Datas e utilidades */

export function today(): string {
  return toISODate(new Date())
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + days))
}

export function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'narrow' })
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

/** Refeição sugerida pelo horário atual. */
export function mealForNow(date = new Date()): MealType {
  const h = date.getHours()
  if (h < 10) return 'Café da manhã'
  if (h < 15) return 'Almoço'
  if (h < 18) return 'Lanche'
  if (h < 22) return 'Jantar'
  return 'Ceia'
}

/** 1RM estimado (Epley). */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}

/* ------------------------------------------------------------------ Backup */

const TABLES = ['exercises', 'plans', 'planExercises', 'workouts', 'sets', 'dietOptions', 'dietItems', 'mealLogs', 'treats', 'water', 'body', 'settings'] as const

export async function exportBackup(): Promise<string> {
  const data: Record<string, unknown> = { app: 'fitness', version: 3, exportedAt: new Date().toISOString() }
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  return JSON.stringify(data)
}

export async function importBackup(json: string): Promise<void> {
  const data = JSON.parse(json)
  if (data?.app !== 'fitness') throw new Error('Arquivo não é um backup deste app.')
  if ((data.version ?? 1) < 2) throw new Error('Backup de uma versão antiga do app; não é compatível.')
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkAdd(data[t] ?? [])
    }
    await seedDietItems(db.dietItems as unknown as AnyTable)
  })
}
