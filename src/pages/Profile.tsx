import { Link, useNavigate } from 'react-router-dom'
import { IconBadge } from '../Icon'
import { Page } from '../components'
import BodySection from './Body'
import { GoalsForm } from './ProfileCards'

/** Perfil: corpo (peso e medidas), metas e acesso às configurações. */
export default function Profile() {
  const navigate = useNavigate()
  return (
    <Page title="Perfil" action={<button type="button" className="link" onClick={() => navigate(-1)}>Voltar</button>}>
      <BodySection />
      <GoalsForm />
      <Link to="/configuracoes" className="big-btn">
        <IconBadge name="settings" size={48} tone="neutral" />
        <span>
          Configurações
          <span className="muted small block">Exportar dados e backup</span>
        </span>
      </Link>
    </Page>
  )
}
