import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import DayDetail from './pages/DayDetail'
import Home from './pages/Home'
import MealsByTag from './pages/MealsByTag'
import Onboard from './pages/Onboard'
import Settings from './pages/Settings'
import TagMeal from './pages/TagMeal'

const styles = {
  main: 'mx-auto w-full max-w-[480px] flex-1 bg-fog sm:rounded-md sm:shadow-md',
  backBar: 'px-4 pt-3 pb-1',
  backButton: 'flex items-center gap-1.5 p-1 text-text-secondary transition hover:text-slate',
  backLabel: 'text-sm',
}

function BackBar() {
  const location = useLocation()
  const navigate = useNavigate()

  if (location.pathname === '/' || location.pathname === '/tag') return null

  return (
    <div className={styles.backBar}>
      <button
        type="button"
        aria-label="Back to home"
        onClick={() => navigate('/', { replace: true })}
        className={styles.backButton}
      >
        <ChevronLeftIcon />
        <span className={styles.backLabel}>Home</span>
      </button>
    </div>
  )
}

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(() => !!localStorage.getItem('aaharya_onboarded'))

  return (
    <BrowserRouter>
      <main className={styles.main}>
        {!isOnboarded ? (
          <Routes>
            <Route path="/onboard" element={<Onboard onComplete={() => setIsOnboarded(true)} />} />
            <Route path="*" element={<Navigate to="/onboard" replace />} />
          </Routes>
        ) : (
          <>
            <Header />
            <BackBar />
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/tag" element={<TagMeal />} />
                <Route path="/day/:date" element={<DayDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/meals/:tag" element={<MealsByTag />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </>
        )}
      </main>
    </BrowserRouter>
  )
}
