import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TagMeal from './TagMeal'
import { ERROR_MESSAGES } from '../constants/errors'

vi.mock('../hooks/useMealContext')
vi.mock('exifr', () => ({ default: { parse: vi.fn().mockResolvedValue(null) } }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useLocation: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

import { useMealContext } from '../hooks/useMealContext'
import { useLocation, useNavigate } from 'react-router-dom'
import exifr from 'exifr'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useMealContext).mockReturnValue({
    meals: [],
    loading: false,
    error: null,
    addMeal: vi.fn(),
    updateMeal: vi.fn(),
    deleteMeal: vi.fn(),
    refetch: vi.fn(),
    loadedMonths: new Set<string>(),
    fetchMonth: vi.fn(),
  })
})

describe('TagMeal', () => {
  it('redirects to / when no image is in location state', () => {
    vi.mocked(useLocation).mockReturnValue({
      state: null,
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )

    expect(screen.queryByText('Tag Meal')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clean' })).not.toBeInTheDocument()
  })

  it('does not render the tagging form when there is no image', () => {
    vi.mocked(useLocation).mockReturnValue({
      state: null,
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: 'Clean' })).not.toBeInTheDocument()
  })
})

describe('TagMeal with image', () => {
  class MockFileReader {
    result: string | ArrayBuffer | null = null
    onload: ((ev: Event) => void) | null = null

    readAsDataURL(_url: string): void {
      this.result = 'data:image/jpeg;base64,fake'
      queueMicrotask(() => this.onload?.(new Event('load')))
    }
  }

  beforeEach(() => {
    vi.stubGlobal('FileReader', MockFileReader)
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
      loadedMonths: new Set<string>(),
      fetchMonth: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function imageFile() {
    return new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
  }

  it('renders Clean and Indulgent tag buttons plus Save Meal once the preview loads', async () => {
    vi.mocked(useLocation).mockReturnValue({
      state: { image: imageFile() },
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )

    await screen.findByAltText('Meal')

    expect(screen.getByRole('button', { name: 'Clean' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Indulgent' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Meal' })).toBeInTheDocument()
  })

  it('calls addMeal with CLEAN tag when Clean is selected and navigates back', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    const addMeal = vi.fn().mockResolvedValue({})
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal,
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
      loadedMonths: new Set<string>(),
      fetchMonth: vi.fn(),
    })
    vi.mocked(useLocation).mockReturnValue({
      state: { image: imageFile() },
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )
    await screen.findByAltText('Meal')

    await userEvent.click(screen.getByRole('button', { name: 'Clean' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Meal' }))

    expect(addMeal).toHaveBeenCalledWith(expect.objectContaining({ tag: 'CLEAN' }))
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('uses noon of dateFromState as occurredAt when coming from a past day', async () => {
    const addMeal = vi.fn().mockResolvedValue({})
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal,
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
      loadedMonths: new Set<string>(),
      fetchMonth: vi.fn(),
    })
    vi.mocked(useLocation).mockReturnValue({
      state: { image: imageFile(), date: '2024-06-15' },
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )
    await screen.findByAltText('Meal')

    await userEvent.click(screen.getByRole('button', { name: 'Indulgent' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Meal' }))

    expect(addMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        tag: 'INDULGENT',
        occurredAt: new Date(2024, 5, 15, 12, 0, 0, 0).getTime(),
      })
    )
  })

  it('navigates back after tagging', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    const addMeal = vi.fn().mockResolvedValue({})
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal,
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
      loadedMonths: new Set<string>(),
      fetchMonth: vi.fn(),
    })
    vi.mocked(useLocation).mockReturnValue({
      state: { image: imageFile(), date: '2024-06-15' },
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )
    await screen.findByAltText('Meal')

    await userEvent.click(screen.getByRole('button', { name: 'Clean' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Meal' }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('shows a save error when addMeal throws', async () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn().mockRejectedValue(new Error('Network error')),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
      loadedMonths: new Set<string>(),
      fetchMonth: vi.fn(),
    })
    vi.mocked(useLocation).mockReturnValue({
      state: { image: imageFile() },
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )
    await screen.findByAltText('Meal')

    await userEvent.click(screen.getByRole('button', { name: 'Clean' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Meal' }))

    expect(await screen.findByText(ERROR_MESSAGES.SAVE_MEAL_FAILED)).toBeInTheDocument()
  })

  it('maps a known server error pattern to the correct friendly message', async () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn().mockRejectedValue(new Error('Meal not found')),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
      loadedMonths: new Set<string>(),
      fetchMonth: vi.fn(),
    })
    vi.mocked(useLocation).mockReturnValue({
      state: { image: imageFile() },
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )
    await screen.findByAltText('Meal')

    await userEvent.click(screen.getByRole('button', { name: 'Clean' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Meal' }))

    expect(await screen.findByText(ERROR_MESSAGES.MEAL_NOT_FOUND)).toBeInTheDocument()
  })

  it('Back button navigates back when image is present', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useLocation).mockReturnValue({
      state: { image: imageFile() },
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('Back button navigates back when coming from a specific day', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useLocation).mockReturnValue({
      state: { image: imageFile(), date: '2024-06-15' },
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('shows a friendly fallback when addMeal throws a non-Error value', async () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn().mockRejectedValue('plain string error'),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
      loadedMonths: new Set<string>(),
      fetchMonth: vi.fn(),
    })
    vi.mocked(useLocation).mockReturnValue({
      state: { image: imageFile() },
      pathname: '/tag',
      search: '',
      hash: '',
      key: 'default',
    })

    render(
      <MemoryRouter>
        <TagMeal />
      </MemoryRouter>
    )
    await screen.findByAltText('Meal')

    await userEvent.click(screen.getByRole('button', { name: 'Clean' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Meal' }))

    expect(await screen.findByText(ERROR_MESSAGES.SAVE_MEAL_FAILED)).toBeInTheDocument()
  })

  describe('time controls', () => {
    function loc(state: object) {
      return { state, pathname: '/tag', search: '', hash: '', key: 'default' }
    }

    it('auto-fills time and shows "tap to edit" for camera source', async () => {
      vi.mocked(useLocation).mockReturnValue(loc({ image: imageFile(), source: 'camera' }))
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')
      expect(screen.getByText(/tap to edit/)).toBeInTheDocument()
    })

    it('auto-fills time and shows "tap to edit" for gallery source when EXIF is absent', async () => {
      vi.mocked(useLocation).mockReturnValue(loc({ image: imageFile(), source: 'gallery' }))
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')
      expect(await screen.findByText(/tap to edit/)).toBeInTheDocument()
    })

    it('auto-fills time from EXIF and shows "tap to edit" for gallery with metadata', async () => {
      vi.mocked(exifr.parse).mockResolvedValueOnce({
        DateTimeOriginal: new Date(2024, 0, 15, 14, 30),
      })
      vi.mocked(useLocation).mockReturnValue(loc({ image: imageFile(), source: 'gallery' }))
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      expect(await screen.findByText(/tap to edit/)).toBeInTheDocument()
    })

    it('reveals time input when "tap to edit" chip is clicked', async () => {
      vi.mocked(useLocation).mockReturnValue(loc({ image: imageFile(), source: 'camera' }))
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')
      await userEvent.click(screen.getByText(/tap to edit/))
      expect(document.querySelector('input[type="time"]')).toBeInTheDocument()
    })

    it('reveals time input when time chip is clicked for gallery source', async () => {
      vi.mocked(useLocation).mockReturnValue(loc({ image: imageFile(), source: 'gallery' }))
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByText(/tap to edit/)
      await userEvent.click(screen.getByText(/tap to edit/))
      expect(document.querySelector('input[type="time"]')).toBeInTheDocument()
    })

    it('dismisses picker and shows time chip after a time is selected', async () => {
      vi.mocked(useLocation).mockReturnValue(loc({ image: imageFile(), source: 'gallery' }))
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByText(/tap to edit/)
      await userEvent.click(screen.getByText(/tap to edit/))
      const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement
      fireEvent.change(timeInput, { target: { value: '14:30' } })
      expect(document.querySelector('input[type="time"]')).not.toBeInTheDocument()
      expect(screen.queryByText('+ Add time')).not.toBeInTheDocument()
    })

    it('closing the picker via blur hides the time input', async () => {
      vi.mocked(useLocation).mockReturnValue(loc({ image: imageFile(), source: 'gallery' }))
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByText(/tap to edit/)
      await userEvent.click(screen.getByText(/tap to edit/))
      const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement
      fireEvent.blur(timeInput)
      expect(document.querySelector('input[type="time"]')).not.toBeInTheDocument()
    })

    it('shows "Change" retake button for gallery source', async () => {
      vi.mocked(useLocation).mockReturnValue(loc({ image: imageFile(), source: 'gallery' }))
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')
      expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument()
    })

    it('allows typing into amount and note fields', async () => {
      vi.mocked(useLocation).mockReturnValue(loc({ image: imageFile(), source: 'gallery' }))
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')

      const amountInput = screen.getByPlaceholderText('Amount spent')
      await userEvent.type(amountInput, '200')
      expect(amountInput).toHaveValue(200)

      const noteInput = screen.getByPlaceholderText('Add a note')
      await userEvent.type(noteInput, 'Good meal')
      expect(noteInput).toHaveValue('Good meal')
    })

    it('does not show time controls when editing an existing meal', async () => {
      vi.mocked(useLocation).mockReturnValue(
        loc({
          meal: {
            id: 'e1',
            tag: 'CLEAN',
            imageUrl: 'https://example.com/img.jpg',
            note: null,
            amountSpent: null,
            occurredAt: new Date(2024, 0, 15, 12, 0).getTime(),
          },
        })
      )
      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')
      expect(screen.queryByText(/tap to edit/)).not.toBeInTheDocument()
      expect(screen.queryByText('+ Add time')).not.toBeInTheDocument()
    })
  })

  describe('camera source occurredAt', () => {
    it('uses mounted-time hours/minutes for occurredAt when source is camera and no selectedTime override', async () => {
      const beforeMs = Date.now()
      const addMeal = vi.fn().mockResolvedValue({})
      vi.mocked(useMealContext).mockReturnValue({
        meals: [],
        loading: false,
        error: null,
        addMeal,
        updateMeal: vi.fn(),
        deleteMeal: vi.fn(),
        refetch: vi.fn(),
        loadedMonths: new Set<string>(),
        fetchMonth: vi.fn(),
      })
      vi.mocked(useLocation).mockReturnValue({
        // source=camera pre-fills selectedTime, so clear it by using gallery
        // Actually camera sets selectedTime at init. We test that occurredAt is close to now.
        state: { image: imageFile(), source: 'camera' },
        pathname: '/tag',
        search: '',
        hash: '',
        key: 'default',
      })

      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')

      await userEvent.click(screen.getByRole('button', { name: 'Clean' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save Meal' }))

      const afterMs = Date.now()
      expect(addMeal).toHaveBeenCalledWith(expect.objectContaining({ tag: 'CLEAN' }))
      const { occurredAt } = addMeal.mock.calls[0][0]
      // occurredAt should be within the same minute window as the test run
      expect(occurredAt).toBeGreaterThanOrEqual(beforeMs - 60_000)
      expect(occurredAt).toBeLessThanOrEqual(afterMs + 60_000)
    })
  })

  describe('handleDismiss', () => {
    it('calls handleCancel (navigate(-1)) when dismissArea is clicked on an existing meal', async () => {
      const navigate = vi.fn()
      vi.mocked(useNavigate).mockReturnValue(navigate)
      vi.mocked(useLocation).mockReturnValue({
        state: {
          meal: {
            id: 'e1',
            tag: 'CLEAN',
            imageUrl: 'https://example.com/img.jpg',
            note: null,
            amountSpent: null,
            occurredAt: new Date(2024, 0, 15, 12, 0).getTime(),
          },
        },
        pathname: '/tag',
        search: '',
        hash: '',
        key: 'default',
      })

      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')

      // The dismissArea is a div above the sheet — find it by its style attribute
      const dismissArea = document.querySelector('[style*="bottom"]') as HTMLElement
      expect(dismissArea).not.toBeNull()
      fireEvent.click(dismissArea)

      expect(navigate).toHaveBeenCalledWith(-1)
    })
  })

  describe('touch drag handlers', () => {
    it('handles touchStart, touchMove and touchEnd on the drag handle without throwing', async () => {
      vi.mocked(useLocation).mockReturnValue({
        state: { image: imageFile(), source: 'camera' },
        pathname: '/tag',
        search: '',
        hash: '',
        key: 'default',
      })

      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')

      const handle = screen.getByLabelText('Drag to adjust')
      expect(handle).toBeInTheDocument()

      fireEvent.touchStart(handle, { touches: [{ clientY: 100 }] })
      fireEvent.touchMove(handle, { touches: [{ clientY: 120 }] })
      fireEvent.touchEnd(handle, { changedTouches: [] })
      // No assertion needed — just verifying it doesn't throw
    })
  })

  describe('handleNewPhoto', () => {
    it('updates the image when a new file is selected via the hidden camera input', async () => {
      vi.mocked(useLocation).mockReturnValue({
        state: { image: imageFile(), source: 'camera' },
        pathname: '/tag',
        search: '',
        hash: '',
        key: 'default',
      })

      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')

      // There are two hidden file inputs — the camera one (with capture) and gallery one
      const fileInputs = document.querySelectorAll('input[type="file"]')
      const cameraInput = Array.from(fileInputs).find((el) =>
        el.hasAttribute('capture')
      ) as HTMLInputElement
      expect(cameraInput).not.toBeNull()

      const newFile = new File(['newimg'], 'new.jpg', { type: 'image/jpeg' })
      fireEvent.change(cameraInput, { target: { files: [newFile] } })

      // Preview should update — the image alt is still present (FileReader mock triggers)
      expect(await screen.findByAltText('Meal')).toBeInTheDocument()
    })
  })

  describe('edit meal flow', () => {
    function existingMealLoc(overrides?: object) {
      return {
        state: {
          meal: {
            id: 'e1',
            tag: 'CLEAN',
            imageUrl: 'https://example.com/img.jpg',
            note: null,
            amountSpent: null,
            occurredAt: new Date(2024, 0, 15, 12, 0).getTime(),
            ...overrides,
          },
        },
        pathname: '/tag',
        search: '',
        hash: '',
        key: 'default',
      }
    }

    it('calls updateMeal when saving an existing meal', async () => {
      const navigate = vi.fn()
      vi.mocked(useNavigate).mockReturnValue(navigate)
      const updateMeal = vi.fn().mockResolvedValue({})
      vi.mocked(useMealContext).mockReturnValue({
        meals: [],
        loading: false,
        error: null,
        addMeal: vi.fn(),
        updateMeal,
        deleteMeal: vi.fn(),
        refetch: vi.fn(),
        loadedMonths: new Set<string>(),
        fetchMonth: vi.fn(),
      })
      vi.mocked(useLocation).mockReturnValue(existingMealLoc())

      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')

      await userEvent.click(screen.getByRole('button', { name: 'Indulgent' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

      expect(updateMeal).toHaveBeenCalledWith('e1', expect.objectContaining({ tag: 'INDULGENT' }))
      expect(navigate).toHaveBeenCalledWith(-1)
    })

    it('shows error when updateMeal throws', async () => {
      vi.mocked(useMealContext).mockReturnValue({
        meals: [],
        loading: false,
        error: null,
        addMeal: vi.fn(),
        updateMeal: vi.fn().mockRejectedValue(new Error('Update failed')),
        deleteMeal: vi.fn(),
        refetch: vi.fn(),
        loadedMonths: new Set<string>(),
        fetchMonth: vi.fn(),
      })
      vi.mocked(useLocation).mockReturnValue(existingMealLoc())

      render(
        <MemoryRouter>
          <TagMeal />
        </MemoryRouter>
      )
      await screen.findByAltText('Meal')

      await userEvent.click(screen.getByRole('button', { name: 'Indulgent' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

      expect(await screen.findByText(ERROR_MESSAGES.SAVE_MEAL_FAILED)).toBeInTheDocument()
    })
  })
})
