export function getCloudinaryThumbnail(url: string, width = 600, quality = 'auto', format = 'auto') {
  try {
    const u = new URL(url)
    // Cloudinary delivery hostname pattern: res.cloudinary.com/{cloud}/image/upload/...
    // Insert transformation after /upload/
    const parts = u.pathname.split('/').map(decodeURIComponent)
    const uploadIndex = parts.findIndex((p) => p === 'upload')
    if (uploadIndex === -1) return url

    const transform = `w_${width},c_limit,q_${quality},f_${format}`
    // rebuild path with transform after 'upload'
    const before = parts.slice(0, uploadIndex + 1).join('/')
    const after = parts.slice(uploadIndex + 1).join('/')
    return `${u.protocol}//${u.host}${before}/${transform}/${after}`
  } catch (e) {
    return url
  }
}

export async function uploadToCloudinary(file: File, uploadPreset?: string) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) throw new Error('Cloudinary cloud name not configured')

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  const form = new FormData()
  form.append('file', file)
  if (uploadPreset) form.append('upload_preset', uploadPreset)

  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Cloudinary upload failed')
  return res.json()
}
