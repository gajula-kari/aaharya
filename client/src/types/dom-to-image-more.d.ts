declare module 'dom-to-image-more' {
  interface Options {
    width?: number
    height?: number
    style?: Record<string, string>
    quality?: number
    pixelRatio?: number
    cacheBust?: boolean
    imagePlaceholder?: string
    canvasWidth?: number
    canvasHeight?: number
  }

  export function toBlob(element: HTMLElement, options?: Options): Promise<Blob>
  export function toDataUrl(element: HTMLElement, options?: Options): Promise<string>
  export function toPng(element: HTMLElement, options?: Options): Promise<string>
  export function toJpeg(element: HTMLElement, options?: Options): Promise<string>
  export function toSvg(element: HTMLElement, options?: Options): Promise<string>
}
