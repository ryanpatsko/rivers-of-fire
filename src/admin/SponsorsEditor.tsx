import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  type SponsorRecord,
  loadSponsors,
  sanitizeSponsorsForSave,
} from '../content/sponsorsContent'
import { saveSponsorsContent, uploadSponsorLogo } from '../lib/cmsApi'
import { getStoredSessionToken } from '../lib/adminAuth'
import styles from './VendorsEditor.module.css'

type SaveNotice =
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function reorderSponsors(list: SponsorRecord[], id: string, dir: -1 | 1): SponsorRecord[] {
  const sorted = [...list].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  )
  const ids = sorted.map((x) => x.id)
  const idx = ids.indexOf(id)
  const j = idx + dir
  if (j < 0 || j >= ids.length) return list
  const nextIds = [...ids]
  const tmp = nextIds[idx]!
  nextIds[idx] = nextIds[j]!
  nextIds[j] = tmp
  const orderMap = new Map(nextIds.map((sid, i) => [sid, i]))
  return list.map((s) => ({ ...s, sortOrder: orderMap.get(s.id) ?? s.sortOrder }))
}

export default function SponsorsEditor() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savedVersion, setSavedVersion] = useState(1)
  const [sponsors, setSponsors] = useState<SponsorRecord[]>([])
  const [baselineJson, setBaselineJson] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null)
  const [addHint, setAddHint] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const isDirty = useMemo(() => {
    if (baselineJson === null) return false
    return JSON.stringify(sponsors) !== baselineJson
  }, [sponsors, baselineJson])

  useEffect(() => {
    if (isDirty) {
      setSaveNotice((prev) => (prev?.kind === 'success' ? null : prev))
    }
  }, [isDirty])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await loadSponsors()
        if (cancelled) return
        setSavedVersion(data.version)
        setSponsors(data.sponsors)
        setBaselineJson(JSON.stringify(data.sponsors))
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : 'Could not load sponsors.')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function updateSponsor(id: string, patch: Partial<SponsorRecord>) {
    setSponsors((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function addSponsor() {
    setSaveNotice(null)
    setAddHint('Edit New Sponsor below.')
    setSponsors((prev) => {
      const id = `s-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
      const max = prev.reduce((m, x) => Math.max(m, x.sortOrder), -1)
      return [
        ...prev,
        { id, name: 'New Sponsor', websiteUrl: '', logoUrl: '', sortOrder: max + 1 },
      ]
    })
  }

  function removeSponsor(id: string) {
    if (!window.confirm('Remove this sponsor from the list?')) return
    setSponsors((prev) => prev.filter((s) => s.id !== id))
  }

  async function onPickLogo(sponsorId: string, file: File | null) {
    if (!file) return
    const token = getStoredSessionToken()
    if (!token) {
      setSaveNotice({ kind: 'error', message: 'Not signed in.' })
      return
    }
    setSaveNotice(null)
    setUploadingId(sponsorId)
    try {
      const result = await uploadSponsorLogo(token, file)
      if (result.ok) {
        updateSponsor(sponsorId, { logoUrl: result.publicUrl })
      } else {
        setSaveNotice({ kind: 'error', message: result.message })
      }
    } finally {
      setUploadingId(null)
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setSaveNotice(null)
    setAddHint(null)
    const token = getStoredSessionToken()
    if (!token) {
      setSaveNotice({ kind: 'error', message: 'Not signed in.' })
      return
    }
    const nextVersion = savedVersion + 1
    const doc = sanitizeSponsorsForSave({ version: nextVersion, sponsors })
    setSaving(true)
    try {
      const result = await saveSponsorsContent(token, doc)
      if (result.ok) {
        setSavedVersion(nextVersion)
        setSponsors(doc.sponsors)
        setBaselineJson(JSON.stringify(doc.sponsors))
        setSaveNotice({ kind: 'success' })
      } else {
        setSaveNotice({ kind: 'error', message: result.message })
      }
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <p className={styles.status} role="status">
        Loading sponsors…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div>
        <p className={styles.error} role="alert">
          {loadError ?? 'Could not load sponsors.'}
        </p>
        <p className={styles.status}>
          Upload <code className={styles.mono}>src/content/defaultSponsors.json</code> to your CMS bucket as{' '}
          <code className={styles.mono}>sponsors.json</code> (see AWS-SETUP.md), or set{' '}
          <code className={styles.mono}>VITE_SPONSORS_URL</code>.
        </p>
      </div>
    )
  }

  const rows = [...sponsors].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )

  return (
    <form className={styles.form} onSubmit={onSave}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.addBtn} onClick={addSponsor}>
          Add sponsor
        </button>
        {addHint ? (
          <p className={styles.addVendorHint} role="status">
            {addHint}
          </p>
        ) : null}
      </div>

      <section className={styles.typeBlock} aria-labelledby="sponsors-list-heading">
        <h3 id="sponsors-list-heading" className={styles.typeTitle}>
          Sponsor list
        </h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Name</th>
              <th scope="col">Website</th>
              <th scope="col">Logo</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.mono}>
                  No sponsors yet. Use “Add sponsor”.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <input
                      className={`${styles.input} ${styles.inputNarrow}`}
                      type="number"
                      inputMode="numeric"
                      value={s.sortOrder}
                      onChange={(ev) =>
                        updateSponsor(s.id, { sortOrder: Number(ev.target.value) || 0 })
                      }
                      aria-label={`Sort order for ${s.name}`}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.input}
                      type="text"
                      value={s.name}
                      onChange={(ev) => updateSponsor(s.id, { name: ev.target.value })}
                      aria-label="Sponsor name"
                    />
                  </td>
                  <td>
                    <input
                      className={styles.input}
                      type="url"
                      inputMode="url"
                      placeholder="https://"
                      value={s.websiteUrl}
                      onChange={(ev) => updateSponsor(s.id, { websiteUrl: ev.target.value })}
                      aria-label="Website URL"
                    />
                  </td>
                  <td className={styles.logoCell}>
                    {s.logoUrl ? (
                      <img
                        className={styles.logoPreview}
                        src={s.logoUrl}
                        alt=""
                        decoding="async"
                      />
                    ) : (
                      <div className={styles.logoPlaceholder}>No logo</div>
                    )}
                    <input
                      className={styles.fileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      disabled={uploadingId === s.id}
                      onChange={(ev) => {
                        const f = ev.target.files?.[0] ?? null
                        ev.target.value = ''
                        void onPickLogo(s.id, f)
                      }}
                      aria-label={`Upload logo for ${s.name}`}
                    />
                    {s.logoUrl ? (
                      <button
                        type="button"
                        className={styles.rowBtn}
                        onClick={() => updateSponsor(s.id, { logoUrl: '' })}
                      >
                        Clear logo
                      </button>
                    ) : null}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.rowBtn}
                        onClick={() => setSponsors((prev) => reorderSponsors(prev, s.id, -1))}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        className={styles.rowBtn}
                        onClick={() => setSponsors((prev) => reorderSponsors(prev, s.id, 1))}
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                        onClick={() => removeSponsor(s.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className={styles.saveRow}>
        <button className={styles.saveBtn} type="submit" disabled={saving || !isDirty}>
          {saving ? 'Saving…' : 'Save Sponsors'}
        </button>
        {saveNotice?.kind === 'success' ? (
          <div className={styles.saveSuccess} role="status">
            <span className={styles.saveSuccessIcon} aria-hidden>
              <svg viewBox="0 0 16 16" width={16} height={16} fill="none">
                <path
                  d="M3.5 8.5L6.5 11.5L12.5 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className={styles.saveSuccessText}>Saved</span>
          </div>
        ) : saveNotice?.kind === 'error' ? (
          <p className={styles.saveErr} role="alert">
            {saveNotice.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
