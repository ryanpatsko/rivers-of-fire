/**
 * Node 20+ Lambda + Function URL (auth NONE). JWT for /verify, /site-content (PUT), /vendors (PUT), /vendor-logo (POST), /sponsors (PUT), /sponsor-logo (POST).
 *
 * Env:
 *   ADMIN_PASSWORD, ADMIN_SESSION_SECRET
 *   CMS_S3_BUCKET — e.g. rivers-of-fire-cms
 *   CMS_S3_KEY — optional, default site-content.json
 *   CMS_S3_VENDORS_KEY — optional, default vendors.json
 *   CMS_S3_VENDOR_LOGOS_PREFIX — optional, default vendor-logos/ (trailing slash ok)
 *   CMS_S3_SPONSORS_KEY — optional, default sponsors.json
 *   CMS_S3_SPONSOR_LOGOS_PREFIX — optional, default sponsor-logos/ (trailing slash ok)
 *
 * IAM: s3:PutObject on site key, vendors/sponsors JSON, vendor-logos/*, sponsor-logos/* (and public GetObject via bucket policy for reads).
 *
 * CORS: configure only on the Lambda Function URL in AWS.
 */

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const SESSION_HOURS = 24

const GENERAL_KEYS = [
  'festivalName',
  'tagline',
  'venueName',
  'venueUrl',
  'venueArea',
  'weekendRange',
  'fridayWhen',
  'saturdayWhen',
  'ticketUrl',
  'recapVideoPath',
  'instagramUrl',
  'facebookUrl',
  'scheduleKicker',
  'scheduleTitle',
  'scheduleLeadHtml',
  'scheduleFollowHtml',
  'dayFridayHeading',
  'dayFridaySubHtml',
  'daySaturdayHeading',
  'daySaturdaySubHtml',
  'hotSauceKicker',
  'hotSauceTitle',
  'hotSauceLeadHtml',
  'hotSauceEmptyMessage',
  'foodKicker',
  'foodTitle',
  'foodLeadHtml',
  'foodOtherVendorsHeading',
  'foodTrucksHeading',
  'foodOtherEmpty',
  'foodTrucksEmpty',
  'sponsorsKicker',
  'sponsorsTitle',
  'sponsorsLeadHtml',
  'sponsorsEmpty',
  'ticketsTitle',
  'ticketsLeadHtml',
  'buyTicketsLabel',
  'footerOrganizerHtml',
  'skipLinkText',
]

const VENDOR_TYPES = new Set(['hotSauce', 'other', 'foodTruck'])
const MAX_LOGO_BYTES = 5 * 1024 * 1024
const LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** @param {unknown} v */
function validateSponsor(v) {
  if (!v || typeof v !== 'object') return false
  if (typeof v.id !== 'string' || v.id.length > 64 || !ID_RE.test(v.id)) return false
  const name = typeof v.name === 'string' ? v.name.trim() : ''
  if (name.length < 1 || name.length > 200) return false
  if (typeof v.websiteUrl !== 'string' || v.websiteUrl.length > 500) return false
  if (typeof v.logoUrl !== 'string' || v.logoUrl.length > 2048) return false
  if (v.logoUrl && !v.logoUrl.startsWith('https://')) return false
  if (typeof v.sortOrder !== 'number' || !Number.isFinite(v.sortOrder)) return false
  return true
}

/** @param {unknown} body */
function validateSponsorsDoc(body) {
  if (!body || typeof body !== 'object') return false
  if (typeof body.version !== 'number') return false
  if (!Array.isArray(body.sponsors) || body.sponsors.length > 500) return false
  return body.sponsors.every(validateSponsor)
}

const s3 = new S3Client({})

function base64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url')
}

function signJwt(payload, secret) {
  const header = base64urlJson({ alg: 'HS256', typ: 'JWT' })
  const payloadPart = base64urlJson(payload)
  const data = `${header}.${payloadPart}`
  const sig = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verifyJwt(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  if (!h || !p || !s) return null
  const data = `${h}.${p}`
  const expected = createHmac('sha256', secret).update(data).digest('base64url')
  const sigBuf = Buffer.from(s, 'base64url')
  const expBuf = Buffer.from(expected, 'base64url')
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
    if (payload.sub !== 'rof-admin') return null
    return payload
  } catch {
    return null
  }
}

function safeEqualStr(a, b) {
  try {
    const ba = Buffer.from(String(a), 'utf8')
    const bb = Buffer.from(String(b), 'utf8')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

function getPath(event) {
  const raw = event.rawPath ?? event.requestContext?.http?.path ?? '/'
  return raw.split('?')[0] ?? '/'
}

function getMethod(event) {
  return event.requestContext?.http?.method ?? event.httpMethod ?? 'GET'
}

function headerLookup(headers, name) {
  if (!headers || typeof headers !== 'object') return undefined
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower && typeof v === 'string') return v
  }
  return undefined
}

function response(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(bodyObj),
  }
}

function parseBody(event) {
  if (!event.body) return ''
  let raw = event.body
  if (event.isBase64Encoded) {
    raw = Buffer.from(raw, 'base64').toString('utf8')
  }
  return raw
}

function s3PutErrorResponse(err) {
  console.error('PutObject failed', err)
  const name = err?.name ?? err?.Code ?? ''
  const msg = String(err?.message ?? '')
  if (name === 'AccessDenied' || msg.includes('Access Denied')) {
    return response(500, {
      error:
        'S3 PutObject denied. On the Lambda execution role, allow s3:PutObject on the CMS bucket keys (site content, vendors.json, sponsors.json, vendor-logos/*, sponsor-logos/*).',
    })
  }
  if (name === 'NoSuchBucket' || msg.includes('NoSuchBucket')) {
    return response(500, {
      error: 'S3 bucket not found. Check the CMS_S3_BUCKET environment variable.',
    })
  }
  return response(500, {
    error: 'S3 upload failed. Open CloudWatch → Log groups → this function → latest log stream for details.',
  })
}

function validateSiteContent(body) {
  if (!body || typeof body !== 'object') return false
  if (typeof body.version !== 'number') return false
  if (!body.general || typeof body.general !== 'object') return false
  const g = body.general
  for (const k of GENERAL_KEYS) {
    if (typeof g[k] !== 'string') return false
  }
  return true
}

function validateVendor(v) {
  if (!v || typeof v !== 'object') return false
  if (typeof v.id !== 'string' || v.id.length > 64 || !ID_RE.test(v.id)) return false
  const name = typeof v.name === 'string' ? v.name.trim() : ''
  if (name.length < 1 || name.length > 200) return false
  if (typeof v.websiteUrl !== 'string' || v.websiteUrl.length > 500) return false
  if (typeof v.logoUrl !== 'string' || v.logoUrl.length > 2048) return false
  if (v.logoUrl && !v.logoUrl.startsWith('https://')) return false
  if (!VENDOR_TYPES.has(v.type)) return false
  if (typeof v.sortOrder !== 'number' || !Number.isFinite(v.sortOrder)) return false
  return true
}

function validateVendorsDoc(body) {
  if (!body || typeof body !== 'object') return false
  if (typeof body.version !== 'number') return false
  if (!Array.isArray(body.vendors) || body.vendors.length > 500) return false
  return body.vendors.every(validateVendor)
}

function bearerToken(event) {
  const auth = headerLookup(event.headers, 'Authorization') ?? ''
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
}

function normalizeVendorLogosPrefix(raw) {
  const p = (raw || 'vendor-logos/').trim()
  return p.endsWith('/') ? p : `${p}/`
}

function normalizeSponsorLogosPrefix(raw) {
  const p = (raw || 'sponsor-logos/').trim()
  return p.endsWith('/') ? p : `${p}/`
}

function sanitizeFilename(name) {
  const base = String(name || '')
    .split(/[/\\]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(0, 80)
  return base || 'logo'
}

function stripDataUrlBase64(raw) {
  const s = String(raw || '').trim()
  const comma = s.indexOf(',')
  if (s.startsWith('data:') && comma > 0) return s.slice(comma + 1)
  return s
}

function publicObjectUrl(bucket, region, key) {
  const r = region || 'us-east-1'
  return `https://${bucket}.s3.${r}.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`
}

export async function handler(event) {
  const method = getMethod(event)
  const path = getPath(event)

  const adminPassword = process.env.ADMIN_PASSWORD ?? ''
  const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? ''

  if (!adminPassword || !sessionSecret) {
    return response(500, { error: 'Server misconfigured' })
  }

  const isLogin = method === 'POST' && (path === '/login' || path.endsWith('/login'))
  const isVerify = method === 'GET' && (path === '/verify' || path.endsWith('/verify'))
  const isSaveContent =
    method === 'PUT' && (path === '/site-content' || path.endsWith('/site-content'))
  const isSaveVendors = method === 'PUT' && (path === '/vendors' || path.endsWith('/vendors'))
  const isVendorLogo =
    method === 'POST' && (path === '/vendor-logo' || path.endsWith('/vendor-logo'))
  const isSaveSponsors = method === 'PUT' && (path === '/sponsors' || path.endsWith('/sponsors'))
  const isSponsorLogo =
    method === 'POST' && (path === '/sponsor-logo' || path.endsWith('/sponsor-logo'))

  if (isLogin) {
    let password = ''
    try {
      const parsed = JSON.parse(parseBody(event))
      password = parsed.password ?? ''
    } catch {
      return response(400, { error: 'Invalid JSON' })
    }
    if (!safeEqualStr(password, adminPassword)) {
      return response(401, { error: 'Unauthorized' })
    }
    const now = Math.floor(Date.now() / 1000)
    const exp = now + SESSION_HOURS * 3600
    const token = signJwt({ sub: 'rof-admin', iat: now, exp }, sessionSecret)
    return response(200, { token })
  }

  if (isVerify) {
    const token = bearerToken(event)
    if (!token || !verifyJwt(token, sessionSecret)) {
      return response(401, { error: 'Unauthorized' })
    }
    return response(200, { ok: true })
  }

  if (isSaveContent) {
    const token = bearerToken(event)
    if (!token || !verifyJwt(token, sessionSecret)) {
      return response(401, { error: 'Unauthorized' })
    }
    let body
    try {
      body = JSON.parse(parseBody(event))
    } catch {
      return response(400, { error: 'Invalid JSON' })
    }
    if (!validateSiteContent(body)) {
      return response(400, { error: 'Invalid site content shape' })
    }
    const bucket = process.env.CMS_S3_BUCKET ?? ''
    const key = process.env.CMS_S3_KEY || 'site-content.json'
    if (!bucket) {
      return response(500, { error: 'CMS_S3_BUCKET not set' })
    }
    const version = Math.max(1, Math.floor(body.version))
    const payload = JSON.stringify({ version, general: body.general }, null, 2)
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: payload,
          ContentType: 'application/json; charset=utf-8',
          CacheControl: 'max-age=30',
        }),
      )
    } catch (err) {
      return s3PutErrorResponse(err)
    }
    return response(200, { ok: true })
  }

  if (isSaveVendors) {
    const token = bearerToken(event)
    if (!token || !verifyJwt(token, sessionSecret)) {
      return response(401, { error: 'Unauthorized' })
    }
    let body
    try {
      body = JSON.parse(parseBody(event))
    } catch {
      return response(400, { error: 'Invalid JSON' })
    }
    if (!validateVendorsDoc(body)) {
      return response(400, { error: 'Invalid vendors document shape' })
    }
    const bucket = process.env.CMS_S3_BUCKET ?? ''
    const key = process.env.CMS_S3_VENDORS_KEY || 'vendors.json'
    if (!bucket) {
      return response(500, { error: 'CMS_S3_BUCKET not set' })
    }
    const version = Math.max(1, Math.floor(body.version))
    const normalized = {
      version,
      vendors: body.vendors.map((v) => ({
        id: v.id,
        name: String(v.name).trim(),
        websiteUrl: String(v.websiteUrl).trim(),
        logoUrl: String(v.logoUrl).trim(),
        type: v.type,
        sortOrder: Math.floor(v.sortOrder),
      })),
    }
    const payload = JSON.stringify(normalized, null, 2)
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: payload,
          ContentType: 'application/json; charset=utf-8',
          CacheControl: 'max-age=30',
        }),
      )
    } catch (err) {
      return s3PutErrorResponse(err)
    }
    return response(200, { ok: true })
  }

  if (isSaveSponsors) {
    const token = bearerToken(event)
    if (!token || !verifyJwt(token, sessionSecret)) {
      return response(401, { error: 'Unauthorized' })
    }
    let body
    try {
      body = JSON.parse(parseBody(event))
    } catch {
      return response(400, { error: 'Invalid JSON' })
    }
    if (!validateSponsorsDoc(body)) {
      return response(400, { error: 'Invalid sponsors document shape' })
    }
    const bucket = process.env.CMS_S3_BUCKET ?? ''
    const key = process.env.CMS_S3_SPONSORS_KEY || 'sponsors.json'
    if (!bucket) {
      return response(500, { error: 'CMS_S3_BUCKET not set' })
    }
    const version = Math.max(1, Math.floor(body.version))
    const normalized = {
      version,
      sponsors: body.sponsors.map((s) => ({
        id: s.id,
        name: String(s.name).trim(),
        websiteUrl: String(s.websiteUrl).trim(),
        logoUrl: String(s.logoUrl).trim(),
        sortOrder: Math.floor(s.sortOrder),
      })),
    }
    const payload = JSON.stringify(normalized, null, 2)
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: payload,
          ContentType: 'application/json; charset=utf-8',
          CacheControl: 'max-age=30',
        }),
      )
    } catch (err) {
      return s3PutErrorResponse(err)
    }
    return response(200, { ok: true })
  }

  if (isVendorLogo) {
    const token = bearerToken(event)
    if (!token || !verifyJwt(token, sessionSecret)) {
      return response(401, { error: 'Unauthorized' })
    }
    let parsed
    try {
      parsed = JSON.parse(parseBody(event))
    } catch {
      return response(400, { error: 'Invalid JSON' })
    }
    const contentType = typeof parsed.contentType === 'string' ? parsed.contentType.trim() : ''
    const filename = sanitizeFilename(parsed.filename)
    const dataBase64 = stripDataUrlBase64(parsed.dataBase64)
    if (!LOGO_TYPES.has(contentType)) {
      return response(400, { error: 'Unsupported image type' })
    }
    if (!dataBase64) {
      return response(400, { error: 'Missing image data' })
    }
    let buf
    try {
      buf = Buffer.from(dataBase64, 'base64')
    } catch {
      return response(400, { error: 'Invalid base64 image data' })
    }
    if (buf.length < 16 || buf.length > MAX_LOGO_BYTES) {
      return response(400, { error: 'Image must be under 5 MB' })
    }
    const bucket = process.env.CMS_S3_BUCKET ?? ''
    if (!bucket) {
      return response(500, { error: 'CMS_S3_BUCKET not set' })
    }
    const prefix = normalizeVendorLogosPrefix(process.env.CMS_S3_VENDOR_LOGOS_PREFIX)
    const objectKey = `${prefix}${randomUUID()}-${filename}`
    const region = process.env.AWS_REGION || 'us-east-1'
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: buf,
          ContentType: contentType,
          CacheControl: 'max-age=86400',
        }),
      )
    } catch (err) {
      return s3PutErrorResponse(err)
    }
    const publicUrl = publicObjectUrl(bucket, region, objectKey)
    return response(200, { ok: true, publicUrl, key: objectKey })
  }

  if (isSponsorLogo) {
    const token = bearerToken(event)
    if (!token || !verifyJwt(token, sessionSecret)) {
      return response(401, { error: 'Unauthorized' })
    }
    let parsed
    try {
      parsed = JSON.parse(parseBody(event))
    } catch {
      return response(400, { error: 'Invalid JSON' })
    }
    const contentType = typeof parsed.contentType === 'string' ? parsed.contentType.trim() : ''
    const filename = sanitizeFilename(parsed.filename)
    const dataBase64 = stripDataUrlBase64(parsed.dataBase64)
    if (!LOGO_TYPES.has(contentType)) {
      return response(400, { error: 'Unsupported image type' })
    }
    if (!dataBase64) {
      return response(400, { error: 'Missing image data' })
    }
    let buf
    try {
      buf = Buffer.from(dataBase64, 'base64')
    } catch {
      return response(400, { error: 'Invalid base64 image data' })
    }
    if (buf.length < 16 || buf.length > MAX_LOGO_BYTES) {
      return response(400, { error: 'Image must be under 5 MB' })
    }
    const bucket = process.env.CMS_S3_BUCKET ?? ''
    if (!bucket) {
      return response(500, { error: 'CMS_S3_BUCKET not set' })
    }
    const prefix = normalizeSponsorLogosPrefix(process.env.CMS_S3_SPONSOR_LOGOS_PREFIX)
    const objectKey = `${prefix}${randomUUID()}-${filename}`
    const region = process.env.AWS_REGION || 'us-east-1'
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: buf,
          ContentType: contentType,
          CacheControl: 'max-age=86400',
        }),
      )
    } catch (err) {
      return s3PutErrorResponse(err)
    }
    const publicUrl = publicObjectUrl(bucket, region, objectKey)
    return response(200, { ok: true, publicUrl, key: objectKey })
  }

  return response(404, { error: 'Not found' })
}
