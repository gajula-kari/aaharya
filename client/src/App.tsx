import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthContext } from './hooks/useAuthContext'
import { MealProvider } from './context/MealProvider'
import { SettingsProvider } from './context/SettingsProvider'
import { InstallProvider } from './context/InstallProvider'
import ErrorBoundary from './components/ErrorBoundary'
import AppHeader from './components/Header'
import OfflineBanner from './components/OfflineBanner'
import Spinner from './components/Spinner'
import Home from './pages/Home'

// Lazy-load non-initial routes to reduce the initial JS bundle
const DayDetail = lazy(() => import('./pages/DayDetail'))
const Meals = lazy(() => import('./pages/Meals'))
const Onboard = lazy(() => import('./pages/Onboard'))
const Settings = lazy(() => import('./pages/Settings'))
const TagMeal = lazy(() => import('./pages/TagMeal'))
const Login = lazy(() => import('./pages/Login'))

const styles = {
  main: 'relative mx-auto w-full max-w-[480px] flex-1 flex flex-col overflow-hidden bg-fog min-h-0 sm:flex-none sm:max-w-[390px] sm:h-[844px] sm:max-h-full sm:rounded-[28px] sm:shadow-2xl sm:[transform:translateZ(0)]',
  content: 'flex-1 overflow-y-auto overscroll-none min-h-0',
  suspense: 'py-16 flex items-center justify-center',
}

function RouteSpinner() {
  return (
    <div className={styles.suspense}>
      <Spinner />
    </div>
  )
}

function AuthenticatedApp() {
  return (
    <>
      <AppHeader />
      <OfflineBanner />
      <div className={styles.content}>
        <ErrorBoundary>
          <Suspense fallback={<RouteSpinner />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tag" element={<TagMeal />} />
              <Route path="/day/:date" element={<DayDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/meals" element={<Meals />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  )
}

function AppContent() {
  const [isOnboarded, setIsOnboarded] = useState(() => !!localStorage.getItem('aaharya_onboarded'))
  const { isLoggedIn, isLoading } = useAuthContext()

  // Step 1 — onboarding (no auth needed, limit saved to localStorage)
  if (!isOnboarded) {
    return (
      <Suspense fallback={<RouteSpinner />}>
        <Routes>
          <Route path="/onboard" element={<Onboard onComplete={() => setIsOnboarded(true)} />} />
          <Route path="*" element={<Navigate to="/onboard" replace />} />
        </Routes>
      </Suspense>
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

  // Step 3 — login (if not authenticated — anonymous users have isLoggedIn = true)
  if (!isLoggedIn) {
    return (
      <Suspense fallback={<RouteSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
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
      <main id="app-shell" className={styles.main}>
        <AppContent />
      </main>
    </BrowserRouter>
  )
}
