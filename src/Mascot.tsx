import type { Mood } from './hooks'

/**
 * O guia em pixel art (estética de bichinho virtual de tela LCD): um robozinho original.
 * Desenhado numa grade de 20×20; "#" = pixel aceso. O humor aparece no rosto
 * (olhos e boca acesos). Dois quadros alternam (o robô dá um pulinho).
 */

// Corpo (sem a tela). Linhas de 20 colunas.
const BODY = [
  '.........##.........',
  '.........##.........',
  '.........##.........',
  '....############....',
  '...#............#...',
  '.#.#............#.#.',
  '.#.#............#.#.',
  '.#.#............#.#.',
  '.#.#............#.#.',
  '...#............#...',
  '...#............#...',
  '....############....',
  '.......######.......',
  '....#.#......#.#....',
  '...#..#..##..#..#...',
  '......#..##..#......',
  '......#......#......',
  '.......######.......',
  '.......#....#.......',
  '......##....##......',
]

// Rosto: 12×7 dentro da cabeça (coluna 4, linha 4). "#" = pixel aceso (olhos, boca, "z").
const FACES: Record<Mood, string[]> = {
  great: ['............', '..#......#..', '.#.#....#.#.', '............', '..#......#..', '...######...', '............'],
  good: ['............', '..##....##..', '..##....##..', '............', '...#....#...', '....####....', '............'],
  ok: ['............', '............', '.###....###.', '............', '............', '....####....', '............'],
  sleepy: ['............', '............', '............', '.###....###.', '............', '.....##.....', '............'],
}

// Braços para cima (comemoração) no segundo quadro do humor "great".
const ARMS_UP = ['...#..#......#..#...', '....#.#..##..#.#....']

function sprite(mood: Mood, frame: 0 | 1): string[] {
  const rows = BODY.map((r) => r.split(''))
  const face = FACES[mood]
  face.forEach((line, y) => line.split('').forEach((c, x) => (rows[4 + y][4 + x] = c)))
  if (mood === 'sleepy') {
    rows[0] = '..............###...'.split('') // antena "apagada" e um "z" de sono acima da cabeça
    rows[1] = '.........##....#....'.split('')
    rows[2] = '.........##...###...'.split('')
  }
  if (frame === 1 && mood === 'great') {
    rows[13] = ARMS_UP[0].split('')
    rows[14] = ARMS_UP[1].split('')
  }
  return rows.map((r) => r.join(''))
}

function toPath(rows: string[], dy = 0): string {
  let d = ''
  rows.forEach((line, y) => {
    let x = 0
    while (x < line.length) {
      if (line[x] !== '#') {
        x++
        continue
      }
      let w = 1
      while (line[x + w] === '#') w++
      d += `M${x} ${y + dy}h${w}v1h-${w}z`
      x += w
    }
  })
  return d
}

export default function Mascot({ mood, size = 140 }: { mood: Mood; size?: number }) {
  const a = sprite(mood, 0)
  const b = sprite(mood, 1)
  // Quadro 2: o corpo sobe 1 pixel (os pés ficam), um pulinho.
  const bUp = mood === 'sleepy' ? b : [...b.slice(1, 18), b[17], b[18], b[19]]
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1 -1 22 22"
      role="img"
      aria-label="Seu guia, um robô"
      className={`mascot pixel-bot mascot-${mood}`}
      shapeRendering="crispEdges"
    >
      <path className="bot-frame bot-a" d={toPath(a)} fill="currentColor" />
      <path className="bot-frame bot-b" d={toPath(bUp)} fill="currentColor" />
    </svg>
  )
}

export function mascotMessage(mood: Mood, trained: number, goal: number): string {
  switch (mood) {
    case 'great':
      return 'Que semana! Você está mandando muito bem. Bora manter o ritmo?'
    case 'good':
      return trained >= goal ? 'Meta de treinos batida! Agora capricha na dieta.' : 'Você está indo bem. Mais um treino e a semana fica completa!'
    case 'ok':
      return 'Começando a pegar ritmo. Que tal um treino hoje?'
    default:
      return 'Bateria baixa por aqui… Vamos recarregar com um treino leve?'
  }
}
