import { useEffect, useRef, useState } from 'react'
import { Toast } from './components'
import { CUP_ML, db, today } from './db'
import { useWater } from './hooks'

const fmtL = (ml: number) => `${(ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`

/** Registro de água do dia: um toque por copo, gotinhas enchendo até a meta. */
export default function WaterCard({ date = today() }: { date?: string }) {
  const w = useWater(date)
  const [toast, setToast] = useState('')
  const reached = useRef<boolean | null>(null)

  useEffect(() => {
    if (!w) return
    const now = w.drunk >= w.goal
    if (reached.current === false && now) setToast('Meta de água batida!')
    reached.current = now
  }, [w])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  if (!w) return null
  const cups = Math.round(w.goal / CUP_ML)
  const filled = Math.floor(w.drunk / CUP_ML)
  const add = (ml: number) => void db.water.add({ date, ml, time: Date.now() })
  const undo = () => {
    const last = w.logs[w.logs.length - 1]
    if (last) void db.water.delete(last.id)
  }

  return (
    <section className="water-card" aria-label="Água do dia">
      <div className="water-head">
        <span className="food-emoji" style={{ fontSize: 30 }} aria-hidden="true">💧</span>
        <div>
          <strong>Água</strong>
          <span className="muted small block">
            {fmtL(w.drunk)} de {fmtL(w.goal)}
            {w.drunk >= w.goal ? ' · meta batida!' : ` · faltam ${Math.ceil((w.goal - w.drunk) / CUP_ML)} copo(s)`}
          </span>
        </div>
      </div>

      <div className="water-drops" aria-hidden="true">
        {Array.from({ length: Math.max(cups, filled) }, (_, i) => (
          <span key={i} className={`drop${i < filled ? ' full' : ''}${i >= cups ? ' extra' : ''}`} />
        ))}
      </div>

      <div className="water-actions">
        <button type="button" className="btn primary water-btn" onClick={() => add(CUP_ML)}>+ Copo<small>250 ml</small></button>
        <button type="button" className="btn ghost" onClick={() => add(500)}>+ Garrafa<small>500 ml</small></button>
      </div>
      {w.logs.length > 0 && (
        <button type="button" className="link small" onClick={undo}>Desfazer último</button>
      )}
      {toast && <Toast>{toast}</Toast>}
    </section>
  )
}
