interface SpinnerProps {
  size?: 'sm' | 'md'
}

const styles = {
  sm: 'h-4 w-4 animate-spin text-text-muted',
  md: 'h-6 w-6 animate-spin text-text-muted',
}

export default function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles[size]}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
