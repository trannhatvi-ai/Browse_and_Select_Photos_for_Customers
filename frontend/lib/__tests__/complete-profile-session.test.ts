import { signIn } from 'next-auth/react'
import { refreshCompleteProfileSession } from '../complete-profile-session'

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

describe('refreshCompleteProfileSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('re-signs in with credentials so the JWT contains the completed profile', async () => {
    ;(signIn as jest.Mock).mockResolvedValue({ ok: true })

    await refreshCompleteProfileSession({
      username: 'owner_studio',
      password: 'secret123',
    })

    expect(signIn).toHaveBeenCalledWith('credentials', {
      identifier: 'owner_studio',
      password: 'secret123',
      redirect: false,
    })
  })

  it('throws when the session refresh fails', async () => {
    ;(signIn as jest.Mock).mockResolvedValue({ error: 'CredentialsSignin' })

    await expect(refreshCompleteProfileSession({
      username: 'owner_studio',
      password: 'secret123',
    })).rejects.toThrow('Unable to refresh completed profile session')
  })
})
