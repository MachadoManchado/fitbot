import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../Icon'
import { Card, Page } from '../components'
import { today } from '../db'
import { exportMarkdown } from '../exportMarkdown'
import { deliverFile } from '../share'
import { Backup } from './ProfileCards'

export default function Settings() {
  const navigate = useNavigate()
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  async function exportMd() {
    const md = await exportMarkdown()
    setMsg(await deliverFile(md,`fitness-dados-${today()}.md`, 'text/markdown'))
  }

  return (
    <Page title="Configurações" action={<button type="button" className="link" onClick={() => navigate(-1)}>Voltar</button>}>
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
          Ilustrações de exercícios: <a className="link" href="https://github.com/bryllim/workout-guide" target="_blank" rel="noreferrer">Workout Guide</a>, de Bryl Lim, baseado no{' '}
          <a className="link" href="https://github.com/everkinetic/data" target="_blank" rel="noreferrer">Everkinetic</a>. Licença{' '}
          <a className="link" href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. No app, o traço é pintado na cor do texto.
        </p>
        <p className="muted small">Ícones: Lucide (ISC) e Tabler Icons (MIT). Fontes: Fixedsys Excelsior (domínio público) e Departure Mono (OFL). Ícones em pixel: pixelarticons (MIT).</p>
      </Card>
    </Page>
  )
}
