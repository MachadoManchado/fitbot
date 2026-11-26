/**
 * Catálogo de comidas para montar a dieta tocando (sem digitar).
 * Colunas: nome, emoji, grupo, unidade, calorias por unidade.
 * Calorias são ESTIMATIVAS aproximadas (base: Tabela TACO e rótulos comuns); servem de referência, não de regra.
 */
export type FoodRow = [string, string, string, string, number]

export const FOOD_GROUPS = ['Carboidrato', 'Proteína', 'Salada', 'Fruta', 'Bebida', 'Outros'] as const

export const FOODS: FoodRow[] = [
  // Carboidratos
  ['Arroz', '🍚', 'Carboidrato', 'colher de servir', 60],
  ['Arroz integral', '🍚', 'Carboidrato', 'colher de servir', 55],
  ['Feijão', '🫘', 'Carboidrato', 'concha', 65],
  ['Macarrão', '🍝', 'Carboidrato', 'pegador', 120],
  ['Batata-doce', '🍠', 'Carboidrato', 'unidade média', 115],
  ['Batata', '🥔', 'Carboidrato', 'unidade média', 70],
  ['Purê de batata', '🥔', 'Carboidrato', 'colher de servir', 50],
  ['Mandioca', '🥔', 'Carboidrato', 'pedaço', 125],
  ['Cuscuz', '🌽', 'Carboidrato', 'fatia', 115],
  ['Milho', '🌽', 'Carboidrato', 'colher de sopa', 25],
  ['Tapioca', '🫓', 'Carboidrato', 'unidade', 140],
  ['Crepioca', '🥞', 'Carboidrato', 'unidade', 150],
  ['Pão francês', '🥖', 'Carboidrato', 'unidade', 150],
  ['Pão de forma', '🍞', 'Carboidrato', 'fatia', 65],
  ['Pão integral', '🍞', 'Carboidrato', 'fatia', 60],
  ['Torrada', '🍞', 'Carboidrato', 'unidade', 35],
  ['Rap10 / wrap', '🌯', 'Carboidrato', 'unidade', 135],
  ['Aveia', '🥣', 'Carboidrato', 'colher de sopa', 60],
  ['Granola', '🥣', 'Carboidrato', 'colher de sopa', 60],
  ['Cereal', '🥣', 'Carboidrato', 'xícara', 120],
  ['Inhame', '🥔', 'Carboidrato', 'unidade', 100],
  ['Farofa', '🥄', 'Carboidrato', 'colher de sopa', 55],
  // Proteínas
  ['Ovo', '🥚', 'Proteína', 'unidade', 75],
  ['Ovo frito', '🍳', 'Proteína', 'unidade', 110],
  ['Omelete', '🍳', 'Proteína', 'unidade (2 ovos)', 180],
  ['Frango', '🍗', 'Proteína', 'filé', 160],
  ['Frango desfiado', '🍗', 'Proteína', 'colher de sopa', 35],
  ['Carne bovina magra', '🥩', 'Proteína', 'bife', 220],
  ['Carne moída', '🥩', 'Proteína', 'colher de sopa', 55],
  ['Peixe', '🐟', 'Proteína', 'filé', 120],
  ['Atum', '🐟', 'Proteína', 'lata', 150],
  ['Sardinha', '🐟', 'Proteína', 'lata', 190],
  ['Queijo', '🧀', 'Proteína', 'fatia', 70],
  ['Queijo / requeijão / ricota', '🧀', 'Proteína', 'colher de sopa', 40],
  ['Requeijão', '🧀', 'Proteína', 'colher de sopa', 40],
  ['Peito de peru', '🥓', 'Proteína', 'fatia', 18],
  ['Presunto', '🥓', 'Proteína', 'fatia', 25],
  ['Iogurte', '🥛', 'Proteína', 'pote', 110],
  ['Whey', '🥤', 'Proteína', 'dose', 120],
  ['Pasta de amendoim', '🥜', 'Proteína', 'colher de sopa', 90],
  ['Castanhas', '🥜', 'Proteína', 'punhado', 180],
  ['Frango / carne', '🍗', 'Proteína', 'porção', 180],
  // Salada e legumes
  ['Alface', '🥬', 'Salada', 'porção', 10],
  ['Tomate', '🍅', 'Salada', 'unidade', 20],
  ['Cenoura', '🥕', 'Salada', 'unidade', 30],
  ['Cebola', '🧅', 'Salada', 'porção', 15],
  ['Pepino', '🥒', 'Salada', 'porção', 10],
  ['Brócolis', '🥦', 'Salada', 'porção', 25],
  ['Abobrinha', '🥒', 'Salada', 'porção', 20],
  ['Beterraba', '🫒', 'Salada', 'porção', 30],
  ['Repolho', '🥬', 'Salada', 'porção', 15],
  ['Chuchu', '🥒', 'Salada', 'porção', 15],
  ['Vagem', '🫛', 'Salada', 'porção', 20],
  ['Salada (prato)', '🥗', 'Salada', 'prato', 50],
  // Frutas
  ['Banana', '🍌', 'Fruta', 'unidade', 90],
  ['Maçã', '🍎', 'Fruta', 'unidade', 80],
  ['Mamão', '🧡', 'Fruta', 'fatia', 60],
  ['Morango', '🍓', 'Fruta', 'xícara', 50],
  ['Pera', '🍐', 'Fruta', 'unidade', 85],
  ['Uva', '🍇', 'Fruta', 'cacho', 70],
  ['Laranja', '🍊', 'Fruta', 'unidade', 70],
  ['Abacaxi', '🍍', 'Fruta', 'fatia', 50],
  ['Melancia', '🍉', 'Fruta', 'fatia', 45],
  ['Melão', '🍈', 'Fruta', 'fatia', 30],
  ['Manga', '🥭', 'Fruta', 'unidade', 140],
  ['Kiwi', '🥝', 'Fruta', 'unidade', 45],
  ['Abacate', '🥑', 'Fruta', 'colher de sopa', 35],
  ['Fruta', '🍐', 'Fruta', 'unidade', 70],
  // Bebidas
  ['Café', '☕', 'Bebida', 'xícara', 3],
  ['Café com leite', '☕', 'Bebida', 'copo', 90],
  ['Suco', '🧃', 'Bebida', 'copo', 90],
  ['Leite', '🥛', 'Bebida', 'copo', 120],
  ['Leite desnatado', '🥛', 'Bebida', 'copo', 70],
  ['Chá', '🍵', 'Bebida', 'xícara', 2],
  ['Água de coco', '🥥', 'Bebida', 'copo', 45],
  ['Achocolatado', '🥤', 'Bebida', 'copo', 160],
  ['Vitamina', '🥤', 'Bebida', 'copo', 200],
  // Outros
  ['Sanduíche', '🥪', 'Outros', 'unidade', 250],
  ['Sanduíche natural', '🥪', 'Outros', 'unidade', 220],
  ['Sopa', '🍲', 'Outros', 'prato', 150],
  ['Azeite', '🫒', 'Outros', 'colher de sopa', 90],
  ['Manteiga', '🧈', 'Outros', 'colher de chá', 36],
  ['Mel', '🍯', 'Outros', 'colher de sopa', 60],
  ['Açúcar', '🧂', 'Outros', 'colher de chá', 20],
]

export const FOOD_BY_NAME = new Map(FOODS.map((f) => [f[0].toLowerCase(), f]))

/** "colher de servir" → "colheres de servir", "unidade média" → "unidades médias". */
export function pluralUnit(unit: string, qty: number): string {
  if (qty <= 1) return unit
  const pl = (w: string) => (w.endsWith('ão') ? w.slice(0, -2) + 'ões' : /[rz]$/.test(w) ? w + 'es' : w.endsWith('l') ? w.slice(0, -1) + 'is' : w + 's')
  const [first, ...rest] = unit.split(' ')
  if (rest[0] === 'de' || rest.length === 0) return [pl(first), ...rest].join(' ')
  return [pl(first), ...rest.map(pl)].join(' ')
}

/** 0.5 → "½", 1.5 → "1½". */
export function fmtQty(q: number): string {
  const whole = Math.floor(q)
  const half = q - whole >= 0.5
  return half ? `${whole || ''}½` : String(whole)
}

/** Procura no catálogo pelo nome (sem acento/maiúscula). */
export function findFood(name: string): FoodRow | undefined {
  return FOOD_BY_NAME.get(name.trim().toLowerCase())
}
