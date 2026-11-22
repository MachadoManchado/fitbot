import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, Empty, Stepper, Toast, fmt } from '../components'
import { db, formatDate, today, type BodyLog } from '../db'
import { useGoals } from '../hooks'

type Key = keyof Omit<BodyLog, 'id' | 'date'>
const FIELDS: { key: Key; label: string; unit: string; step: number; start: number }[] = [
  { key: 'weight', label: 'Peso', unit: 'kg', step: 0.1, start: 70 },
  { key: 'waist', label: 'Cintura', unit: 'cm', step: 0.5, start: 80 },
  { key: 'chest', label: 'Peito', unit: 'cm', step: 0.5, start: 95 },
  { key: 'arm', label: 'Braço', unit: 'cm', step: 0.5, start: 32 },
  { key: 'hip', label: 'Quadril', unit: 'cm', step: 0.5, start: 95 },
  { key: 'thigh', label: 'Coxa', unit: 'cm', step: 0.5, start: 55 },
  { key: 'bodyFat', label: 'Gordura', unit: '%', step: 0.5, start: 20 },
]

export default function Body() {
  const goals = useGoals()
  const logs = useLiveQuery(() => db.body.orderBy('date').toArray(), [])
  const [metric, setMetric] = useState<Key>('weight')
  const [values, setValues] = useState<Partial<Record<Key, number>>>({})
  const [showMeasures, setShowMeasures] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [toast, setToast] = useState('')

  // Começa cada valor no último registrado (só ajusta com − e +).
  useEffect(() => {
    if (!logs) return
    setValues((v) => {
      const next = { ...v }
      for (const f of FIELDS) {
        if (next[f.key] !== undefined) continue
        const last = [...logs].reverse().find((l) => l[f.key] !== undefined)
        next[f.key] = (last?.[f.key] as number | undefined) ?? f.start
      }
      return next
    })
  }, [logs])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(t)
  }, [toast])

  if (!logs) return null

  async function save(keys: Key[]) {
    const data: Partial<BodyLog> = {}
    for (const k of keys) data[k] = values[k]
    const date = today()
    const existing = await db.body.where('date').equals(date).first()
    if (existing) await db.body.update(existing.id, data)
    else await db.body.add({ date, ...data })
    setToast('Salvo ✓')
  }

  const field = FIELDS.find((f) => f.key === metric)!
  const series = logs.filter((l) => l[metric] !== undefined).map((l) => ({ date: l.date, value: l[metric] as number }))
  const measures = FIELDS.filter((f) => f.key !== 'weight')

  return (
    <>
      <Card title="Peso de hoje">
        <Stepper label="kg" value={values.weight ?? 70} step={0.1} min={20} onChange={(v) => setValues((s) => ({ ...s, weight: v }))} />
        <button type="button" className="btn primary full" onClick={() => void save(['weight'])}>Salvar peso</button>
      </Card>

      <button type="button" className="link details-toggle" onClick={() => setShowMeasures((s) => !s)} aria-expanded={showMeasures}>
        {showMeasures ? 'Ocultar medidas' : 'Registrar medidas (opcional)'}
      </button>
      {showMeasures && (
        <Card>
          <div className="steppers grid">
            {measures.map((f) => (
              <Stepper key={f.key} label={`${f.label} (${f.unit})`} value={values[f.key] ?? f.start} step={f.step} min={0} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
            ))}
          </div>
          <button type="button" className="btn primary full" onClick={() => void save(measures.map((m) => m.key))}>Salvar medidas</button>
        </Card>
      )}

      <Card title="Evolução">
        <div className="chips">
          {FIELDS.map((f) => (
            <button key={f.key} type="button" className={`chip${metric === f.key ? ' active' : ''}`} onClick={() => setMetric(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        {series.length >= 2 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8, 10) + '/' + d.slice(5, 7)} fontSize={11} stroke="var(--muted)" />
              <YAxis domain={['auto', 'auto']} fontSize={11} stroke="var(--muted)" width={36} />
              <Tooltip labelFormatter={(d) => formatDate(String(d))} formatter={(v) => [`${fmt(Number(v))} ${field.unit}`, field.label]} />
              {metric === 'weight' && goals.targetWeight !== undefined && <ReferenceLine y={goals.targetWeight} stroke="var(--accent-2)" strokeDasharray="4 4" />}
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty>Registre em 2 dias diferentes para ver o gráfico.</Empty>
        )}
      </Card>

      <button type="button" className="link details-toggle" onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory}>
        {showHistory ? 'Ocultar histórico' : 'Ver histórico'}
      </button>
      {showHistory && (
        <ul className="list card">
          {logs.length === 0 && <li className="muted">Nenhum registro ainda.</li>}
          {[...logs].reverse().map((l) => (
            <li key={l.id} className="row">
              <span>
                {formatDate(l.date)}
                <span className="muted small block">
                  {FIELDS.filter((f) => l[f.key] !== undefined).map((f) => `${f.label} ${fmt(l[f.key] as number)}${f.unit === '%' ? '%' : ' ' + f.unit}`).join(' · ')}
                </span>
              </span>
              <button type="button" className="icon-btn" aria-label="Apagar registro" onClick={() => confirm('Apagar este registro?') && void db.body.delete(l.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {toast && <Toast>{toast}</Toast>}
    </>
  )
}
