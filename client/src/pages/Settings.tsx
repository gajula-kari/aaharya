import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsContext } from '../hooks/useSettingsContext'
import { useInstallContext } from '../hooks/useInstallContext'
import Spinner from '../components/Spinner'

const QUICK_OPTIONS = [5, 7, 10, 15]

const styles = {
  page: 'space-y-4 p-4',
  section: 'rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4',
  sectionTitle: 'text-base font-semibold text-slate',
  sectionSubtitle: 'text-sm text-text-muted',
  rulesList: 'space-y-2',
  ruleItem: 'flex gap-2 text-sm text-text-secondary',
  ruleDot: 'mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neem',
  quickOptions: 'flex flex-wrap gap-2',
  quickOption:
    'rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition hover:border-moss hover:text-moss',
  quickOptionActive: 'border-moss bg-moss text-surface',
  input:
    'w-full rounded-xl border border-border bg-fog px-4 py-3 text-sm text-slate placeholder:text-text-muted transition focus:border-moss focus:outline-none',
  history: 'space-y-1',
  historyText: 'text-xs text-text-muted',
  error: 'text-xs text-overlimit',
  saveButton:
    'w-full rounded-full bg-moss py-3 text-sm font-semibold text-surface transition hover:bg-moss/90 disabled:opacity-50',
  savingContent: 'flex items-center justify-center gap-2',
}

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
  const [goal, setGoal] = useState(() =>
    settings?.monthlyIndulgentLimit != null ? String(settings.monthlyIndulgentLimit) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className={styles.page}>
      <section className={styles.section}>
        <div>
          <h2 className={styles.sectionTitle}>Indulgent Days Limit</h2>
          <p className={styles.sectionSubtitle}>
            Set how many indulgent days you allow yourself per month
          </p>
        </div>

        <div className={styles.quickOptions}>
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setGoal(String(opt))}
              className={`${styles.quickOption} ${goal === String(opt) ? styles.quickOptionActive : ''}`}
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
          className={styles.input}
        />

        {(goalUpdatedAt || previousGoal != null) && (
          <div className={styles.history}>
            {goalUpdatedAt && (
              <p className={styles.historyText}>Last updated: {formatDate(goalUpdatedAt)}</p>
            )}
            {previousGoal != null && (
              <p className={styles.historyText}>Previous goal: {previousGoal} days</p>
            )}
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <button type="button" onClick={handleSave} disabled={saving} className={styles.saveButton}>
          {saving ? (
            <span className={styles.savingContent}>
              <Spinner size="sm" /> Saving
            </span>
          ) : (
            'Save'
          )}
        </button>
      </section>

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
    </div>
  )
}
