import type { Activity } from './Mascot'
import type { Mood } from './hooks'

/** O que o robô sabe sobre o seu dia para escolher o que dizer e o que fazer. */
export interface BotContext {
  hour: number
  mood: Mood
  trainedWeek: number
  goalWeek: number
  trainedToday: boolean
  activeWorkout: boolean
  waterDrunk: number
  waterGoal: number
  lastWaterMin: number | null // minutos desde o último copo
  mealsToday: number
  mealsExpected: number
  nextMeal: string
  nextMealLogged: boolean
  treatsToday: number
  daysSinceWorkout: number | null
}

export interface BotLine {
  text: string
  activity: Activity
}

/**
 * Monta as falas possíveis agora (da mais urgente para a mais leve).
 * A home mostra uma de cada vez e troca a cada poucos segundos ou ao tocar no robô.
 */
export function botLines(c: BotContext): BotLine[] {
  const out: BotLine[] = []
  const waterPct = c.waterGoal ? c.waterDrunk / c.waterGoal : 0
  const night = c.hour >= 23 || c.hour < 6

  if (night) out.push({ text: pick(['Zzz… Já é tarde. Dormir bem também é treino.', 'Hora de recarregar a bateria. Boa noite!']), activity: 'sleep' })
  if (c.activeWorkout) out.push({ text: 'Tem um treino em andamento. Bora terminar?', activity: 'flex' })

  // Água
  if (waterPct >= 1) out.push({ text: pick(['Meta de água batida! Tô até brilhando.', 'Hidratação em dia. Boa!']), activity: 'water' })
  else if (c.lastWaterMin !== null && c.lastWaterMin < 10) out.push({ text: pick(['Glub glub! Valeu pela água.', 'Isso! Mais um copo pra conta.']), activity: 'water' })
  else if (c.hour >= 10 && waterPct < Math.min(1, (c.hour - 7) / 14) - 0.2)
    out.push({ text: pick(['Precisando de mais água por aqui…', 'Tô meio seco. Um copo d’água?', 'Bora beber água? Toca em +ÁGUA.']), activity: 'look' })

  // Treino
  if (c.trainedToday) out.push({ text: pick(['Treino de hoje feito! Agora é descansar e comer bem.', 'Mandou bem no treino hoje!']), activity: 'flex' })
  else if (c.trainedWeek >= c.goalWeek) out.push({ text: 'Meta de treinos da semana batida. Descanso também conta!', activity: 'wave' })
  else if (c.daysSinceWorkout !== null && c.daysSinceWorkout >= 3)
    out.push({ text: `Faz ${c.daysSinceWorkout} dias sem treino. Que tal um leve hoje?`, activity: 'look' })
  else if (!night && c.hour >= 6) out.push({ text: `Faltam ${c.goalWeek - c.trainedWeek} treino(s) pra meta da semana.`, activity: 'laptop' })

  // Comida
  if (!night && !c.nextMealLogged) out.push({ text: `Já comeu ${artigo(c.nextMeal)} ${c.nextMeal.toLowerCase()}? Toca em COMER.`, activity: 'look' })
  if (c.mealsToday >= c.mealsExpected) out.push({ text: 'Todas as refeições do dia na dieta. Caprichou!', activity: 'wave' })
  if (c.treatsToday > 0) out.push({ text: 'Uma besteira não estraga nada. O que conta é o resto da semana.', activity: 'idle' })

  // Gerais (pelo humor da semana)
  const general: Record<Mood, string[]> = {
    great: ['Que semana! Bora manter o ritmo?', 'Bateria cheia por aqui!'],
    good: ['Você está indo bem. Constância vence!', 'Tô anotando tudo aqui no meu notebook.'],
    ok: ['Começando a pegar ritmo. Um passo por dia.', 'Cada copo d’água e cada treino contam.'],
    sleepy: ['Bateria baixa… Vamos recarregar com um treino leve?', 'Recomeçar também vale. Que tal hoje?'],
  }
  for (const t of general[c.mood]) out.push({ text: t, activity: c.mood === 'sleepy' ? 'sleep' : t.includes('notebook') ? 'laptop' : 'idle' })
  return out
}

function pick(list: string[]): string {
  // Varia por dia (não muda a cada render, mas muda de um dia para o outro).
  return list[new Date().getDate() % list.length]
}

function artigo(meal: string): string {
  return meal === 'Ceia' ? 'a' : 'o'
}
