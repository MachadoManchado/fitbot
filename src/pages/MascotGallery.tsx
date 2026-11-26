import { Page } from '../components'
import type { Mood } from '../hooks'
import Mascot, { mascotMessage, type Activity } from '../Mascot'

const ACTS: { act: Activity; label: string }[] = [
  { act: 'idle', label: 'Parado' },
  { act: 'wave', label: 'Acenando' },
  { act: 'look', label: 'Olhando' },
  { act: 'laptop', label: 'No notebook' },
  { act: 'water', label: 'Bebendo água' },
  { act: 'flex', label: 'Malhando' },
  { act: 'sleep', label: 'Dormindo' },
]

const MOODS: { mood: Mood; label: string }[] = [
  { mood: 'great', label: 'Muito feliz' },
  { mood: 'good', label: 'Contente' },
  { mood: 'ok', label: 'Neutro' },
  { mood: 'sleepy', label: 'Sono (bateria baixa)' },
]

/** Vitrine do mascote em todos os humores (tela escondida: #/mascote). */
export default function MascotGallery() {
  return (
    <Page title="Mascote">
      <div className="tile-grid">
        {MOODS.map((m) => (
          <div key={m.mood} className="tile mascot-tile">
            <Mascot mood={m.mood} size={130} />
            <strong>{m.label}</strong>
            <span className="muted small">{mascotMessage(m.mood, 1, 3)}</span>
          </div>
        ))}
      </div>
      <h2 className="section-title">Atividades</h2>
      <div className="tile-grid">
        {ACTS.map((a) => (
          <div key={a.act} className="tile mascot-tile">
            <Mascot mood="good" size={110} activity={a.act} />
            <strong>{a.label}</strong>
          </div>
        ))}
      </div>
    </Page>
  )
}
