import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const styles = {
  wrapper: 'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center gap-2',
  buttonRow: 'flex items-center gap-3',
  cameraButton:
    'flex items-center gap-2 whitespace-nowrap rounded-full bg-moss px-6 py-3.5 text-sm font-semibold text-fog shadow-2xl shadow-moss/25 transition hover:bg-moss/90',
  galleryButton:
    'rounded-full border border-border bg-surface p-3.5 text-moss shadow-lg transition hover:bg-fog',
  hiddenInput: 'hidden',
}

export default function AddMealFAB() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'gallery') {
    const file = e.target.files?.[0]
    if (file) navigate('/tag', { state: { image: file, source } })
  }

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(e, 'camera')}
        className={styles.hiddenInput}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'gallery')}
        className={styles.hiddenInput}
      />
      <div className={styles.wrapper}>
        <div className={styles.buttonRow}>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className={styles.cameraButton}
          >
            <CameraIcon /> Add Meal
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            aria-label="Choose from gallery"
            className={styles.galleryButton}
          >
            <GalleryIcon />
          </button>
        </div>
      </div>
    </>
  )
}

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function GalleryIcon() {
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}
