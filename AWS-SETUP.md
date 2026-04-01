# AWS setup (admin + CMS)

The app uses **one flow everywhere**: the browser talks to your **Lambda Function URL** for sign-in, session checks, saving **`site-content.json`**, saving **`vendors.json`** / **`sponsors.json`** / **`events.json`**, and **uploading logos** (vendors, sponsors, events) to S3. The public site **fetches** `site-content.json`, **`vendors.json`**, **`sponsors.json`**, and **`events.json`** over HTTPS. Local `npm run dev` uses the **same** Lambda and the **same** URLs as production—configure that via environment variables only.

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
      "https://main.YOURAPPID.amplifyapp.com",
      "http://localhost:5173"
    ],
    "ExposeHeaders": []
  }
]
```

Replace `main.YOURAPPID.amplifyapp.com` with the **exact** origin from **Amplify → Hosting** (copy the site URL, no trailing slash). Example shape: `https://main.dgce0c764stsu.amplifyapp.com`. **Each preview branch has a different hostname** — add every origin you use, or use `"*"` as described below. If production is not listed, the browser reports **“blocked by CORS policy”** on `fetch` to S3.

For a public JSON file only, some teams use **`"AllowedOrigins": ["*"]`** so every Amplify preview URL works without editing CORS each time (still only `GET`/`HEAD`; no cookies are sent to S3 for a plain `fetch`).

Remove `localhost` from `AllowedOrigins` if you never load the JSON from dev.

Note the **HTTPS URL** of the object (e.g. `https://rivers-of-fire-cms.s3.us-east-1.amazonaws.com/site-content.json`). The app already defaults to that pattern in code; override with **`VITE_SITE_CONTENT_URL`** if your URL differs.

### `vendors.json` and `vendor-logos/`

1. Upload **`vendors.json`** to the **same bucket** (starting file: **`src/content/defaultVendors.json`** in this repo). Default key in code/Lambda: **`vendors.json`** at the bucket root.
2. Logos are uploaded by the admin UI into **`vendor-logos/`** (prefix configurable on Lambda). Objects must be **publicly readable** if the site loads them by HTTPS URL.

Extend your **bucket policy** so `GetObject` is allowed on those resources (adjust bucket name):

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
    },
    {
      "Sid": "PublicReadVendors",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rivers-of-fire-cms/vendors.json"
    },
    {
      "Sid": "PublicReadVendorLogos",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rivers-of-fire-cms/vendor-logos/*"
    },
    {
      "Sid": "PublicReadSponsors",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rivers-of-fire-cms/sponsors.json"
    },
    {
      "Sid": "PublicReadSponsorLogos",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rivers-of-fire-cms/sponsor-logos/*"
    },
    {
      "Sid": "PublicReadEvents",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rivers-of-fire-cms/events.json"
    },
    {
      "Sid": "PublicReadEventLogos",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::rivers-of-fire-cms/event-logos/*"
    }
  ]
}
```

The same **S3 CORS** rule as above (`GET`, `HEAD` for your origins) applies to **`vendors.json`**, **`sponsors.json`**, and **`events.json`**; logo images are loaded with `<img src="…">` and do not need CORS for display.

Override the public vendors URL with **`VITE_VENDORS_URL`** if it is not the default in `src/content/vendorsContent.ts`.

### `sponsors.json` and `sponsor-logos/`

1. Upload **`sponsors.json`** to the **same bucket** (starting file: **`src/content/defaultSponsors.json`** in this repo). Default key in code/Lambda: **`sponsors.json`** at the bucket root.
2. Sponsor logos are uploaded by the admin UI into **`sponsor-logos/`** (prefix configurable on Lambda). The combined **bucket policy** example above includes public read for **`sponsors.json`** and **`sponsor-logos/*`**.

Override the public sponsors URL with **`VITE_SPONSORS_URL`** if it is not the default in `src/content/sponsorsContent.ts`.

### `events.json` and `event-logos/`

1. Upload **`events.json`** to the **same bucket** (starting file: **`src/content/defaultEvents.json`** in this repo). Default key in code/Lambda: **`events.json`** at the bucket root.
2. Optional **card images** for schedule events are uploaded by the admin UI into **`event-logos/`** (prefix configurable on Lambda). The combined **bucket policy** example above includes public read for **`events.json`** and **`event-logos/*`**.

Override the public events URL with **`VITE_EVENTS_URL`** if it is not the default in `src/content/eventsContent.ts`.

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
| `CMS_S3_KEY` | No | Site copy JSON key; default `site-content.json`. |
| `CMS_S3_VENDORS_KEY` | No | Vendors roster JSON key; default `vendors.json`. |
| `CMS_S3_VENDOR_LOGOS_PREFIX` | No | Logo prefix; default `vendor-logos/` (with or without trailing slash). |
| `CMS_S3_SPONSORS_KEY` | No | Sponsors roster JSON key; default `sponsors.json`. |
| `CMS_S3_SPONSOR_LOGOS_PREFIX` | No | Sponsor logo prefix; default `sponsor-logos/` (with or without trailing slash). |
| `CMS_S3_EVENTS_KEY` | No | Events schedule JSON key; default `events.json`. |
| `CMS_S3_EVENT_LOGOS_PREFIX` | No | Event card image prefix; default `event-logos/` (with or without trailing slash). |

### IAM (execution role)

Attach an inline policy allowing **`s3:PutObject`** on **site content**, **vendors.json**, **sponsors.json**, **events.json**, **vendor logos**, **sponsor logos**, and **event card images**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": [
        "arn:aws:s3:::rivers-of-fire-cms/site-content.json",
        "arn:aws:s3:::rivers-of-fire-cms/vendors.json",
        "arn:aws:s3:::rivers-of-fire-cms/sponsors.json",
        "arn:aws:s3:::rivers-of-fire-cms/events.json",
        "arn:aws:s3:::rivers-of-fire-cms/vendor-logos/*",
        "arn:aws:s3:::rivers-of-fire-cms/sponsor-logos/*",
        "arn:aws:s3:::rivers-of-fire-cms/event-logos/*"
      ]
    }
  ]
}
```

Replace the bucket name (and keys if you changed the env vars).

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
- `PUT {origin}/vendors`
- `POST {origin}/vendor-logo` (JSON body with base64 image; max ~5 MB file after decode)
- `PUT {origin}/sponsors`
- `POST {origin}/sponsor-logo` (same shape as vendor-logo)
- `PUT {origin}/events`
- `POST {origin}/event-logo` (same shape as vendor-logo)

---

## 3. AWS Amplify Hosting (production build)

In **App settings → Environment variables**:

| Variable | Value |
|----------|--------|
| `VITE_ADMIN_AUTH_URL` | Same Function URL origin as above (no trailing slash). |
| `VITE_SITE_CONTENT_URL` | Optional; only if the public JSON is not the default URL in `src/content/siteContent.ts`. |
| `VITE_VENDORS_URL` | Optional; only if `vendors.json` is not the default URL in `src/content/vendorsContent.ts`. |
| `VITE_SPONSORS_URL` | Optional; only if `sponsors.json` is not the default URL in `src/content/sponsorsContent.ts`. |
| `VITE_EVENTS_URL` | Optional; only if `events.json` is not the default URL in `src/content/eventsContent.ts`. |

Trigger a **new build** after changing these (Vite bakes them in at build time).

**SPA routing:** Add a rewrite so `/admin` serves `index.html` (pattern is commented in `amplify.yml`).

---

## 4. Local development

1. Copy **`.env.example`** → **`.env.local`** (gitignored).
2. Set **`VITE_ADMIN_AUTH_URL`** to the **same** Lambda Function URL origin you use in Amplify.
3. Optionally set **`VITE_SITE_CONTENT_URL`** / **`VITE_VENDORS_URL`** / **`VITE_SPONSORS_URL`** / **`VITE_EVENTS_URL`** to match production if you are not using the default S3 URLs.
4. Run **`npm run dev`**.

There is **no** separate local admin API or local CMS file path in this project anymore.

---

## 5. Checklist

- [ ] `site-content.json`, **`vendors.json`**, **`sponsors.json`**, and **`events.json`** reachable in browser; S3 CORS allows your origins for `fetch`.
- [ ] Bucket policy allows public **`GetObject`** on logos under **`vendor-logos/*`**, **`sponsor-logos/*`**, and **`event-logos/*`** if the admin uploads images.
- [ ] Lambda env vars set; IAM allows **`PutObject`** on site key, **`vendors.json`**, **`sponsors.json`**, **`events.json`**, **`vendor-logos/*`**, **`sponsor-logos/*`**, and **`event-logos/*`**.
- [ ] Function URL exists, **auth NONE**, CORS allows POST/GET/PUT + `Authorization`.
- [ ] Amplify has `VITE_ADMIN_AUTH_URL` (and optional `VITE_SITE_CONTENT_URL`, **`VITE_VENDORS_URL`**, **`VITE_SPONSORS_URL`**, **`VITE_EVENTS_URL`**); rebuild deployed.
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
