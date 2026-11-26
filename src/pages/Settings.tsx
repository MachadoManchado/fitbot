import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../Icon'
import { Card, Page } from '../components'
import { today } from '../db'
import { exportMarkdown } from '../exportMarkdown'
import { deliverFile } from '../share'
import { Backup } from './ProfileCards'
import { ModePicker, SnackPicker } from './Onboarding'
import { savePrefs, usePrefs } from '../hooks'
import { sfx } from '../sfx'

export default function Settings() {
  const navigate = useNavigate()
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const prefs = usePrefs()

  async function exportMd() {
    const md = await exportMarkdown()
    setMsg(await deliverFile(md,`fitness-dados-${today()}.md`, 'text/markdown'))
  }

  return (
    <Page title="Configurações" action={<button type="button" className="link" onClick={() => navigate(-1)}>Voltar</button>}>
      {prefs && (
        <>
          <Card title="Interface">
            <ModePicker value={prefs.mode} onPick={(mode) => void savePrefs({ mode })} />
          </Card>
          <Card title="Lanches por dia">
            <SnackPicker value={prefs.snacks} onPick={(snacks) => void savePrefs({ snacks })} />
          </Card>
          <Card title="Sons e vibração">
            <div className="quiz-alt">
              <button type="button" className={`btn ${prefs.sound ? 'primary' : 'ghost'}`} onClick={() => void savePrefs({ sound: !prefs.sound }).then(() => sfx.tap())}>
                Sons: {prefs.sound ? 'ligados' : 'desligados'}
              </button>
              <button type="button" className={`btn ${prefs.vibrate ? 'primary' : 'ghost'}`} onClick={() => void savePrefs({ vibrate: !prefs.vibrate })}>
                Vibração: {prefs.vibrate ? 'ligada' : 'desligada'}
              </button>
            </div>
            <p className="muted small">A vibração funciona no Android. O iPhone não deixa sites vibrarem.</p>
          </Card>
        </>
      )}

      <Card title="Exportar dados">
        <p className="muted small">
          Junta tudo o que o app registrou (treinos, dieta, besteiras, corpo, fichas e configuração da dieta) num arquivo de texto (.md) fácil de ler.
          Serve para guardar e, se precisar, converter para outros formatos.
        </p>
        <div className="stack-form">
          <button type="button" className="btn primary full" onClick={() => void exportMd()}><Icon name="file-text" size={20} /> Exportar em texto (.md)</button>
          <button type="button" className="btn ghost full" onClick={() => void exportMarkdown().then(setPreview)}>Ver antes de exportar</button>
        </div>
        {msg && <p className="muted small">{msg}</p>}
        {preview !== null && <pre className="md-preview">{preview}</pre>}
      </Card>

      <Backup />

      <Card title="Créditos">
        <p className="muted small">
          Ilustrações dos 302 exercícios: <a className="link" href="https://github.com/bryllim/workout-guide" target="_blank" rel="noreferrer">Workout Guide</a>, de Bryl Lim, baseado no{' '}
          <a className="link" href="https://github.com/everkinetic/data" target="_blank" rel="noreferrer">Everkinetic</a>. Licença{' '}
          <a className="link" href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. No app, o traço é pintado na cor do texto.
        </p>
        <p className="muted small">Ícones: Lucide (ISC) e Tabler Icons (MIT). Fontes: Fixedsys Excelsior (domínio público) e Departure Mono (OFL). Ícones em pixel: pixelarticons (MIT).</p>
      </Card>
    </Page>
  )
}
