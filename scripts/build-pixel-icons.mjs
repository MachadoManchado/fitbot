// Gera src/pixelIconData.ts com os ícones em pixel usados no app.
// Fonte: pixelarticons (MIT, https://github.com/halfmage/pixelarticons) + alguns desenhados no mesmo grid 24×24.
// Uso: node scripts/build-pixel-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PICK = [
  'home', 'comment', 'apple', 'chart-bar-big', 'human-arms-up', 'user', 'gear', 'zap', 'check', 'play', 'plus', 'fire',
  'file-text', 'trophy', 'clock', 'calendar', 'trending-up', 'hourglass', 'undo', 'moon', 'heart', 'robot-face-happy',
  'coffee', 'cake', 'close', 'arrow-left', 'arrow-right', 'repeat', 'battery-low', 'star', 'notes', 'trash',
]
// Desenhados à mão (preenchimento, grid de 24 em pixels de 2).
const CUSTOM = {
  dumbbell: 'M2 9h2v6H2zM4 7h3v10H4zM17 7h3v10h-3zM20 9h2v6h-2zM7 11h10v2H7z',
  drop: 'M11 3h2v2h-2zM10 5h4v2h-4zM9 7h6v2H9zM8 9h8v2H8zM7 11h10v6H7zM8 17h8v2H8zM10 19h4v2h-4z',
  bowl: 'M3 11h18v2H3zM4 13h16v2H4zM5 15h14v2H5zM7 17h10v2H7zM9 19h6v2H9zM8 7h2v2H8zM11 5h2v4h-2zM14 7h2v2h-2z',
}

const out = {}
for (const n of PICK) {
  const svg = readFileSync(join(root, 'node_modules/pixelarticons/svg', `${n}.svg`), 'utf8')
  const paths = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1])
  out[n] = paths.join(' ')
}
Object.assign(out, CUSTOM)

const body = Object.entries(out)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  '${k}': '${v}',`)
  .join('\n')
writeFileSync(
  join(root, 'src/pixelIconData.ts'),
  `// Gerado por scripts/build-pixel-icons.mjs. Não editar à mão.\n// Ícones em pixel: pixelarticons (MIT) e desenhos próprios. Valor = atributo "d" (preenchimento).\nexport const PIXEL_ICONS: Record<string, string> = {\n${body}\n}\n`,
)
console.log(`${Object.keys(out).length} ícones em pixel gerados`)
