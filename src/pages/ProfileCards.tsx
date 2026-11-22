import { useState } from 'react'
import { deliverFile } from '../share'
import { Card, Stepper } from '../components'
import { exportBackup, importBackup, today } from '../db'
import { saveGoals, useGoals, useWater } from '../hooks'

export function GoalsForm() {
  const goals = useGoals()
  const water = useWater(today())
  const liters = (goals.waterMl ?? water?.goal ?? 2000) / 1000
  return (
    <Card title="Metas">
      <div className="steppers">
        <Stepper label="Treinos por semana" value={goals.workoutsPerWeek} step={1} min={1} onChange={(v) => void saveGoals({ ...goals, workoutsPerWeek: Math.min(7, v) })} />
        <Stepper label="Peso meta (kg)" value={goals.targetWeight ?? 70} step={0.5} min={30} onChange={(v) => void saveGoals({ ...goals, targetWeight: v })} />
        <Stepper label="Água por dia (L)" value={liters} step={0.25} min={1} onChange={(v) => void saveGoals({ ...goals, waterMl: Math.round(v * 1000) })} />
      </div>
      <p className="muted small">
        {goals.waterMl === undefined
          ? `Água automática: cerca de 33 ml por kg do seu peso${water?.weight ? ` (${water.weight} kg)` : ''}, +500 ml em dia de treino.`
          : 'Água definida por você.'}{' '}
        {goals.waterMl !== undefined && (
          <button type="button" className="link small" onClick={() => void saveGoals({ ...goals, waterMl: undefined })}>
            Voltar para automática
          </button>
        )}
      </p>
    </Card>
  )
}

export function Backup() {
  const [msg, setMsg] = useState('')

  async function download() {
    setMsg(await deliverFile(await exportBackup(), `fitness-backup-${today()}.json`, 'application/json'))
  }

  async function restore(file: File) {
    if (!confirm('Restaurar substitui TODOS os dados atuais pelos do arquivo. Continuar?')) return
    try {
      await importBackup(await file.text())
      setMsg('Dados restaurados.')
    } catch (e) {
      setMsg(`Erro: ${(e as Error).message}`)
    }
  }

  return (
    <Card title="Backup para restaurar (.json)">
      <p className="muted small">Os dados ficam só neste aparelho. Este arquivo serve para restaurar tudo dentro do app (num celular novo, por exemplo). Faça de vez em quando.</p>
      <div className="inline-form">
        <button type="button" className="btn primary" onClick={() => void download()}>Baixar backup</button>
        <label className="btn ghost">
          Restaurar
          <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && void restore(e.target.files[0])} />
        </label>
      </div>
      {msg && <p className="muted small">{msg}</p>}
    </Card>
  )
}
