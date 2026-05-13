import 'server-only'
import { randomUUID } from 'crypto'

/**
 * Centralized upload validation: MIME whitelist, size limit, safe filename.
 *
 * Pattern:
 *   const v = validateUpload(file, { category: 'document', maxSizeMb: 25 })
 *   if (!v.ok) return { error: v.error }
 *   await admin.storage.from('blocky').upload(`${parentId}/${v.safePath}`, file)
 *
 * `v.safePath` is `<uuid>.<ext>` so the user's original filename never lands
 * in storage paths (prevents path traversal, prevents bucket pollution).
 *
 * Note: file.type is client-supplied. For higher assurance, also call
 * validateMagicBytes() (Phase 2 stretch) — checks the actual file header.
 */

export type UploadCategory = 'image' | 'document' | 'spreadsheet' | 'any'

const MIME_GROUPS: Record<UploadCategory, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  spreadsheet: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
  ],
  any: [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
}

const EXT_FROM_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'text/csv': 'csv',
  'application/csv': 'csv',
}

export interface ValidateOpts {
  category: UploadCategory
  maxSizeMb?: number
  /** Override allowed MIME list (else uses MIME_GROUPS[category]) */
  allowedMime?: string[]
}

export interface ValidationOk {
  ok: true
  /** UUID-based filename (random, no PII): `<uuid>.<ext>` */
  safePath: string
  /** Detected file extension (lowercased, alphanum only) */
  ext: string
}

export interface ValidationErr {
  ok: false
  error: string
}

export function validateUpload(file: File, opts: ValidateOpts): ValidationOk | ValidationErr {
  if (!file || file.size === 0) {
    return { ok: false, error: 'Žiadny súbor' }
  }
  const maxMb = opts.maxSizeMb ?? 25
  const maxBytes = maxMb * 1024 * 1024
  if (file.size > maxBytes) {
    return { ok: false, error: `Súbor je príliš veľký (max ${maxMb} MB, má ${(file.size / 1024 / 1024).toFixed(1)} MB)` }
  }

  const allowed = opts.allowedMime ?? MIME_GROUPS[opts.category]
  if (!allowed.includes(file.type)) {
    return { ok: false, error: `Nepovolený typ súboru (${file.type || 'neznámy'})` }
  }

  // Preferuj extension odvodenú z MIME (server-trusted); fallback na user filename
  let ext = EXT_FROM_MIME[file.type]
  if (!ext) {
    ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    if (ext.length > 8) {
      return { ok: false, error: 'Podozrivá prípona súboru' }
    }
  }

  const safePath = `${randomUUID()}.${ext}`
  return { ok: true, safePath, ext }
}
