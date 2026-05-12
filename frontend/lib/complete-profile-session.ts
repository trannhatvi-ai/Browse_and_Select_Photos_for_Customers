import { signIn } from 'next-auth/react'

type RefreshCompleteProfileSessionInput = {
  username: string
  password: string
}

export async function refreshCompleteProfileSession({
  username,
  password,
}: RefreshCompleteProfileSessionInput) {
  const result = await signIn('credentials', {
    identifier: username,
    password,
    redirect: false,
  })

  if (result?.error) {
    throw new Error('Unable to refresh completed profile session')
  }
}
