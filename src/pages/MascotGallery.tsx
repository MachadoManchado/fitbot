import { Page } from '../components'
import type { Mood } from '../hooks'
import Mascot, { mascotMessage } from '../Mascot'

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
    </Page>
  )
}
