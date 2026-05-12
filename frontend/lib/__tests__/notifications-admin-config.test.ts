import { normalizeAdminIntegrationConfig } from '../notifications'

describe('admin integration config', () => {
  it('keeps Facebook notification settings and OAuth login settings together', () => {
    expect(normalizeAdminIntegrationConfig({
      facebook: {
        enabled: true,
        pageAccessToken: 'page-token',
        recipientId: 'recipient-id',
        oauthClientId: 'facebook-client',
        oauthClientSecret: 'facebook-secret',
      },
    }).facebook).toEqual({
      enabled: true,
      pageAccessToken: 'page-token',
      recipientId: 'recipient-id',
      oauthClientId: 'facebook-client',
      oauthClientSecret: 'facebook-secret',
    })
  })
})
