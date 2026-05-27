import { render, screen } from '@testing-library/react'
import OfflineBanner from './OfflineBanner'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

vi.mock('../hooks/useOnlineStatus')

describe('OfflineBanner', () => {
  it('renders nothing when online', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true)
    const { container } = render(<OfflineBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders banner when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('No connection')).toBeInTheDocument()
  })

  it('banner has aria-live polite', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})
