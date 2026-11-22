import { IconBadge } from './Icon'
import { MUSCLE_ICONS } from './db'
/**
 * Animação dos exercícios: 3 quadros do Workout Guide (Bryl Lim, baseado em Everkinetic, CC BY-SA 4.0)
 * alternando, no traço original (preto no tema claro, branco no escuro), recortado em volta do desenho.
 * Arquivos em public/exercises/<slug>-<1..3>.svg.
 */

/** Exercício (nome cadastrado no app) → desenho do Workout Guide. */
export const EXERCISE_ANIM: Record<string, string> = {
  'Supino reto': 'bench-press',
  'Supino inclinado com halteres': 'incline-dumbbell-press',
  Crucifixo: 'dumbbell-fly',
  'Flexão de braço': 'push-up',
  'Puxada frontal': 'lat-pulldown',
  'Remada curvada': 'dumbbell-bent-over-row',
  'Remada baixa': 'seated-row',
  'Remada unilateral': 'one-arm-dumbbell-row',
  'Agachamento livre': 'squat',
  'Leg press': 'leg-press',
  'Cadeira extensora': 'leg-extension',
  'Mesa flexora': 'lying-leg-curl',
  'Levantamento terra': 'deadlift',
  Afundo: 'walking-lunge',
  'Panturrilha em pé': 'standing-calf-raise',
  'Desenvolvimento com halteres': 'seated-dumbbell-press',
  'Elevação lateral': 'lateral-raise',
  'Elevação frontal': 'front-raise',
  'Rosca direta': 'bicep-curl',
  'Rosca martelo': 'hammer-curl',
  'Rosca alternada': 'bicep-curl',
  'Tríceps pulley': 'tricep-pushdown',
  'Tríceps francês': 'skull-crusher',
  'Tríceps banco': 'bench-dip',
  'Prancha (segundos)': 'plank',
  'Abdominal supra': 'crunch',
  'Esteira (minutos)': 'running',
  'Bicicleta (minutos)': 'cycling',
}

/** Área onde o desenho realmente está (x, y, largura, altura), medida nos 3 quadros, com uma pequena margem. Serve de zoom automático. */
const CROP: Record<string, [number, number, number, number]> = {
  'bench-dip': [5, 85, 475, 359],
  'bench-press': [0, 20, 483, 511],
  'bicep-curl': [137, 29, 256, 482],
  'crunch': [0, 115, 512, 254],
  'cycling': [69, 0, 359, 512],
  'deadlift': [79, 54, 354, 452],
  'dumbbell-bent-over-row': [110, 5, 301, 503],
  'dumbbell-fly': [19, 7, 453, 503],
  'front-raise': [77, 28, 318, 503],
  'hammer-curl': [137, 31, 234, 479],
  'incline-dumbbell-press': [76, 7, 382, 502],
  'lat-pulldown': [132, 0, 262, 512],
  'lateral-raise': [71, 65, 369, 407],
  'leg-extension': [84, 58, 306, 436],
  'leg-press': [57, 119, 426, 274],
  'lying-leg-curl': [11, 104, 512, 312],
  'one-arm-dumbbell-row': [60, 43, 406, 422],
  'plank': [4, 136, 507, 233],
  'push-up': [55, 160, 410, 234],
  'running': [31, 0, 447, 512],
  'seated-dumbbell-press': [74, 6, 351, 490],
  'seated-row': [62, 107, 467, 338],
  'skull-crusher': [10, 48, 504, 417],
  'squat': [62, 86, 392, 431],
  'standing-calf-raise': [117, 8, 318, 512],
  'tricep-pushdown': [138, 0, 205, 512],
  'walking-lunge': [94, 69, 337, 437],
}

export function animFor(exerciseName?: string): string | undefined {
  return exerciseName ? EXERCISE_ANIM[exerciseName] : undefined
}

const url = (slug: string, i: number) => `${import.meta.env.BASE_URL}exercises/${slug}-${i}.svg`

/** Animação completa (3 quadros alternando) ou só um quadro parado (still). */
export function ExerciseAnim({ slug, still = false, label }: { slug: string; still?: boolean; label?: string }) {
  const frames = still ? [2] : [1, 2, 3]
  return (
    <div className={`ex-anim${still ? ' still' : ''}`} role="img" aria-label={label ? `Animação: ${label}` : 'Animação do exercício'}>
      {frames.map((i) => (
        <svg key={i} className="ex-frame" viewBox={(CROP[slug] ?? [0, 0, 512, 512]).join(' ')} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <image href={url(slug, i)} width="512" height="512" />
        </svg>
      ))}
    </div>
  )
}

/** Miniatura parada do exercício (para listas); sem desenho, mostra o ícone do grupo muscular. */
export function ExerciseThumb({ name, muscle, size = 56 }: { name?: string; muscle?: string; size?: number }) {
  const slug = animFor(name)
  if (!slug) return <IconBadge name={MUSCLE_ICONS[muscle ?? 'Outro'] ?? 'dumbbell'} size={size} />
  return (
    <span className="ex-thumb" style={{ width: size, height: size }}>
      <ExerciseAnim slug={slug} still label={name} />
    </span>
  )
}
