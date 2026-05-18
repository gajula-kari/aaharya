jest.mock('../config/cloudinary')
import cloudinary from '../config/cloudinary'
import { uploadImage } from './uploadService'

function mockUploadStream(result: { secure_url: string } | null, error: Error | null = null) {
  const stream = { end: jest.fn() }
  ;(cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((_opts: any, cb: any) => {
    process.nextTick(() => cb(error, result))
    return stream as any
  })
  return stream
}

describe('uploadImage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('resolves with the secure_url on success', async () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/aaharya/abc.jpg'
    mockUploadStream({ secure_url: url })

    const result = await uploadImage(Buffer.from('fake-image'))

    expect(result).toBe(url)
  })

  it('calls upload_stream with the aaharya folder and auto quality transformation', async () => {
    mockUploadStream({ secure_url: 'https://example.com/img.jpg' })

    await uploadImage(Buffer.from('fake-image'))

    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'aaharya',
        transformation: expect.arrayContaining([
          expect.objectContaining({ quality: 'auto', fetch_format: 'auto' }),
        ]),
      }),
      expect.any(Function)
    )
  })

  it('pipes the buffer into the stream', async () => {
    const stream = mockUploadStream({ secure_url: 'https://example.com/img.jpg' })
    const buf = Buffer.from('fake-image')

    await uploadImage(buf)

    expect(stream.end).toHaveBeenCalledWith(buf)
  })

  it('rejects when Cloudinary returns an error', async () => {
    mockUploadStream(null, new Error('Cloudinary error'))

    await expect(uploadImage(Buffer.from('fake-image'))).rejects.toThrow('Cloudinary error')
  })

  it('rejects with "Upload failed" when result is null and error is null', async () => {
    mockUploadStream(null, null)

    await expect(uploadImage(Buffer.from('fake-image'))).rejects.toThrow('Upload failed')
  })
})
