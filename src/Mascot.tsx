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

/** O que o robô está fazendo (cada atividade tem 2 quadros). */
export type Activity = 'idle' | 'wave' | 'look' | 'laptop' | 'water' | 'flex' | 'sleep'

type Grid = string[][]
const put = (g: Grid, x: number, y: number, on = true) => {
  if (g[y] && x >= 0 && x < 20) g[y][x] = on ? '#' : '.'
}
const row = (g: Grid, y: number, line: string) => (g[y] = line.split(''))
const face = (g: Grid, lines: string[]) => lines.forEach((line, y) => line.split('').forEach((c, x) => (g[4 + y][4 + x] = c)))
/** Tira os braços padrão (diagonais para baixo). */
const noArms = (g: Grid) => [[4, 13], [3, 14], [15, 13], [16, 14]].forEach(([x, y]) => put(g, x, y, false))

function sprite(mood: Mood, frame: 0 | 1, activity: Activity): string[] {
  const g: Grid = BODY.map((r) => r.split(''))
  face(g, FACES[mood])
  const f = frame === 1
  switch (activity) {
    case 'sleep': {
      face(g, FACES.sleepy)
      row(g, 0, f ? '................###.' : '..............###...')
      row(g, 1, f ? '.........##.....#...' : '.........##...#.....')
      row(g, 2, f ? '.........##....###..' : '.........##...###...')
      break
    }
    case 'look': {
      face(g, ['............', f ? '...##....##.' : '.##....##...', f ? '...##....##.' : '.##....##...', '............', '............', '....####....', '............'])
      break
    }
    case 'wave': {
      put(g, 15, 13, false)
      put(g, 16, 14, false)
      put(g, 15, 13)
      put(g, 16, 12)
      // Mão abanando: 3 pixels que inclinam de um lado para o outro.
      if (f) [[17, 11], [18, 10], [19, 9], [18, 9]].forEach(([x, y]) => put(g, x, y))
      else [[17, 11], [17, 10], [17, 9], [16, 9]].forEach(([x, y]) => put(g, x, y))
      face(g, FACES.great)
      break
    }
    case 'water': {
      put(g, 16, 14, false)
      if (!f) {
        ;[[16, 13], [17, 13]].forEach(([x, y]) => put(g, x, y))
        row(g, 10, g[10].join('').slice(0, 17) + '#.#')
        row(g, 11, g[11].join('').slice(0, 17) + '#.#')
        row(g, 12, g[12].join('').slice(0, 17) + '###')
      } else {
        ;[[16, 12], [17, 11]].forEach(([x, y]) => put(g, x, y))
        put(g, 15, 13)
        ;[[18, 9], [19, 9], [18, 10], [19, 10]].forEach(([x, y]) => put(g, x, y))
        put(g, 17, 8)
        face(g, ['............', '............', '..##....##..', '............', '.........###', '............', '............'])
      }
      break
    }
    case 'flex': {
      face(g, FACES.great)
      noArms(g)
      if (f) {
        row(g, 13, '...#..#......#..#...')
        row(g, 14, '....#.#..##..#.#....')
        ;[[2, 12], [3, 12], [4, 12], [15, 12], [16, 12], [17, 12]].forEach(([x, y]) => put(g, x, y))
      } else {
        ;[[4, 13], [3, 14], [15, 13], [16, 14]].forEach(([x, y]) => put(g, x, y))
        ;[[2, 15], [3, 15], [4, 15], [15, 15], [16, 15], [17, 15]].forEach(([x, y]) => put(g, x, y))
      }
      break
    }
    case 'laptop': {
      face(g, ['............', '............', '............', '..##....##..', '............', '.....##.....', '............'])
      row(g, 13, '....#.#......#.#....')
      row(g, 14, '...#.##########.#...')
      row(g, 15, '...#.#........#.#...')
      row(g, 16, '...#.#...##...#.#...')
      row(g, 17, f ? '.....#........#.#...' : '...#.#........#.....')
      row(g, 18, '..################..')
      row(g, 19, '....................')
      if (f) put(g, 9, 16, false)
      break
    }
  }
  return g.map((r) => r.join(''))
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

export default function Mascot({ mood, size = 140, activity, onClick }: { mood: Mood; size?: number; activity?: Activity; onClick?: () => void }) {
  const act: Activity = activity ?? (mood === 'sleepy' ? 'sleep' : mood === 'great' ? 'flex' : 'idle')
  const a = sprite(mood, 0, act)
  const b = sprite(mood, 1, act)
  // Quadro 2 do "parado": o corpo sobe 1 pixel (os pés ficam), um pulinho.
  const bUp = act === 'idle' ? [...b.slice(1, 18), b[17], b[18], b[19]] : b
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1 -1 22 22"
      role="img"
      aria-label="Seu guia, um robô"
      className={`mascot pixel-bot mascot-${mood} act-${act}`}
      onClick={onClick}
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
