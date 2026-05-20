import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthProvider'
import { MealProvider } from './context/MealProvider'
import { SettingsProvider } from './context/SettingsProvider'
import { InstallProvider } from './context/InstallProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <MealProvider>
        <SettingsProvider>
          <InstallProvider>
            <App />
          </InstallProvider>
        </SettingsProvider>
      </MealProvider>
    </AuthProvider>
  </StrictMode>
)
