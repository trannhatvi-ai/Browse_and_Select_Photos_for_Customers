const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function normalizeVietnamPhone(phone) {
  const compact = String(phone || '').trim().replace(/[\s().-]/g, '')
  if (!compact) return ''

  let local = ''
  if (compact.startsWith('+84')) {
    local = `0${compact.slice(3)}`
  } else if (compact.startsWith('84')) {
    local = `0${compact.slice(2)}`
  } else {
    local = compact
  }

  if (!/^0[35789]\d{8}$/.test(local)) return ''
  return `+84${local.slice(1)}`
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, phone: true },
  })
  const settingsRows = await prisma.settings.findMany({
    select: { id: true, userId: true, phone: true },
  })

  const userTargets = []
  const normalizedToUser = new Map()
  const invalidUsers = []

  for (const user of users) {
    if (!user.phone) continue
    const normalized = normalizeVietnamPhone(user.phone)
    if (!normalized) {
      invalidUsers.push({ id: user.id, email: user.email, phone: user.phone })
      continue
    }

    const existing = normalizedToUser.get(normalized)
    if (existing && existing.id !== user.id) {
      userTargets.push({ conflict: true, normalized, existing, current: user })
    } else {
      normalizedToUser.set(normalized, user)
      if (user.phone !== normalized) {
        userTargets.push({ id: user.id, phone: normalized, current: user.phone, normalized })
      }
    }
  }

  const invalidSettings = []
  const settingsTargets = []
  for (const row of settingsRows) {
    if (!row.phone) continue
    const normalized = normalizeVietnamPhone(row.phone)
    if (!normalized) {
      invalidSettings.push({ id: row.id, userId: row.userId, phone: row.phone })
      continue
    }
    if (row.phone !== normalized) {
      settingsTargets.push({ id: row.id, phone: normalized, current: row.phone })
    }
  }

  if (invalidUsers.length || invalidSettings.length || userTargets.some((item) => item.conflict)) {
    console.error('Phone normalization cannot continue because of invalid values or conflicts.')
    if (invalidUsers.length) {
      console.error('Invalid user phones:', invalidUsers)
    }
    if (invalidSettings.length) {
      console.error('Invalid settings phones:', invalidSettings)
    }
    const conflicts = userTargets.filter((item) => item.conflict)
    if (conflicts.length) {
      console.error('User phone conflicts after normalization:', conflicts)
    }
    process.exitCode = 1
    return
  }

  for (const target of userTargets) {
    if (target.id) {
      await prisma.user.update({
        where: { id: target.id },
        data: { phone: target.phone },
      })
    }
  }

  for (const target of settingsTargets) {
    await prisma.settings.update({
      where: { id: target.id },
      data: { phone: target.phone },
    })
  }

  console.log(`Normalized ${userTargets.length} user phones and ${settingsTargets.length} settings phones.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
