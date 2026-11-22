// Gera src/iconData.ts com os ícones usados no app (só os escolhidos, para o app ficar leve).
// Fontes: Lucide (ISC) e Tabler Icons (MIT), mesmo estilo de traço; e alguns desenhados à mão.
// Uso: node scripts/build-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const LUCIDE = [
  // comidas
  'apple', 'banana', 'bean', 'beef', 'broccoli', 'cake', 'candy', 'carrot', 'cherry', 'citrus', 'coffee', 'cookie', 'cooking-pot',
  'croissant', 'cup-soda', 'donut', 'drumstick', 'egg', 'egg-fried', 'fish', 'grape', 'hamburger', 'ice-cream-bowl', 'ice-cream-cone',
  'leafy-green', 'milk', 'nut', 'pizza', 'popcorn', 'salad', 'sandwich', 'soup', 'wheat', 'beer', 'wine', 'glass-water', 'utensils',
  // treino e corpo
  'dumbbell', 'biceps-flexed', 'footprints', 'person-standing', 'heart-pulse', 'activity', 'bike', 'weight',
  // interface e guia
  'check', 'plus', 'play', 'clipboard-list', 'flame', 'zap', 'settings', 'file-text', 'sparkles', 'timer', 'hourglass', 'clock',
  'calendar', 'trending-up', 'skip-forward', 'moon', 'sun', 'trophy', 'repeat', 'list-checks',
]
const TABLER = ['bread', 'baguette', 'cheese', 'mug', 'melon', 'bowl-spoon', 'bowl-chopsticks', 'milkshake', 'pepper', 'lemon-2']

// Desenhados à mão no mesmo grid 24×24, traço 2, pontas arredondadas.
const CUSTOM = {
  tomato: '<circle cx="12" cy="13.5" r="7.5"/><path d="M8.5 6.8c1.1.8 2.3 1.2 3.5 1.2s2.4-.4 3.5-1.2M12 8V4.5"/>',
  onion: '<path d="M12 3c0 3-6.5 6-6.5 11a6.5 6.5 0 0 0 13 0c0-5-6.5-8-6.5-11Z"/><path d="M12 9.5c-1.6 2-2.2 4-2.2 6M12 9.5c1.6 2 2.2 4 2.2 6"/>',
  potato: '<path d="M6.3 7.6C8.8 4 16 4.4 18.1 8s1.1 8.6-3 10.6-9.6 1-10.6-3 .1-5.6 1.8-8Z"/><path d="M10 10h.01M14.5 9h.01M13 14h.01"/>',
  rice: '<path d="M3 12h18a9 9 0 0 1-18 0Z"/><path d="M6 12c0-3 2.7-5 6-5s6 2 6 5"/><path d="M10 9.6h.01M13.6 9h.01M12 10.6h.01"/>',
  tapioca: '<path d="M3 15.5a9 9 0 0 1 18 0Z"/><path d="M7.2 15.5c.6-2.5 2.6-4 4.8-4s4.2 1.5 4.8 4"/>',
  fries: '<path d="M6 10.5h12l-1.6 9.5H7.6Z"/><path d="M8.2 10.5 7.2 4.5M11 10.5V3.5M14 10.5l.5-6M16.8 10.5l1-5"/>',
}

function inner(file) {
  const svg = readFileSync(file, 'utf8')
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const out = {}
for (const n of LUCIDE) out[n] = inner(join(root, 'node_modules/lucide-static/icons', `${n}.svg`))
for (const n of TABLER) out[n] = inner(join(root, 'node_modules/@tabler/icons/icons/outline', `${n}.svg`))
Object.assign(out, CUSTOM)

const body = Object.entries(out)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  '${k}': '${v.replace(/'/g, "\\'")}',`)
  .join('\n')

writeFileSync(
  join(root, 'src/iconData.ts'),
  `// Gerado por scripts/build-icons.mjs. Não editar à mão.\n// Ícones: Lucide (ISC), Tabler Icons (MIT) e desenhos próprios.\nexport const ICON_DATA: Record<string, string> = {\n${body}\n}\n`,
)
console.log(`${Object.keys(out).length} ícones gerados`)
