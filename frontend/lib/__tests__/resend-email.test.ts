import { queueEmail } from '../email'

const sendMock = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: sendMock,
    },
  })),
}))

jest.mock('@/lib/notifications', () => ({
  getAdminIntegrationConfig: jest.fn(),
}))

import { getAdminIntegrationConfig } from '@/lib/notifications'

describe('Resend email delivery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    ;(getAdminIntegrationConfig as jest.Mock).mockResolvedValue({
      resend: {
        enabled: false,
        apiKey: '',
        fromEmail: '',
      },
    })
  })

  it('fails clearly when the sender uses a public Gmail domain', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Studio Pro <studio@gmail.com>'

    await expect(queueEmail({
      to: 'client@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })).rejects.toThrow('domain đã verify')

    expect(sendMock).not.toHaveBeenCalled()
  })

  it('throws Resend SDK errors instead of reporting a fake success', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Studio Pro <no-reply@example.com>'
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'The example.com domain is not verified.' },
    })

    await expect(queueEmail({
      to: 'client@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })).rejects.toThrow('domain is not verified')
  })

  it('returns the Resend email id when delivery is accepted', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Studio Pro <no-reply@example.com>'
    sendMock.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
    })

    await expect(queueEmail({
      to: 'client@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })).resolves.toBe('email_123')
  })
})
