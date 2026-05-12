export function normalizeCallbackUrl(callbackUrl: string | null | undefined, fallback = '/dashboard') {
  if (!callbackUrl) {
    return fallback
  }

  if (callbackUrl.startsWith('/')) {
    return callbackUrl
  }

  try {
    const parsedUrl = new URL(callbackUrl, window.location.origin)
    if (parsedUrl.origin === window.location.origin) {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || fallback
    }
  } catch {
    return fallback
  }

  return fallback
}