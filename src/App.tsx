import { useEffect } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { PixelIcon } from './Icon'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import MascotGallery from './pages/MascotGallery'
import TreatLog from './pages/TreatLog'
import Diet from './pages/Diet'
import DietEditor from './pages/DietEditor'
import Exercises from './pages/Exercises'
import Guide from './pages/Guide'
import Home from './pages/Home'
import MealLog from './pages/MealLog'
import PlanEditor from './pages/PlanEditor'
import Progress from './pages/Progress'
import Session from './pages/Session'
import StartWorkout from './pages/StartWorkout'
import WorkoutDetail from './pages/WorkoutDetail'
import Workouts from './pages/Workouts'

const TABS = [
  { to: '/guia', label: 'Guia', icon: <PixelIcon name="comment" />, end: false },
  { to: '/dieta', label: 'Dieta', icon: <PixelIcon name="apple" />, end: false },
  { to: '/', label: 'Início', icon: <PixelIcon name="home" />, end: true },
  { to: '/treinos', label: 'Treinos', icon: <PixelIcon name="dumbbell" />, end: false },
  { to: '/progresso', label: 'Progresso', icon: <PixelIcon name="chart-bar-big" />, end: false },
]

// Telas de tela cheia (sem a barra de abas), para foco total.
const FULLSCREEN = [/^\/sessao/, /^\/treinar/, /^\/refeicao\//, /^\/besteira/]

function Shell() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const full = FULLSCREEN.some((r) => r.test(pathname))

  return (
    <>
      <main className={`app${full ? ' no-tabbar' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guia" element={<Guide />} />
          <Route path="/treinos" element={<Workouts />} />
          <Route path="/treinos/:id" element={<WorkoutDetail />} />
          <Route path="/treinar" element={<StartWorkout />} />
          <Route path="/sessao" element={<Session />} />
          <Route path="/fichas/:id" element={<PlanEditor />} />
          <Route path="/exercicios" element={<Exercises />} />
          <Route path="/dieta" element={<Diet />} />
          <Route path="/dieta/editar" element={<DietEditor />} />
          <Route path="/refeicao/:meal" element={<MealLog />} />
          <Route path="/corpo" element={<Navigate to="/perfil" replace />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/mascote" element={<MascotGallery />} />
          <Route path="/besteira" element={<TreatLog />} />
          <Route path="/progresso" element={<Progress />} />
        </Routes>
      </main>
      {!full && (
        <nav className="tabbar" aria-label="Navegação principal">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab${isActive ? ' active' : ''}${t.to === '/' ? ' home-tab' : ''}`}>
              <span className="tab-icon" aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
