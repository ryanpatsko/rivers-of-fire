# AWS setup (admin + CMS)

The app uses **one flow everywhere**: the browser talks to your **Lambda Function URL** for sign-in, session checks, and saving CMS JSON, and it **fetches `site-content.json` over HTTPS** (S3 or another URL) for public page copy. Local `npm run dev` uses the **same** Lambda and the **same** JSON URL as production—configure that via environment variables only.

---

## 1. S3 bucket (public `site-content.json`)

1. Create or use a bucket (e.g. `rivers-of-fire-cms`).
2. Upload `site-content.json` at the key you will use (default in code: `site-content.json` at the bucket root), or sync from this repo’s `src/content/defaultSiteContent.json` as a starting shape (`version` + `general` fields).
3. **Block public access** can stay on for the bucket if you only grant public read via a **bucket policy** on that object (or use a CloudFront distribution—then set `VITE_SITE_CONTENT_URL` to that URL in Amplify and `.env.local`).

**Minimum bucket policy fragment** (adjust bucket name and object key; tighten `Principal` if you use CloudFront OAI/OAC instead of `*`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadSiteContent",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rivers-of-fire-cms/site-content.json"
    }
  ]
}
```

**CORS on the bucket** (so browsers on your Amplify domain—and `http://localhost:5173` if you test locally—can `fetch` the JSON):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://YOUR-AMPLIFY-APP.amplifyapp.com",
      "http://localhost:5173"
    ],
    "ExposeHeaders": []
  }
]
```

Remove `localhost` from `AllowedOrigins` if you never load the JSON from dev.

Note the **HTTPS URL** of the object (e.g. `https://rivers-of-fire-cms.s3.us-east-1.amazonaws.com/site-content.json`). The app already defaults to that pattern in code; override with **`VITE_SITE_CONTENT_URL`** if your URL differs.

---

## 2. Lambda function (auth + save to S3)

### Code

- Source lives in `lambda/admin-auth/` (`index.mjs`, `package.json`, `package-lock.json`).
- From the **repository root**, run **`npm run package:lambda`**. That runs `npm ci` in `lambda/admin-auth` and writes **`dist/lambda-admin-auth.zip`** (`index.mjs` + `node_modules/`). Upload that zip in the Lambda console (or via your usual deploy pipeline).
- Cursor is configured to run this after edits under `lambda/admin-auth/`; you can always run it manually after pulling changes.

### Runtime

- **Node.js 20.x** (or 18+), handler **`index.handler`**, architecture **x86_64** or **arm64** (match your zip).

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ADMIN_PASSWORD` | Yes | Shared admin password (only on Lambda, not in git). |
| `ADMIN_SESSION_SECRET` | Yes | Long random string; used to sign JWTs (24h sessions). |
| `CMS_S3_BUCKET` | Yes | Bucket name (e.g. `rivers-of-fire-cms`). |
| `CMS_S3_KEY` | No | Object key; default `site-content.json`. |

### IAM (execution role)

Attach an inline policy (or managed policy) allowing **`s3:PutObject`** (and optionally **`s3:GetObject`** for debugging) on:

`arn:aws:s3:::YOUR-BUCKET-NAME/YOUR-KEY`

Example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::rivers-of-fire-cms/site-content.json"
    }
  ]
}
```

### Function URL

1. **Create function URL** → **Auth type: NONE** (the app sends a normal `Authorization: Bearer …` header; IAM SigV4 is not used from the browser).
2. **CORS**: allow **GET, POST, PUT, OPTIONS**; allow headers **`content-type`**, **`authorization`**; allow your **Amplify origin** and **`http://localhost:5173`** if you develop locally.

   **Important:** CORS is applied **only** via this Function URL configuration. The Lambda code in this repo does **not** emit `Access-Control-*` headers. If those headers are set both in the console **and** in the function response, the browser sees a duplicate `Access-Control-Allow-Origin` and blocks the request. After deploying the current `lambda/admin-auth` zip, rely on Function URL CORS alone.

Copy the **Function URL** (origin only, no path), e.g.  
`https://xxxxxxxx.lambda-url.us-east-1.on.aws`

The app calls:

- `POST {origin}/login`
- `GET {origin}/verify`
- `PUT {origin}/site-content`

---

## 3. AWS Amplify Hosting (production build)

In **App settings → Environment variables**:

| Variable | Value |
|----------|--------|
| `VITE_ADMIN_AUTH_URL` | Same Function URL origin as above (no trailing slash). |
| `VITE_SITE_CONTENT_URL` | Optional; only if the public JSON is not the default URL in `src/content/siteContent.ts`. |

Trigger a **new build** after changing these (Vite bakes them in at build time).

**SPA routing:** Add a rewrite so `/admin` serves `index.html` (pattern is commented in `amplify.yml`).

---

## 4. Local development

1. Copy **`.env.example`** → **`.env.local`** (gitignored).
2. Set **`VITE_ADMIN_AUTH_URL`** to the **same** Lambda Function URL origin you use in Amplify.
3. Optionally set **`VITE_SITE_CONTENT_URL`** to match production if you are not using the default S3 URL.
4. Run **`npm run dev`**.

There is **no** separate local admin API or local CMS file path in this project anymore.

---

## 5. Checklist

- [ ] `site-content.json` reachable in browser from the URL the app will use; S3 CORS allows your origins.
- [ ] Lambda env vars set; IAM allows `PutObject` on that key.
- [ ] Function URL exists, **auth NONE**, CORS allows POST/GET/PUT + `Authorization`.
- [ ] Amplify has `VITE_ADMIN_AUTH_URL` (and optional `VITE_SITE_CONTENT_URL`); rebuild deployed.
- [ ] `.env.local` matches Amplify for local dev.

After a save, viewers may briefly see cached JSON; the Lambda sets **`Cache-Control: max-age=30`** on the uploaded object to limit staleness.

---

## 6. 502 on PUT `/site-content`

A **502** from the Function URL usually means the Lambda **crashed** or **timed out** before returning a valid response — not a missing CORS setting.

1. **CloudWatch** → **Log groups** → your function name → open the **latest log stream** and read the error (often `AccessDenied`, `NoSuchBucket`, or a timeout).
2. **`CMS_S3_BUCKET`** — must be the **exact** bucket name (no `s3://` prefix). Wrong or empty bucket → failure.
3. **IAM (most common)** — the Lambda **execution role** must allow **`s3:PutObject`** (and usually **`s3:GetObject`** if you read) on the object, e.g. `arn:aws:s3:::your-bucket-name/site-content.json` (or `arn:aws:s3:::your-bucket-name/*` during setup).
4. **VPC** — if the function is attached to a **VPC**, it needs a path to S3 (e.g. **S3 gateway VPC endpoint** or **NAT**). Without that, S3 calls can hang until timeout → 502.
5. After changing **`lambda/admin-auth/**`**, rebuild and upload the zip: **`npm run package:lambda`** → upload **`dist/lambda-admin-auth.zip`** to the function.

After redeploying the updated handler, failed saves should return **500** with a short **`error`** JSON field instead of 502 when the failure is S3-related.
