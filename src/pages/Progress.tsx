import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, Empty, Page, fmt } from '../components'
import { useWater } from '../hooks'
import { db, estimate1RM, formatDate, ON_DIET, shiftDate, today } from '../db'

export default function Progress() {
  return (
    <Page title="Progresso" action={<Link to="/perfil" className="link">Perfil</Link>}>
      <StrengthChart />
      <DurationChart />
      <DietChart />
      <WaterChart />
    </Page>
  )
}

const tickDate = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7)

function StrengthChart() {
  const [exId, setExId] = useState<number | null>(null)
  const used = useLiveQuery(async () => {
    const sets = await db.sets.toArray()
    const ids = [...new Set(sets.map((s) => s.exerciseId))]
    return (await db.exercises.bulkGet(ids)).filter((e) => e !== undefined).sort((a, b) => a.name.localeCompare(b.name))
  }, [])
  const current = exId ?? used?.[0]?.id ?? null

  const data = useLiveQuery(async () => {
    if (current === null) return []
    const sets = await db.sets.where('exerciseId').equals(current).toArray()
    const workouts = await db.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))])
    const byDate = new Map<string, { best: number; top: number }>()
    for (const s of sets) {
      const w = workouts.find((x) => x?.id === s.workoutId)
      if (!w) continue
      const prev = byDate.get(w.date) ?? { best: 0, top: 0 }
      byDate.set(w.date, { best: Math.max(prev.best, estimate1RM(s.weight, s.reps)), top: Math.max(prev.top, s.weight) })
    }
    return [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, v]) => ({ date, ...v }))
  }, [current])

  return (
    <Card title="Força">
      {used && used.length > 0 ? (
        <>
          <div className="chips">
            {used.map((e) => (
              <button key={e.id} type="button" className={`chip${e.id === current ? ' active' : ''}`} onClick={() => setExId(e.id)}>
                {e.name}
              </button>
            ))}
          </div>
          {data && data.length >= 2 ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tickFormatter={tickDate} fontSize={11} stroke="var(--muted)" />
                  <YAxis domain={['auto', 'auto']} fontSize={11} stroke="var(--muted)" width={36} />
                  <Tooltip labelFormatter={(d) => formatDate(String(d))} formatter={(v, n) => [`${fmt(Number(v))} kg`, n === 'best' ? '1RM estimado' : 'Maior carga']} />
                  <Line type="monotone" dataKey="best" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="top" stroke="var(--accent-2)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="muted small">Verde: força estimada. Laranja: maior carga do dia.</p>
            </div>
          ) : (
            <Empty>Faça este exercício em 2 dias para ver a evolução.</Empty>
          )}
        </>
      ) : (
        <Empty>Faça um treino para acompanhar sua força.</Empty>
      )}
    </Card>
  )
}

function DurationChart() {
  const data = useLiveQuery(async () => {
    const ws = (await db.workouts.orderBy('date').toArray()).filter((w) => w.startedAt && w.endedAt).slice(-12)
    return ws.map((w) => ({ date: w.date, min: Math.round((w.endedAt! - w.startedAt!) / 60000) }))
  }, [])
  return (
    <Card title="Tempo de treino">
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tickFormatter={tickDate} fontSize={11} stroke="var(--muted)" />
            <YAxis fontSize={11} stroke="var(--muted)" width={36} />
            <Tooltip labelFormatter={(d) => formatDate(String(d))} formatter={(v) => [`${v} min`, 'Duração']} />
            <Bar dataKey="min" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Empty>Os treinos guiados registram o horário de início e fim automaticamente.</Empty>
      )}
    </Card>
  )
}

function DietChart() {
  const data = useLiveQuery(async () => {
    const end = today()
    const start = shiftDate(end, -13)
    const [logs, treats] = await Promise.all([
      db.mealLogs.where('date').between(start, end, true, true).toArray(),
      db.treats.where('date').between(start, end, true, true).toArray(),
    ])
    return Array.from({ length: 14 }, (_, i) => {
      const date = shiftDate(start, i)
      const day = logs.filter((l) => l.date === date)
      return {
        date,
        dieta: day.filter((l) => ON_DIET.includes(l.status)).length,
        fora: day.filter((l) => !ON_DIET.includes(l.status)).length,
        besteiras: treats.filter((t) => t.date === date).length,
      }
    })
  }, [])
  const any = data?.some((d) => d.dieta + d.fora + d.besteiras > 0)
  const names: Record<string, string> = { dieta: 'Na dieta', fora: 'Fora / pulou', besteiras: 'Besteiras' }
  const totalTreats = data?.reduce((s, d) => s + d.besteiras, 0) ?? 0
  return (
    <Card title="Dieta – últimos 14 dias">
      {any ? (
        <>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8, 10)} fontSize={11} stroke="var(--muted)" />
              <YAxis allowDecimals={false} fontSize={11} stroke="var(--muted)" width={36} />
              <Tooltip labelFormatter={(d) => formatDate(String(d))} formatter={(v, n) => [v, names[String(n)] ?? n]} />
              <Bar dataKey="dieta" stackId="a" fill="var(--accent)" />
              <Bar dataKey="fora" stackId="a" fill="var(--surface-2)" />
              <Bar dataKey="besteiras" stackId="a" fill="var(--accent-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="muted small">Verde: na dieta · cinza: fora ou pulou · laranja: besteiras ({totalTreats} no período).</p>
        </>
      ) : (
        <Empty>Registre refeições para ver aqui.</Empty>
      )}
    </Card>
  )
}


function WaterChart() {
  const water = useWater(today())
  const data = useLiveQuery(async () => {
    const end = today()
    const start = shiftDate(end, -13)
    const logs = await db.water.where('date').between(start, end, true, true).toArray()
    return Array.from({ length: 14 }, (_, i) => {
      const date = shiftDate(start, i)
      return { date, litros: logs.filter((l) => l.date === date).reduce((s, l) => s + l.ml, 0) / 1000 }
    })
  }, [])
  const any = data?.some((d) => d.litros > 0)
  const top = Math.ceil(Math.max(water ? water.goal / 1000 : 2, ...(data ?? []).map((d) => d.litros)) * 1.15 * 2) / 2
  return (
    <Card title="Água – últimos 14 dias">
      {any ? (
        <>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8, 10)} fontSize={11} stroke="var(--muted)" />
              <YAxis fontSize={11} stroke="var(--muted)" width={36} domain={[0, top]} allowDataOverflow />
              <Tooltip labelFormatter={(d) => formatDate(String(d))} formatter={(v) => [`${fmt(Number(v), 2)} L`, 'Água']} />
              {water && <ReferenceLine y={water.goal / 1000} stroke="var(--blue)" strokeDasharray="4 4" />}
              <Bar dataKey="litros" fill="var(--blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="muted small">Linha tracejada: sua meta de hoje{water ? ` (${fmt(water.goal / 1000, 2)} L)` : ''}.</p>
        </>
      ) : (
        <Empty>Registre a água na aba Dieta para ver aqui.</Empty>
      )}
    </Card>
  )
}
