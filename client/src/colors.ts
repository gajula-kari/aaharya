// Aaharya — Neem & Slate color palette
// Usage: import { colors } from './colors'

export const colors = {
  // Base
  fog: '#F2F4F0', // app background
  neem: '#B8C9A8', // subtle accents, dividers
  moss: '#5E7A52', // primary actions, CTA button, app icon/header logo
  slate: '#2C3830', // body text, headings

  // Semantic — meal tags
  clean: '#E8EDE5', // logged clean day cell fill
  cleanText: '#3A5040', // text on clean day cells
  indulgent: '#C2714A', // indulgent day fill, indulgent count text
  overlimit: '#8B2020', // over limit day fill, over limit count text

  // UI surfaces
  surface: '#FFFFFF', // card bg, clean day cell
  border: '#C4CEC0', // card borders, cell borders

  // Text
  textPrimary: '#2C3830',
  textSecondary: '#7A8C7A',
  textMuted: '#9AA89A',
  textDisabled: '#BFC8BB',
} as const

export type ColorKey = keyof typeof colors
