import { ICON_DATA } from './iconData'
import { PIXEL_ICONS } from './pixelIconData'

/** Tipo do ícone, que define a cor do círculo (estilo Duolingo: cada coisa com sua cor). */
type Tone = 'carb' | 'protein' | 'veg' | 'fruit' | 'drink' | 'treat' | 'train' | 'neutral' | 'on-accent'

const TONE: Record<string, Tone> = {
  wheat: 'carb', tapioca: 'carb', 'egg-fried': 'protein', baguette: 'carb', bread: 'carb', 'bowl-spoon': 'carb', potato: 'carb',
  rice: 'carb', bean: 'carb', 'bowl-chopsticks': 'carb', croissant: 'carb', sandwich: 'carb',
  egg: 'protein', drumstick: 'protein', beef: 'protein', cheese: 'protein', fish: 'protein', milk: 'drink', nut: 'protein',
  milkshake: 'drink', coffee: 'drink', 'cup-soda': 'drink', mug: 'drink', 'glass-water': 'drink',
  'leafy-green': 'veg', tomato: 'veg', carrot: 'veg', onion: 'veg', pepper: 'veg', broccoli: 'veg', salad: 'veg',
  banana: 'fruit', apple: 'fruit', melon: 'fruit', cherry: 'fruit', grape: 'fruit', citrus: 'fruit', 'lemon-2': 'fruit',
  candy: 'treat', hamburger: 'treat', pizza: 'treat', fries: 'treat', 'ice-cream-cone': 'treat', 'ice-cream-bowl': 'treat',
  cake: 'treat', cookie: 'treat', beer: 'treat', wine: 'treat', donut: 'treat', popcorn: 'treat',
  dumbbell: 'train', 'biceps-flexed': 'train', footprints: 'train', 'person-standing': 'train', 'heart-pulse': 'train', activity: 'train',
}

/** Emojis antigos → ícone novo (para dados já salvos no celular). */
export const EMOJI_TO_ICON: Record<string, string> = {
  '🌽': 'wheat', '🫓': 'tapioca', '🥞': 'egg-fried', '🥖': 'baguette', '🍞': 'bread', '🥣': 'bowl-spoon', '🍠': 'potato', '🥔': 'potato',
  '🥚': 'egg', '🍳': 'egg-fried', '🍗': 'drumstick', '🥩': 'beef', '🧀': 'cheese', '🥛': 'milk', '☕': 'coffee', '🧃': 'cup-soda',
  '🍵': 'mug', '🍌': 'banana', '🍎': 'apple', '🧡': 'melon', '🍓': 'cherry', '🍐': 'apple', '🍇': 'grape', '🍚': 'rice', '🫘': 'bean',
  '🍝': 'bowl-chopsticks', '🐟': 'fish', '🥬': 'leafy-green', '🍅': 'tomato', '🥕': 'carrot', '🧅': 'onion', '🥒': 'pepper',
  '🥦': 'broccoli', '🥪': 'sandwich', '🥤': 'milkshake', '🥜': 'nut', '🥗': 'salad', '🍛': 'cooking-pot', '🍲': 'soup', '🥑': 'leafy-green',
  '🍫': 'candy', '🥟': 'drumstick', '🍔': 'hamburger', '🍕': 'pizza', '🍟': 'fries', '🍦': 'ice-cream-cone', '🍰': 'cake',
  '🍪': 'cookie', '🍺': 'beer', '🫐': 'ice-cream-bowl', '🥐': 'croissant', '🍽️': 'utensils', '⏭️': 'skip-forward', '🌯': 'sandwich',
}

/** Converte um valor salvo (nome de ícone ou emoji antigo) no nome do ícone. */
export function iconKey(v: string): string {
  return ICON_DATA[v] ? v : (EMOJI_TO_ICON[v] ?? v)
}

export function Icon({ name, size = 24, strokeWidth = 2, className }: { name: string; size?: number; strokeWidth?: number; className?: string }) {
  const key = iconKey(name)
  const data = ICON_DATA[key]
  if (!data) return <span className={className} aria-hidden="true">{name}</span>
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: data }}
    />
  )
}

/** Ícone dentro de um círculo colorido conforme o tipo (carboidrato, proteína, fruta...). */
export function IconBadge({ name, size = 56, tone }: { name: string; size?: number; tone?: Tone }) {
  const t = tone ?? TONE[iconKey(name)] ?? 'neutral'
  return (
    <span className={`icon-badge tone-${t}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon name={name} size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </span>
  )
}

/** Cor de cada refeição nos cards (café, almoço...). */
export const MEAL_TONE: Record<string, Tone> = {
  'Café da manhã': 'carb',
  Almoço: 'veg',
  Lanche: 'fruit',
  Jantar: 'protein',
  Ceia: 'drink',
}

/**
 * Comidas, refeições e besteiras: emoji colorido (cores reais dos alimentos), sem círculo.
 * Se o valor for um nome de ícone desenhado, mostra o ícone no círculo.
 */
export function FoodIcon({ value, size = 40 }: { value: string; size?: number }) {
  if (ICON_DATA[value]) return <IconBadge name={value} size={Math.round(size * 1.3)} />
  const src = pixelEmoji(value)
  if (!src) {
    return (
      <span className="food-emoji" style={{ fontSize: size }} aria-hidden="true">
        {value}
      </span>
    )
  }
  return <img className="pixel-food" src={src} width={size * 1.15} height={size * 1.15} alt="" aria-hidden="true" draggable={false} />
}

/**
 * Comida em pixel art: desenha o emoji bem pequeno (18×18) num canvas e o app amplia com
 * pixels visíveis (image-rendering: pixelated). Mantém as cores reais do alimento.
 */
const PIXEL_RES = 18
const pixelCache = new Map<string, string>()
function pixelEmoji(emoji: string): string | null {
  const hit = pixelCache.get(emoji)
  if (hit) return hit
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = PIXEL_RES
  c.height = PIXEL_RES
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${PIXEL_RES - 2}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
  ctx.fillText(emoji, PIXEL_RES / 2, PIXEL_RES / 2 + 1)
  // "Endurece" a transparência das bordas para os pixels ficarem nítidos.
  const img = ctx.getImageData(0, 0, PIXEL_RES, PIXEL_RES)
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 90 ? 255 : 0
  ctx.putImageData(img, 0, 0)
  const url = c.toDataURL('image/png')
  pixelCache.set(emoji, url)
  return url
}

/** Versão em traço simples (sem cor) de cada refeição, para telas minimalistas como o Início. */
export const MEAL_LINE_ICON: Record<string, string> = {
  'Café da manhã': 'coffee',
  Almoço: 'utensils',
  Lanche: 'apple',
  Jantar: 'soup',
  Ceia: 'moon',
}

/** Ícone em pixel (estética de bichinho virtual). Preenchido com a cor do texto. */
export function PixelIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const d = PIXEL_ICONS[name]
  if (!d) return null
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
