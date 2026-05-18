import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import AppHeader from './components/Header'
import DayDetail from './pages/DayDetail'
import Home from './pages/Home'
import Meals from './pages/Meals'
import Onboard from './pages/Onboard'
import Settings from './pages/Settings'
import TagMeal from './pages/TagMeal'

const styles = {
  main: 'relative mx-auto w-full max-w-[480px] flex-1 flex flex-col overflow-hidden bg-fog sm:rounded-md sm:shadow-md',
  content: 'flex-1 overflow-y-auto overscroll-none',
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
            <AppHeader />
            <div className={styles.content}>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/tag" element={<TagMeal />} />
                  <Route path="/day/:date" element={<DayDetail />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/meals" element={<Meals />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </div>
          </>
        )}
      </main>
    </BrowserRouter>
  )
}
