import { mapSaveError } from './mapError'
import { ERROR_MESSAGES } from '../constants/errors'

describe('mapSaveError', () => {
  describe('photo processing errors', () => {
    it('maps "Canvas not available" to photo process message', () => {
      expect(mapSaveError(new Error('Canvas not available'))).toBe(
        ERROR_MESSAGES.PHOTO_PROCESS_FAILED
      )
    })

    it('maps "Compression failed" to photo process message', () => {
      expect(mapSaveError(new Error('Compression failed'))).toBe(
        ERROR_MESSAGES.PHOTO_PROCESS_FAILED
      )
    })

    it('maps an image load Event to photo process message', () => {
      expect(mapSaveError(new Event('error'))).toBe(ERROR_MESSAGES.PHOTO_PROCESS_FAILED)
    })
  })

  describe('upload errors', () => {
    it('maps any error containing "upload" to photo upload message', () => {
      expect(mapSaveError(new Error('Upload failed: Invalid API key'))).toBe(
        ERROR_MESSAGES.PHOTO_UPLOAD_FAILED
      )
    })

    it('is case-insensitive for upload matching', () => {
      expect(mapSaveError(new Error('upload stream error'))).toBe(
        ERROR_MESSAGES.PHOTO_UPLOAD_FAILED
      )
    })
  })

  describe('server-side errors', () => {
    it('maps "Meal not found" to not-found message', () => {
      expect(mapSaveError(new Error('Meal not found'))).toBe(ERROR_MESSAGES.MEAL_NOT_FOUND)
    })

    it('maps "x-user-id header is required" to session error message', () => {
      expect(mapSaveError(new Error('x-user-id header is required'))).toBe(
        ERROR_MESSAGES.SESSION_ERROR
      )
    })
  })

  describe('fallback', () => {
    it('returns generic save failed for unrecognised Error messages', () => {
      expect(mapSaveError(new Error('Network error'))).toBe(ERROR_MESSAGES.SAVE_MEAL_FAILED)
      expect(mapSaveError(new Error('Something totally unexpected'))).toBe(
        ERROR_MESSAGES.SAVE_MEAL_FAILED
      )
    })

    it('handles non-Error thrown values safely', () => {
      expect(mapSaveError('plain string')).toBe(ERROR_MESSAGES.SAVE_MEAL_FAILED)
      expect(mapSaveError(null)).toBe(ERROR_MESSAGES.SAVE_MEAL_FAILED)
      expect(mapSaveError(undefined)).toBe(ERROR_MESSAGES.SAVE_MEAL_FAILED)
      expect(mapSaveError(42)).toBe(ERROR_MESSAGES.SAVE_MEAL_FAILED)
    })
  })
})
