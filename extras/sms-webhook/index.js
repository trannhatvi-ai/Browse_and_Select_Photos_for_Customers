// Simple SMS webhook that forwards incoming payload to Twilio
// Usage: set environment variables TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, SMS_WEBHOOK_SECRET

const express = require('express')
const bodyParser = require('body-parser')
const twilio = require('twilio')

const app = express()
app.use(bodyParser.json())

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, SMS_WEBHOOK_SECRET } = process.env
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
  console.warn('Twilio is not fully configured. This webhook will reject send requests until TWILIO_* are set.')
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

app.post('/sms-webhook', async (req, res) => {
  try {
    if (SMS_WEBHOOK_SECRET) {
      const auth = req.headers.authorization || ''
      if (auth !== `Bearer ${SMS_WEBHOOK_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
    }

    const { to, message } = req.body
    if (!to || !message) return res.status(400).json({ error: 'Missing to or message' })

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
      console.log('[SMS WEBHOOK - DRY RUN]', to, message)
      return res.json({ ok: true, dryRun: true })
    }

    await client.messages.create({
      body: message,
      from: TWILIO_FROM,
      to,
    })

    return res.json({ ok: true })
  } catch (err) {
    console.error('SMS webhook error:', err)
    return res.status(500).json({ error: 'send-failed' })
  }
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`SMS webhook listening on :${port}`))
