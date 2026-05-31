export async function compressImage(file: File, maxDimension = 600, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('[imageUtils] canvas 2d context unavailable')
        reject(new Error('Canvas not available'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            console.error('[imageUtils] canvas.toBlob returned null')
            reject(new Error('Compression failed'))
          }
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      console.error('[imageUtils] failed to load image for compression')
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}
