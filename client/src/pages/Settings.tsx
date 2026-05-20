import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsContext } from '../hooks/useSettingsContext'
import { useInstallContext } from '../hooks/useInstallContext'
import { useAuthContext } from '../hooks/useAuthContext'
import Spinner from '../components/Spinner'

const QUICK_OPTIONS = [5, 7, 10, 15]

function formatDate(ts: number | null | undefined): string | null {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('default', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Settings() {
  const navigate = useNavigate()
  const { settings, saveSettings } = useSettingsContext()
  const { canInstall, dismissed, install } = useInstallContext()
  const { user, logout } = useAuthContext()
  const [goal, setGoal] = useState(() =>
    settings?.monthlyIndulgentLimit != null ? String(settings.monthlyIndulgentLimit) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  const previousGoal = settings?.previousGoal
  const goalUpdatedAt = settings?.goalUpdatedAt

  async function handleSave() {
    const parsed = parseInt(goal, 10)
    if (!parsed || parsed < 1) {
      setError('Please enter a valid number')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await saveSettings(parsed)
      navigate('/', { replace: true })
    } catch {
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Indulgent Days Limit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Set how many indulgent days you allow yourself per month
        </p>

        <div className="mt-4 flex gap-2">
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setGoal(String(opt))}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition
                ${
                  goal === String(opt)
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <input
          type="number"
          min="1"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Custom number"
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
        />

        {(goalUpdatedAt || previousGoal != null) && (
          <div className="mt-4 space-y-1 text-xs text-slate-400">
            {goalUpdatedAt && <p>Last updated: {formatDate(goalUpdatedAt)}</p>}
            {previousGoal != null && <p>Previous goal: {previousGoal} days</p>}
          </div>
        )}

        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" /> Saving
            </span>
          ) : (
            'Save'
          )}
        </button>
      </section>
      {canInstall && dismissed && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Install App</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add Aaharya to your home screen for quick access
          </p>
          <button
            type="button"
            onClick={install}
            className="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Install App
          </button>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Account</h2>
        <p className="mt-1 text-sm text-slate-500">{user?.email}</p>

        {showLogoutConfirm ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-600">Log out? You'll need to sign in again.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 rounded-2xl bg-rose-500 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
              >
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="mt-4 text-sm font-medium text-rose-500 hover:text-rose-600"
          >
            Log out
          </button>
        )}
      </section>
    </div>
  )
}
