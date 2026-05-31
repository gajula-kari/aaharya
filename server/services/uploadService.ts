import cloudinary from '../config/cloudinary'

export async function uploadImage(buffer: Buffer): Promise<string> {
  console.log('[cloudinary] upload started, bytes:', buffer.length)
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER ?? 'aaharya/prod',
        transformation: [{ width: 600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error || !result) {
          console.error('[cloudinary] upload error:', error?.message ?? 'no result returned')
          return reject(error ?? new Error('Upload failed'))
        }
        console.log('[cloudinary] upload success, public_id:', result.public_id)
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}
