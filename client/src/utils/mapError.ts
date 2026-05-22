import { ERROR_MESSAGES } from '../constants/errors'

export function mapSaveError(err: unknown): string {
  // Image load failures fire as an Event, not an Error
  if (err instanceof Event) return ERROR_MESSAGES.PHOTO_PROCESS_FAILED

  const message = err instanceof Error ? err.message : String(err)

  if (/canvas not available|compression failed/i.test(message)) {
    return ERROR_MESSAGES.PHOTO_PROCESS_FAILED
  }
  if (/upload/i.test(message)) {
    return ERROR_MESSAGES.PHOTO_UPLOAD_FAILED
  }
  if (/meal not found/i.test(message)) {
    return ERROR_MESSAGES.MEAL_NOT_FOUND
  }
  if (/x-user-id header/i.test(message)) {
    return ERROR_MESSAGES.SESSION_ERROR
  }
  return ERROR_MESSAGES.SAVE_MEAL_FAILED
}
