/**
 * Sons em estilo 8 bits (gerados na hora, sem arquivos) e vibração.
 * A vibração funciona no Android; o iPhone não permite vibração por sites/PWA.
 */
let enabledSound = true
let enabledVibrate = true
let ctx: AudioContext | null = null

export function setSfxPrefs(sound: boolean, vibrate: boolean) {
  enabledSound = sound
  enabledVibrate = vibrate
}

function audio(): AudioContext | null {
  if (!enabledSound) return null
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Toca uma sequência de notas [frequência Hz, duração s]. Onda quadrada = som de videogame antigo. */
function play(notes: [number, number][], volume = 0.06, type: OscillatorType = 'square') {
  const a = audio()
  if (!a) return
  let t = a.currentTime + 0.01
  for (const [freq, dur] of notes) {
    if (freq > 0) {
      const o = a.createOscillator()
      const g = a.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq, t)
      g.gain.setValueAtTime(volume, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(a.destination)
      o.start(t)
      o.stop(t + dur + 0.02)
    }
    t += dur
  }
}

function buzz(pattern: number | number[]) {
  if (!enabledVibrate) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* sem vibração */
  }
}

export const sfx = {
  /** Toque leve em botões. */
  tap() {
    play([[880, 0.03]], 0.035)
    buzz(8)
  },
  /** Copo de água. */
  water() {
    play([[660, 0.05], [990, 0.07]], 0.05, 'triangle')
    buzz(15)
  },
  /** Série concluída. */
  set() {
    play([[523, 0.06], [784, 0.08]])
    buzz(20)
  },
  /** Refeição registrada. */
  meal() {
    play([[523, 0.07], [659, 0.07], [784, 0.12]])
    buzz([20, 40, 20])
  },
  /** Meta batida (água, lanches...). */
  goal() {
    play([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2]])
    buzz([30, 50, 30, 50, 60])
  },
  /** Treino finalizado: fanfarrinha. */
  workout() {
    play([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.15], [659, 0.1], [784, 0.3]])
    buzz([60, 60, 60, 60, 150])
  },
  /** Fim de um cronômetro (série por tempo, bloco do cardio). */
  timer() {
    play([[988, 0.12], [0, 0.06], [988, 0.12], [0, 0.06], [1319, 0.25]])
    buzz([200, 100, 200])
  },
  /** Algo neutro (pulou, fora da dieta). */
  soft() {
    play([[440, 0.06], [392, 0.1]], 0.04, 'triangle')
    buzz(12)
  },
}
