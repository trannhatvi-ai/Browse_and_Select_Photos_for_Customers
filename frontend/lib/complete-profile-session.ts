import { signIn } from 'next-auth/react'

type RefreshCompleteProfileSessionInput = {
  username: string
  password?: string
}

export async function refreshCompleteProfileSession({
  username,
  password,
}: RefreshCompleteProfileSessionInput) {
  if (!password) {
    const response = await fetch('/api/auth/session', { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('Unable to refresh completed profile session')
    }
    return
  }

  const result = await signIn('credentials', {
    identifier: username,
    password,
    redirect: false,
  })

  if (result?.error) {
    throw new Error('Unable to refresh completed profile session')
  }
}
