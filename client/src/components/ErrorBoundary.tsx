import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

const styles = {
  wrapper: 'flex min-h-full items-center justify-center p-6',
  card: 'w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm text-center',
  heading: 'mb-1 text-base font-semibold text-slate',
  message: 'mb-4 text-sm text-text-muted',
  button:
    'rounded-full bg-moss px-4 py-2 text-sm font-semibold text-surface transition hover:bg-moss/90',
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.wrapper}>
          <div className={styles.card}>
            <p className={styles.heading}>Something went wrong</p>
            <p className={styles.message}>{this.state.error.message}</p>
            <button
              type="button"
              className={styles.button}
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
