/** Returns true when the browser is running on Android. */
export const isAndroid = (): boolean => /android/i.test(navigator.userAgent)

/** Returns true when the browser is running on iOS (iPhone / iPad / iPod). */
export const isIos = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent)
