import { compressImage } from './imageUtils'

function makeFile() {
  return new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
}

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('compressImage', () => {
  it('rejects when canvas context is unavailable', async () => {
    class MockImage {
      width = 100
      height = 100
      onload: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      set src(_: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', MockImage)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: () => null } as unknown as HTMLElement
      }
      return document.createElement(tag)
    })

    await expect(compressImage(makeFile())).rejects.toThrow('Canvas not available')
  })

  it('rejects when the image fails to load', async () => {
    class MockImage {
      onload: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      set src(_: string) {
        queueMicrotask(() => this.onerror?.(new Event('error')))
      }
    }
    vi.stubGlobal('Image', MockImage)

    await expect(compressImage(makeFile())).rejects.toBeInstanceOf(Event)
  })

  it('rejects when toBlob returns null', async () => {
    class MockImage {
      width = 100
      height = 100
      onload: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      set src(_: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', MockImage)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toBlob: (cb: (b: Blob | null) => void) => cb(null),
        }
        return canvas as unknown as HTMLElement
      }
      return document.createElement(tag)
    })

    await expect(compressImage(makeFile())).rejects.toThrow('Compression failed')
  })

  it('resolves with a Blob on success', async () => {
    class MockImage {
      width = 200
      height = 100
      onload: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      set src(_: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', MockImage)
    const fakeBlob = new Blob(['compressed'], { type: 'image/jpeg' })
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toBlob: (cb: (b: Blob | null) => void) => cb(fakeBlob),
        } as unknown as HTMLElement
      }
      return document.createElement(tag)
    })

    const result = await compressImage(makeFile())
    expect(result).toBe(fakeBlob)
  })
})
