/**
 * Node 20+ Lambda + Function URL (auth NONE). JWT for /verify, /site-content (PUT).
 *
 * Env:
 *   ADMIN_PASSWORD, ADMIN_SESSION_SECRET — same as before
 *   CMS_S3_BUCKET — e.g. rivers-of-fire-cms
 *   CMS_S3_KEY — optional, default site-content.json
 *
 * IAM on the execution role: s3:PutObject on that bucket/key (and ListBucket if needed).
 *
 * CORS: configure **only** on the Lambda Function URL in AWS (methods, headers, origins).
 * Do not duplicate Access-Control-* headers here—Function URL CORS already injects them, and
 * returning them from this handler causes “multiple values” browser errors.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
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

function bearerToken(event) {
  const auth = headerLookup(event.headers, 'Authorization') ?? ''
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
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
      console.error('PutObject failed', err)
      const name = err?.name ?? err?.Code ?? ''
      const msg = String(err?.message ?? '')
      if (name === 'AccessDenied' || msg.includes('Access Denied')) {
        return response(500, {
          error:
            'S3 PutObject denied. On the Lambda execution role, allow s3:PutObject on arn:aws:s3:::YOUR_BUCKET/YOUR_KEY. Confirm CMS_S3_BUCKET matches the bucket name exactly.',
        })
      }
      if (name === 'NoSuchBucket' || msg.includes('NoSuchBucket')) {
        return response(500, {
          error: 'S3 bucket not found. Check the CMS_S3_BUCKET environment variable.',
        })
      }
      return response(500, {
        error: 'S3 upload failed. Open CloudWatch → Log groups → this function → latest stream for details.',
      })
    }
    return response(200, { ok: true })
  }

  return response(404, { error: 'Not found' })
}
