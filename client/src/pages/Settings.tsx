import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsContext } from '../hooks/useSettingsContext'
import { useInstallContext } from '../hooks/useInstallContext'
import { useAuthContext } from '../hooks/useAuthContext'
import Spinner from '../components/Spinner'
import BottomSheet from '../components/BottomSheet'
import { QUICK_OPTIONS } from '../constants'
import { ERROR_MESSAGES } from '../constants/errors'
import type { GoalHistoryEntry } from '../types'

const styles = {
  page: 'space-y-4 px-3 py-4',
  section: 'rounded-lg border border-border bg-surface p-5 shadow-sm space-y-4',
  sectionTitle: 'text-base font-semibold text-slate',
  sectionSubtitle: 'text-sm text-text-muted',
  rulesList: 'space-y-2',
  ruleItem: 'flex gap-2 text-sm text-text-secondary',
  ruleDot: 'mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neem',
  quickOptions: 'flex flex-wrap gap-2',
  quickOptionBase: 'rounded-full border px-4 py-2 text-sm transition',
  quickOption: 'border-border text-text-secondary hover:border-moss hover:text-moss',
  quickOptionActive: 'border-slate bg-slate text-fog',
  input:
    'w-full rounded-xl border border-border bg-fog px-4 py-3 text-sm text-slate placeholder:text-text-muted transition focus:border-moss focus:outline-none',
  history: 'space-y-1',
  historyText: 'text-xs text-text-muted',
  error: 'text-xs text-overlimit',
  saveButton:
    'w-full rounded-full bg-slate py-3 text-sm font-semibold text-fog transition disabled:opacity-50',
  savingContent: 'flex items-center justify-center gap-2',
}

function formatGoalMonth(entry: GoalHistoryEntry): string {
  const [y, m] = entry.month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

export default function Settings() {
  const navigate = useNavigate()
  const { settings, settingsLoading, settingsError, saveSettings } = useSettingsContext()
  const { canInstall, dismissed, install } = useInstallContext()
  const { user, isLoggedIn, isAnonymous, logout } = useAuthContext()
  // null = no unsaved edit (display settings value); any string = user is typing
  const [goalOverride, setGoalOverride] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  const savedGoal =
    settings?.currentMonthlyLimit != null ? String(settings.currentMonthlyLimit) : ''
  // When user hasn't edited, show the saved value (automatically reflects async loads).
  const goal = goalOverride ?? savedGoal
  const hasChanged = goal !== savedGoal

  async function handleSave() {
    const parsed = parseInt(goal, 10)
    if (!parsed || parsed < 1) {
      setError(ERROR_MESSAGES.SETTINGS_INVALID_LIMIT)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await saveSettings(parsed)
      setGoalOverride(null)
    } catch {
      setError(ERROR_MESSAGES.SETTINGS_SAVE_FAILED)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <div>
          <h2 className={styles.sectionTitle}>Indulgent Days Limit</h2>
          <p className={styles.sectionSubtitle}>
            Set how many indulgent days you allow yourself per month
          </p>
        </div>

        {settingsLoading && !settings && (
          <div role="status" aria-label="Loading" className="flex justify-center py-4">
            <Spinner />
          </div>
        )}

        <div className={styles.quickOptions}>
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setGoalOverride(String(opt))}
              className={`${styles.quickOptionBase} ${goal === String(opt) ? styles.quickOptionActive : styles.quickOption}`}
            >
              {opt}
            </button>
          ))}
        </div>

        <input
          type="number"
          min="1"
          value={goal}
          onChange={(e) => setGoalOverride(e.target.value)}
          placeholder="Custom number"
          className={styles.input}
        />

        <p className={styles.historyText}>Changes apply to current month ({currentMonthLabel}).</p>

        {settingsError && <p className={styles.error}>{settingsError}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanged}
          className={styles.saveButton}
        >
          {saving ? (
            <span className={styles.savingContent}>
              <Spinner size="sm" /> Saving
            </span>
          ) : (
            'Save'
          )}
        </button>
      </section>

      {settings?.goalHistory && settings.goalHistory.length >= 1 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Goal History</h2>
          <div className={styles.history}>
            {[...settings.goalHistory].reverse().map((entry) => (
              <p key={entry.month} className={styles.historyText}>
                {formatGoalMonth(entry)} — {entry.goal} days/month
              </p>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <ul className={styles.rulesList}>
          {[
            'One indulgent meal marks the whole day as indulgent.',
            'Your limit counts days, not individual meals.',
            'Days beyond your limit are highlighted in red.',
          ].map((rule) => (
            <li key={rule} className={styles.ruleItem}>
              <span className={styles.ruleDot} />
              {rule}
            </li>
          ))}
        </ul>
      </section>

      {canInstall && dismissed && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Install App</h2>
          <p className={styles.sectionSubtitle}>Add Aaharya to your home screen for quick access</p>
          <button type="button" onClick={install} className={styles.saveButton}>
            Install App
          </button>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>

        {isLoggedIn && (
          <div className="flex items-center justify-between">
            <p className={styles.sectionSubtitle}>{user?.email}</p>
            {!showLogoutConfirm && (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                aria-label="Log out"
                className="p-1 text-text-muted transition hover:opacity-60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {isAnonymous && (
          <>
            <p className={styles.sectionSubtitle}>You're using Aaharya without an account.</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className={styles.saveButton}
            >
              Sign in to sync your data
            </button>
          </>
        )}
      </section>

      {showLogoutConfirm && (
        <BottomSheet onDismiss={() => setShowLogoutConfirm(false)} overlay>
          <div className="flex flex-col gap-4 px-4 pb-8 pt-1">
            <div>
              <p className="text-base font-semibold text-slate">Log out?</p>
              <p className="mt-1 text-sm text-text-muted">
                Your data is saved to your account. Sign back in anytime to access it.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-full border border-border py-3 text-sm font-medium text-slate transition hover:bg-neem/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 rounded-full bg-overlimit py-3 text-sm font-semibold text-surface transition hover:opacity-90 disabled:opacity-50"
              >
                {loggingOut ? (
                  <span className={styles.savingContent}>
                    <Spinner size="sm" /> Logging out…
                  </span>
                ) : (
                  'Log out'
                )}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
