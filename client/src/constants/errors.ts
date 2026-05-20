export const ERROR_MESSAGES = {
  // Meal save / edit
  SAVE_MEAL_FAILED: "Couldn't save your meal. Try again.",
  PHOTO_PROCESS_FAILED: "Couldn't process your photo. Try taking it again.",
  PHOTO_UPLOAD_FAILED: 'Photo upload failed. Check your connection and try again.',
  MEAL_NOT_FOUND: 'This meal no longer exists. It may have been deleted.',
  SESSION_ERROR: 'Session error. Try closing and reopening the app.',

  // Meal list
  LOAD_MEALS_FAILED: "Couldn't load your meals. Pull down to refresh.",

  // Settings
  SETTINGS_INVALID_LIMIT: 'Enter a number to set your monthly limit.',
  SETTINGS_SAVE_FAILED: "Couldn't save your settings. Check your connection and try again.",

  // Onboarding
  ONBOARD_SAVE_FAILED: "Couldn't save your preferences. Check your connection and try again.",

  // Unexpected crash (ErrorBoundary)
  GENERIC_CRASH: 'Something went wrong. Refresh the page to continue.',
} as const
