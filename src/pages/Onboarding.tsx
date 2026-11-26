import { useState } from 'react'
import { FoodIcon, PixelIcon } from '../Icon'
import Mascot from '../Mascot'
import { savePrefs } from '../hooks'
import { sfx } from '../sfx'
import type { UiMode } from '../db'

export const MODES: { mode: UiMode; title: string; text: string; example: React.ReactNode }[] = [
  {
    mode: 'simples',
    title: 'Simples',
    text: 'Só toca no que comeu e no treino que fez. Sem números.',
    example: (
      <span className="mode-example">
        <FoodIcon value="🍚" size={22} /> Arroz
      </span>
    ),
  },
  {
    mode: 'detalhada',
    title: 'Detalhada',
    text: 'Também marca quanto comeu: 2 fatias, 1 concha, 1 unidade…',
    example: (
      <span className="mode-example">
        <FoodIcon value="🍚" size={22} /> Arroz <b>− 2 conchas +</b>
      </span>
    ),
  },
  {
    mode: 'completa',
    title: 'Completa',
    text: 'Quantidades com calorias prováveis e mais números no treino.',
    example: (
      <span className="mode-example">
        <FoodIcon value="🍚" size={22} /> 2 conchas <b>~260 kcal</b>
      </span>
    ),
  },
]

/** Botões para escolher a interface (usado na primeira abertura e nas configurações). */
export function ModePicker({ value, onPick }: { value?: UiMode; onPick: (m: UiMode) => void }) {
  return (
    <div className="mode-list">
      {MODES.map((m) => (
        <button
          key={m.mode}
          type="button"
          className={`mode-card${value === m.mode ? ' picked' : ''}`}
          onClick={() => {
            sfx.tap()
            onPick(m.mode)
          }}
        >
          {m.mode === 'simples' && (
            <span className="mode-badge">
              <PixelIcon name="star" size={14} /> Recomendada para iniciantes
            </span>
          )}
          <strong>{m.title}</strong>
          <span className="muted small">{m.text}</span>
          {m.example}
        </button>
      ))}
    </div>
  )
}

/** Quantos lanches por dia (1, 2 ou 3). */
export function SnackPicker({ value, onPick }: { value: number; onPick: (n: number) => void }) {
  return (
    <div className="quiz-alt snack-picker">
      {[1, 2, 3].map((n) => (
        <button key={n} type="button" className={`btn ${value === n ? 'primary' : 'ghost'}`} onClick={() => onPick(n)}>
          {n} {n === 1 ? 'lanche' : 'lanches'}
        </button>
      ))}
    </div>
  )
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<UiMode>('simples')
  const [snacks, setSnacks] = useState(1)

  return (
    <div className="page fullscreen onboarding">
      <div className="onb-bot">
        <Mascot mood="great" size={110} activity={step === 0 ? 'wave' : 'look'} />
      </div>
      {step === 0 ? (
        <>
          <h1>Oi! Eu sou o FitBot.</h1>
          <p className="muted">Como você prefere usar o app? Dá para trocar depois nas configurações.</p>
          <ModePicker value={mode} onPick={setMode} />
          <button type="button" className="btn primary full" onClick={() => setStep(1)}>Continuar</button>
        </>
      ) : (
        <>
          <h1>Quantos lanches por dia?</h1>
          <p className="muted">Assim eu sei quando o lanche do dia está completo.</p>
          <SnackPicker value={snacks} onPick={setSnacks} />
          <button
            type="button"
            className="btn primary full"
            onClick={() => {
              sfx.goal()
              void savePrefs({ onboarded: true, mode, snacks })
            }}
          >
            Começar
          </button>
          <button type="button" className="link" onClick={() => setStep(0)}>← Voltar</button>
        </>
      )}
    </div>
  )
}
