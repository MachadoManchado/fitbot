import { useEffect, useState, type ReactNode } from 'react'
import { formatDate, shiftDate, today } from './db'

export function Page({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="page">
      <header className="page-head">
        <h1>{title}</h1>
        {action}
      </header>
      {children}
    </div>
  )
}

export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card">
      {(title || action) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  return (
    <div className="date-picker">
      <button type="button" className="icon-btn" aria-label="Dia anterior" onClick={() => onChange(shiftDate(value, -1))}>
        ‹
      </button>
      <label className="date-label">
        <span>{value === today() ? 'Hoje' : formatDate(value)}</span>
        <input type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="Escolher data" />
      </label>
      <button
        type="button"
        className="icon-btn"
        aria-label="Próximo dia"
        disabled={value >= today()}
        onClick={() => onChange(shiftDate(value, 1))}
      >
        ›
      </button>
    </div>
  )
}

/** Botões − e + para ajustar um número sem digitar. */
export function Stepper({ label, value, step, min = 0, onChange }: { label: string; value: number; step: number; min?: number; onChange: (v: number) => void }) {
  const round = (v: number) => Math.round(v * 100) / 100
  return (
    <div className="stepper">
      <span className="stepper-label muted small">{label}</span>
      <div className="stepper-row">
        <button type="button" className="step-btn" aria-label={`Menos ${label}`} onClick={() => onChange(Math.max(min, round(value - step)))}>
          −
        </button>
        <span className="stepper-value">{fmt(value)}</span>
        <button type="button" className="step-btn" aria-label={`Mais ${label}`} onClick={() => onChange(round(value + step))}>
          +
        </button>
      </div>
    </div>
  )
}

/** Painel que sobe de baixo, com opções em botões. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="card-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="toast" role="status">
      {children}
    </div>
  )
}

/** Mostrado enquanto os dados carregam; se demorar, oferece recarregar (nunca tela vazia). */
export function Loading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 3000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="page fullscreen center">
      <p className="muted">Carregando…</p>
      {slow && (
        <button type="button" className="btn primary" onClick={() => location.reload()}>
          Demorando? Recarregar
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

export function fmt(n: number | undefined, digits = 1): string {
  if (n === undefined || Number.isNaN(n)) return '–'
  return n.toLocaleString('pt-BR', { maximumFractionDigits: digits })
}

export function numOrUndef(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}
