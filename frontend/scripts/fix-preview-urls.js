#!/usr/bin/env node
try { require('dotenv').config() } catch (e) { /* optional */ }
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function buildCanonicalUrl(publicId, cloudName) {
  const cloud = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'
  // Use canonical non-watermarked delivery URL for indexing
  return `https://res.cloudinary.com/${cloud}/image/upload/${publicId}`
}

async function main() {
  const argv = process.argv.slice(2)
  const projectArgIndex = argv.findIndex(a => a === '--project' || a === '-p')
  const projectId = projectArgIndex !== -1 ? argv[projectArgIndex + 1] : null

  const projects = projectId
    ? await prisma.project.findMany({ where: { id: projectId }, include: { photos: true, createdByUser: { include: { settings: true } } } })
    : await prisma.project.findMany({ include: { photos: true, createdByUser: { include: { settings: true } } } })

  if (!projects || projects.length === 0) {
    console.log('No projects found')
    process.exit(0)
  }

  let updated = 0
  for (const proj of projects) {
    const userSettings = proj.createdByUser?.settings
    const cloud = userSettings?.cloudinaryCloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'
    for (const photo of proj.photos || []) {
      const publicId = photo.originalUrl || ''
      if (!publicId) continue
      const newPreview = buildCanonicalUrl(publicId, cloud)
      if (photo.previewUrl !== newPreview) {
        await prisma.photo.update({ where: { id: photo.id }, data: { previewUrl: newPreview } })
        updated++
        console.log(`Updated photo ${photo.id} -> ${newPreview}`)
      }
    }
  }

  console.log(`Done. Updated ${updated} photos.`)
  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  prisma.$disconnect().finally(() => process.exit(1))
})
