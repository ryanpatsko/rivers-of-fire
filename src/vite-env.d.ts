/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public Lambda Function URL base (no trailing slash). Set in Amplify build env. */
  readonly VITE_ADMIN_AUTH_URL?: string
  /** Optional override for site-content.json URL (defaults to S3 public object). */
  readonly VITE_SITE_CONTENT_URL?: string
  /** Optional override for vendors.json URL (defaults to S3 public object in vendorsContent.ts). */
  readonly VITE_VENDORS_URL?: string
  /** Optional override for sponsors.json URL (defaults to S3 public object in sponsorsContent.ts). */
  readonly VITE_SPONSORS_URL?: string
}
