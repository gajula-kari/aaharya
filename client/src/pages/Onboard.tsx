import { useState } from 'react'
import Spinner from '../components/Spinner'
import { useSettingsContext } from '../hooks/useSettingsContext'

const QUICK_OPTIONS = [5, 7, 10, 12]

const SCREENS = [
  {
    title: 'Eating out more than you planned?',
    subtitle: 'It adds up without you noticing.',
  },
  {
    title: 'Stay aware of indulgent meals',
    subtitle: 'Track when you go off track — no calories, no complexity.',
  },
  {
    title: 'Set your monthly limit',
    subtitle: 'How many indulgent days do you allow yourself per month?',
  },
]

const styles = {
  page: 'flex min-h-full flex-col px-6 py-10',
  content: 'flex flex-1 flex-col justify-center gap-6',
  title: 'font-fraunces text-3xl font-bold leading-tight text-slate',
  subtitle: 'text-sm leading-relaxed text-text-secondary',
  inputSection: 'space-y-4',
  quickOptions: 'flex flex-wrap gap-2',
  quickOption:
    'rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition hover:border-moss hover:text-moss',
  quickOptionActive: 'border-moss bg-moss text-surface',
  input:
    'w-full rounded-xl border border-border bg-fog px-4 py-3 text-sm text-slate placeholder:text-text-muted transition focus:border-moss focus:outline-none',
  hint: 'text-xs text-text-muted',
  footer: 'space-y-4',
  stepIndicator: 'flex justify-center gap-2',
  stepDot: 'h-1.5 w-6 rounded-full transition',
  stepActive: 'bg-moss',
  stepInactive: 'bg-neem',
  button:
    'w-full rounded-full bg-moss py-3 text-sm font-semibold text-surface transition hover:bg-moss/90 disabled:opacity-50',
  savingContent: 'flex items-center justify-center gap-2',
}

export default function Onboard({ onComplete }: { onComplete: () => void }) {
  const { saveSettings } = useSettingsContext()
  const [step, setStep] = useState(0)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleStart() {
    const parsed = parseInt(value, 10)
    if (!parsed || parsed < 1) return
    setSaving(true)
    try {
      await saveSettings(parsed)
      localStorage.setItem('aaharya_onboarded', 'true')
      onComplete()
    } catch {
      setSaving(false)
    }
  }

  const screen = SCREENS[step]

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div>
          <h1 className={styles.title}>{screen.title}</h1>
          <p className={styles.subtitle}>{screen.subtitle}</p>
        </div>

        {step === 2 && (
          <div className={styles.inputSection}>
            <div className={styles.quickOptions}>
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setValue(String(opt))}
                  className={`${styles.quickOption} ${value === String(opt) ? styles.quickOptionActive : ''}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Custom number"
              className={styles.input}
            />
            <p className={styles.hint}>You can update this in settings later</p>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <StepIndicator step={step} />

        {step < SCREENS.length - 1 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className={styles.button}>
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={!value || parseInt(value, 10) < 1 || saving}
            className={styles.button}
          >
            {saving ? (
              <span className={styles.savingContent}>
                <Spinner size="sm" /> Setting up…
              </span>
            ) : (
              'Get Started'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className={styles.stepIndicator}>
      {SCREENS.map((_, i) => (
        <div
          key={i}
          className={`${styles.stepDot} ${i === step ? styles.stepActive : styles.stepInactive}`}
        />
      ))}
    </div>
  )
}
