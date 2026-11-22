import { useLiveQuery } from 'dexie-react-hooks'
import { IconBadge } from '../Icon'
import { Loading } from '../components'
import { useEffect, useRef, useState } from 'react'
import { useGoals, useRecentDays, weekScore } from '../hooks'
import { buildInsights, type Insight } from '../insights'
import Mascot, { mascotMessage } from '../Mascot'

type Msg = { from: 'guide' | 'me'; text: string; icon?: string; title?: string }

const QUESTIONS: { label: string; kind: Insight['kind'] | 'week' }[] = [
  { label: 'Como foi minha semana?', kind: 'week' },
  { label: 'Como estão meus treinos?', kind: 'train' },
  { label: 'E a minha dieta?', kind: 'diet' },
]

/**
 * Chat com o guia. Por enquanto as respostas vêm de regras simples calculadas no aparelho;
 * no futuro, a conversa livre pode usar IA.
 */
export default function Guide() {
  const goals = useGoals()
  const days = useRecentDays(7)
  const insights = useLiveQuery(() => buildInsights(), [])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs])

  if (!days || !insights) return <Loading />
  const s = weekScore(days, goals.workoutsPerWeek)

  function ask(q: (typeof QUESTIONS)[number]) {
    let answers: Msg[]
    if (q.kind === 'week') {
      answers = [
        { from: 'guide', text: `Nota da semana: ${s.score}/100. Foram ${s.trained} de ${goals.workoutsPerWeek} treinos e ${s.followed} refeições na dieta${s.treats ? `, com ${s.treats} besteira(s)` : ''}.` },
        { from: 'guide', text: mascotMessage(s.mood, s.trained, goals.workoutsPerWeek) },
      ]
    } else {
      const list = insights!.filter((i) => i.kind === q.kind)
      answers = list.length
        ? list.map((i) => ({ from: 'guide' as const, icon: i.icon, title: i.title, text: i.text }))
        : [{ from: 'guide', text: q.kind === 'train' ? 'Ainda não tenho treinos suficientes para analisar. Faça uns 2 treinos guiados e me pergunte de novo!' : 'Registre algumas refeições e eu te conto como está indo.' }]
    }
    setMsgs((m) => [...m, { from: 'me', text: q.label }, ...answers])
  }

  const highlights = insights.filter((i) => i.kind === 'general')

  return (
    <div className="page chat">
      <header className="chat-head">
        <Mascot mood={s.mood} size={56} />
        <div>
          <strong>Seu guia</strong>
          <span className="muted small block">Analisa seus dados e te dá dicas</span>
        </div>
      </header>

      <div className="chat-log">
        <Bubble msg={{ from: 'guide', text: mascotMessage(s.mood, s.trained, goals.workoutsPerWeek) }} />
        {highlights.map((i, k) => (
          <Bubble key={`h${k}`} msg={{ from: 'guide', icon: i.icon, title: i.title, text: i.text }} />
        ))}
        {msgs.map((m, k) => (
          <Bubble key={k} msg={m} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="quick-replies">
        {QUESTIONS.map((q) => (
          <button key={q.label} type="button" className="chip" onClick={() => ask(q)}>
            {q.label}
          </button>
        ))}
      </div>
      <p className="muted small center-text">Em breve: conversa livre com IA.</p>
    </div>
  )
}

function Bubble({ msg }: { msg: Msg }) {
  return (
    <div className={`msg ${msg.from}`}>
      {msg.icon && <IconBadge name={msg.icon} size={36} />}
      <div>
        {msg.title && <strong className="block">{msg.title}</strong>}
        <span>{msg.text}</span>
      </div>
    </div>
  )
}
