import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string
  alt?: string
  'auto-rotate'?: boolean
  'rotation-per-second'?: string
  'shadow-intensity'?: string
  'disable-zoom'?: boolean
  'disable-pan'?: boolean
  'disable-tap'?: boolean
  'interaction-prompt'?: string
  'camera-controls'?: boolean
  exposure?: string
  loading?: string
  reveal?: string
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes
    }
  }
}
