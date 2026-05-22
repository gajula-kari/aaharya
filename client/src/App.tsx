import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthContext } from './hooks/useAuthContext'
import { MealProvider } from './context/MealProvider'
import { SettingsProvider } from './context/SettingsProvider'
import { InstallProvider } from './context/InstallProvider'
import ErrorBoundary from './components/ErrorBoundary'
import AppHeader from './components/Header'
import Spinner from './components/Spinner'
import DayDetail from './pages/DayDetail'
import Home from './pages/Home'
import Meals from './pages/Meals'
import Onboard from './pages/Onboard'
import Settings from './pages/Settings'
import TagMeal from './pages/TagMeal'
import Login from './pages/Login'

const styles = {
  main: 'relative mx-auto w-full max-w-[480px] flex-1 flex flex-col overflow-hidden bg-fog sm:rounded-md sm:shadow-md',
  content: 'flex-1 overflow-y-auto overscroll-none',
}

function AuthenticatedApp() {
  return (
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
  )
}

function AppContent() {
  const [isOnboarded, setIsOnboarded] = useState(() => !!localStorage.getItem('aaharya_onboarded'))
  const { isLoggedIn, isSkipped, isLoading } = useAuthContext()

  // Step 1 — onboarding (no auth needed, limit saved to localStorage)
  if (!isOnboarded) {
    return (
      <Routes>
        <Route path="/onboard" element={<Onboard onComplete={() => setIsOnboarded(true)} />} />
        <Route path="*" element={<Navigate to="/onboard" replace />} />
      </Routes>
    )
  }

  // Step 2 — auth check (refresh runs in background during onboarding)
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // Step 3 — login (if not authenticated and not skipped)
  if (!isLoggedIn && !isSkipped) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Step 4 — app
  return (
    <MealProvider>
      <SettingsProvider>
        <InstallProvider>
          <AuthenticatedApp />
        </InstallProvider>
      </SettingsProvider>
    </MealProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <main className={styles.main}>
        <AppContent />
      </main>
    </BrowserRouter>
  )
}
