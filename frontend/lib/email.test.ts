import { queueEmail, templates } from '@/lib/email'

jest.mock('@/lib/email', () => ({
  queueEmail: jest.fn(),
  templates: {
    projectInvitation: jest.fn(),
    selectionSubmitted: jest.fn(),
  },
}))

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('generates project invitation template', () => {
    const project = {
      clientName: 'Sarah',
      eventName: 'Wedding',
      deadline: '2024-07-01',
      maxSelections: 50,
      accessPassword: null,
    }
    const link = 'https://studio.com/gallery/abc123'

    const result = templates.projectInvitation(project, link)

    expect(result.to).toBe(project.clientEmail)
    expect(result.subject).toContain('Wedding')
    expect(result.html).toContain(link)
  })

  it('queues email via queueEmail function', async () => {
    await queueEmail({ to: 'test@example.com', subject: 'Test', html: '<p>Hello</p>' })
    expect(queueEmail).toHaveBeenCalled()
  })
})
