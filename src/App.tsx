import { useEffect, useRef, useState } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { usePrefs } from './hooks'
import { setSfxPrefs, sfx } from './sfx'
import Onboarding from './pages/Onboarding'
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

/** O toque começou em algo que já usa o gesto de arrastar (campo, lista que rola para o lado, painel)? */
function blocksSwipe(el: EventTarget | null): boolean {
  let n = el as HTMLElement | null
  while (n && n !== document.body) {
    if (n.matches('input, textarea, select, .sheet, .no-swipe, .recharts-wrapper')) return true
    const ox = getComputedStyle(n).overflowX
    if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 2) return true
    n = n.parentElement
  }
  return false
}

function Shell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const prefs = usePrefs()
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  const [slide, setSlide] = useState('')
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  useEffect(() => {
    if (prefs) setSfxPrefs(prefs.sound, prefs.vibrate)
  }, [prefs])
  const full = FULLSCREEN.some((r) => r.test(pathname))
  const tabIndex = TABS.findIndex((t) => t.to === pathname)

  if (prefs && !prefs.onboarded) return <main className="app no-tabbar"><Onboarding /></main>

  // Deslizar o dedo para o lado troca de aba (como nos apps de celular).
  const onTouchStart = (e: React.TouchEvent) => {
    start.current = tabIndex >= 0 && !blocksSwipe(e.target) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s0 = start.current
    start.current = null
    if (!s0) return
    const dx = e.changedTouches[0].clientX - s0.x
    const dy = e.changedTouches[0].clientY - s0.y
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - s0.t > 700) return
    const next = TABS[tabIndex + (dx < 0 ? 1 : -1)]
    if (!next) return
    setSlide(dx < 0 ? 'slide-left' : 'slide-right')
    sfx.tap()
    navigate(next.to)
  }

  return (
    <>
      <main className={`app${full ? ' no-tabbar' : ''} ${slide}`} key={tabIndex >= 0 ? pathname : undefined} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onAnimationEnd={() => setSlide('')}>
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
