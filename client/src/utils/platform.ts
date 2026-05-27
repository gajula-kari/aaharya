/** Returns true when the browser is running on Android. */
export const isAndroid = (): boolean => /android/i.test(navigator.userAgent)
