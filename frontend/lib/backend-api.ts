export function getBackendBaseUrl() {
  return (
    process.env.AI_BACKEND_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:8000'
  )
}

export function buildBackendUrl(pathname: string) {
  const baseUrl = getBackendBaseUrl()
  return new URL(pathname, baseUrl).toString()
}
