/** localStorage keys used for caching — centralised to prevent key-name drift. */
export const CACHE_KEYS = {
  SETTINGS: 'aaharya_settings',
  EARLIEST_MONTH: 'aaharya_earliest_month',
  SIGNUP_NUDGE_SHOWN: 'aaharya_signup_nudge_shown',
  SESSION_TYPE: 'aaharya_session_type', // 'anonymous' | 'real' — used to auto-restore on expiry
  HAS_ACCOUNT: 'aaharya_has_account', // persists across logout — hides skip once user has registered
} as const
