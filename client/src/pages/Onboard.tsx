import { useState } from 'react'
import Spinner from '../components/Spinner'
import { useSettingsContext } from '../hooks/useSettingsContext'
import { QUICK_OPTIONS } from '../constants'
import { ERROR_MESSAGES } from '../constants/errors'
const DEFAULT_LIMIT = 7
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Fake states for the demo calendar on screen 4.
// Days 1–2 are absent (shows as empty/border). Days after today show as future (faded).
const DEMO_STATES: Record<number, 'clean' | 'indulgent' | 'overlimit'> = {
  3: 'clean',
  4: 'clean',
  5: 'clean',
  6: 'indulgent',
  7: 'clean',
  8: 'clean',
  9: 'indulgent',
  10: 'clean',
  11: 'clean',
  12: 'overlimit',
  13: 'clean',
  14: 'clean',
  15: 'clean',
  16: 'indulgent',
  17: 'clean',
  18: 'clean',
  19: 'clean',
  20: 'indulgent',
  21: 'overlimit',
  22: 'clean',
  23: 'clean',
  24: 'clean',
}

function getMonthStartOffset(): number {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
  return (firstDay + 6) % 7 // Mon = 0, Sun = 6
}

function DemoCalendar() {
  const today = new Date()
  const todayNum = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const offset = getMonthStartOffset()

  function getDayClasses(day: number): string {
    const isToday = day === todayNum
    const isFuture = day > todayNum
    const ring = isToday ? 'ring-2 ring-moss ring-offset-1' : ''

    if (isFuture) return `text-text-disabled opacity-20 ${ring}`

    const state = DEMO_STATES[day]
    if (!state) return `border border-[0.5px] border-border bg-surface text-text-muted ${ring}`
    if (state === 'clean') return `bg-clean text-clean-text ${ring}`
    if (state === 'indulgent') return `bg-indulgent text-surface ${ring}`
    return `bg-overlimit text-surface ${ring}`
  }

  return (
    <div>
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((label) => (
            <div key={label} className="py-1 text-center text-[9px] font-normal text-text-disabled">
              {label}
            </div>
          ))}
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`offset-${i}`} />
          ))}
          {days.map((day) => (
            <div
              key={day}
              className={`flex aspect-square items-center justify-center rounded-xl text-xs font-semibold ${getDayClasses(day)}`}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <LegendRow
          bgClass="bg-clean border border-clean"
          textClass="text-clean-text"
          label="Logged clean — all meals clean"
        />
        <LegendRow bgClass="bg-indulgent" label="Indulgent — had at least one indulgent meal" />
        <LegendRow bgClass="bg-overlimit" label="Over limit — exceeded monthly budget" />
        <LegendRow empty label="Empty — nothing logged yet" />
      </div>
    </div>
  )
}

function LegendRow({
  bgClass,
  textClass: _textClass,
  empty,
  label,
}: {
  bgClass?: string
  textClass?: string
  empty?: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`h-4 w-4 shrink-0 rounded-sm ${empty ? 'border border-border bg-surface' : bgClass}`}
      />
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  )
}

const btn =
  'w-full rounded-full bg-moss py-3.5 text-sm font-semibold text-surface transition hover:bg-moss/90 disabled:opacity-50'

function LeafIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

function Screen1({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-12">
        <img src="/aaharya-icon.svg" alt="Aaharya" className="h-24 w-24 rounded-3xl" />
        <div className="space-y-3 text-center">
          <h1 className="font-fraunces text-3xl font-normal leading-tight text-slate">
            Eating out more
            <br />
            than you planned?
          </h1>
          <p className="text-sm text-text-secondary">It adds up without you noticing.</p>
        </div>
      </div>
      <button type="button" onClick={onNext} className={btn}>
        Let's fix that →
      </button>
    </div>
  )
}

function Screen2({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="space-y-2 text-center">
          <h1 className="font-fraunces text-3xl font-normal leading-tight text-slate">
            Stay aware of
            <br />
            indulgent meals
          </h1>
          <p className="text-sm text-text-secondary">
            No calories, no complexity.
            <br />
            Tag each meal — clean or indulgent. That's it.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            <span className="text-moss">
              <LeafIcon />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate">Clean day</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                All meals logged clean. No indulgence.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            <span className="text-indulgent">
              <FlameIcon />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate">Indulgent day</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Even one indulgent meal marks the whole day.
              </p>
            </div>
          </div>
        </div>
      </div>
      <button type="button" onClick={onNext} className={btn}>
        Makes sense →
      </button>
    </div>
  )
}

function Screen3({
  limit,
  onChange,
  onSetLimit,
  onSkip,
  saving,
  error,
}: {
  limit: number
  onChange: (n: number) => void
  onSetLimit: () => void
  onSkip: () => void
  saving: boolean
  error: string | null
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end">
        <button type="button" onClick={onSkip} className="text-xs text-text-muted">
          Skip for now
        </button>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="space-y-2 text-center">
          <h1 className="font-fraunces text-3xl font-normal leading-tight text-slate">
            Set your monthly limit
          </h1>
          <p className="text-sm text-text-secondary">
            How many indulgent days do you allow yourself per month?
          </p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="font-fraunces text-5xl font-bold text-slate">{limit}</span>
          <span className="text-sm text-text-secondary">days per month</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <input
              type="range"
              min={1}
              max={30}
              value={limit}
              onChange={(e) => onChange(parseInt(e.target.value, 10))}
              className="w-full onboard-slider"
            />
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>1</span>
              <span>30</span>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`h-9 w-9 rounded-full border text-sm font-medium transition ${
                  limit === opt
                    ? 'border-moss bg-moss text-surface'
                    : 'border-border text-text-secondary'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-center text-xs text-text-muted">
          You can change this anytime in Settings.
        </p>
        <button type="button" onClick={onSetLimit} disabled={saving} className={btn}>
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" /> Setting up…
            </span>
          ) : (
            'Set limit'
          )}
        </button>
        {error && <p className="text-center text-xs text-overlimit">{error}</p>}
      </div>
    </div>
  )
}

function Screen4({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-2 text-center">
          <h1 className="font-fraunces text-3xl font-normal leading-tight text-slate">
            Your month at a glance
          </h1>
          <p className="text-sm text-text-secondary">
            The calendar shows every day. Tap any day to see what you logged.
          </p>
        </div>
        <div className="mt-8">
          <DemoCalendar />
        </div>
      </div>
      <button type="button" onClick={onComplete} className={`mt-4 ${btn}`}>
        Start logging →
      </button>
    </div>
  )
}

export default function Onboard({ onComplete }: { onComplete: () => void }) {
  const { saveSettings } = useSettingsContext()
  const [step, setStep] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSetLimit() {
    setSaving(true)
    setSaveError(null)
    try {
      await saveSettings(limit)
      localStorage.setItem('aaharya_onboarded', 'true')
      setStep(3)
    } catch {
      setSaveError(ERROR_MESSAGES.ONBOARD_SAVE_FAILED)
      setSaving(false)
    }
  }

  function handleSkip() {
    localStorage.setItem('aaharya_onboarded', 'true')
    setStep(3)
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <div className="mb-8 flex justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-moss' : 'w-1.5 bg-neem'
            }`}
          />
        ))}
      </div>

      {step === 0 && <Screen1 onNext={() => setStep(1)} />}
      {step === 1 && <Screen2 onNext={() => setStep(2)} />}
      {step === 2 && (
        <Screen3
          limit={limit}
          onChange={setLimit}
          onSetLimit={handleSetLimit}
          onSkip={handleSkip}
          saving={saving}
          error={saveError}
        />
      )}
      {step === 3 && <Screen4 onComplete={onComplete} />}
    </div>
  )
}
