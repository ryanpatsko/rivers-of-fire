import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  type VendorCategory,
  type VendorRecord,
  VENDOR_TYPES,
  VENDOR_TYPE_LABELS,
  loadVendors,
  sanitizeVendorsForSave,
} from '../content/vendorsContent'
import { saveVendorsContent, uploadVendorLogo } from '../lib/cmsApi'
import { getStoredSessionToken } from '../lib/adminAuth'
import styles from './VendorsEditor.module.css'

type SaveNotice =
  | { kind: 'success' }
  | { kind: 'error'; message: string }

const ADD_VENDOR_LABELS: Record<VendorCategory, string> = {
  hotSauce: 'Add Hot Sauce Vendor',
  other: 'Add Other Vendor',
  foodTruck: 'Add Food Truck',
}

function reorderWithinType(list: VendorRecord[], id: string, dir: -1 | 1): VendorRecord[] {
  const row = list.find((x) => x.id === id)
  if (!row) return list
  const type = row.type
  const sameIds = list
    .filter((x) => x.type === type)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((x) => x.id)
  const idx = sameIds.indexOf(id)
  const j = idx + dir
  if (j < 0 || j >= sameIds.length) return list
  const nextIds = [...sameIds]
  const tmp = nextIds[idx]!
  nextIds[idx] = nextIds[j]!
  nextIds[j] = tmp
  const orderMap = new Map(nextIds.map((vid, i) => [vid, i]))
  return list.map((v) =>
    v.type === type ? { ...v, sortOrder: orderMap.get(v.id) ?? v.sortOrder } : v,
  )
}

export default function VendorsEditor() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savedVersion, setSavedVersion] = useState(1)
  const [vendors, setVendors] = useState<VendorRecord[]>([])
  const [baselineJson, setBaselineJson] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null)
  const [addVendorHint, setAddVendorHint] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const isDirty = useMemo(() => {
    if (baselineJson === null) return false
    return JSON.stringify(vendors) !== baselineJson
  }, [vendors, baselineJson])

  useEffect(() => {
    if (isDirty) {
      setSaveNotice((prev) => (prev?.kind === 'success' ? null : prev))
    }
  }, [isDirty])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await loadVendors()
        if (cancelled) return
        setSavedVersion(data.version)
        setVendors(data.vendors)
        setBaselineJson(JSON.stringify(data.vendors))
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : 'Could not load vendors.')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function updateVendor(id: string, patch: Partial<VendorRecord>) {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }

  function setVendorType(id: string, nextType: VendorCategory) {
    setVendors((prev) => {
      const max = prev.filter((x) => x.type === nextType).reduce((m, x) => Math.max(m, x.sortOrder), -1)
      return prev.map((v) => (v.id === id ? { ...v, type: nextType, sortOrder: max + 1 } : v))
    })
  }

  function addVendor(type: VendorCategory) {
    setSaveNotice(null)
    setAddVendorHint('Edit New Vendor below.')
    setVendors((prev) => {
      const id = `v-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
      const max = prev.filter((x) => x.type === type).reduce((m, x) => Math.max(m, x.sortOrder), -1)
      return [...prev, { id, name: 'New Vendor', websiteUrl: '', logoUrl: '', type, sortOrder: max + 1 }]
    })
  }

  function removeVendor(id: string) {
    if (!window.confirm('Remove this vendor from the list?')) return
    setVendors((prev) => prev.filter((v) => v.id !== id))
  }

  async function onPickLogo(vendorId: string, file: File | null) {
    if (!file) return
    const token = getStoredSessionToken()
    if (!token) {
      setSaveNotice({ kind: 'error', message: 'Not signed in.' })
      return
    }
    setSaveNotice(null)
    setUploadingId(vendorId)
    try {
      const result = await uploadVendorLogo(token, file)
      if (result.ok) {
        updateVendor(vendorId, { logoUrl: result.publicUrl })
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
    setAddVendorHint(null)
    const token = getStoredSessionToken()
    if (!token) {
      setSaveNotice({ kind: 'error', message: 'Not signed in.' })
      return
    }
    const nextVersion = savedVersion + 1
    const doc = sanitizeVendorsForSave({ version: nextVersion, vendors })
    setSaving(true)
    try {
      const result = await saveVendorsContent(token, doc)
      if (result.ok) {
        setSavedVersion(nextVersion)
        setVendors(doc.vendors)
        setBaselineJson(JSON.stringify(doc.vendors))
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
        Loading vendors…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div>
        <p className={styles.error} role="alert">
          {loadError ?? 'Could not load vendors.'}
        </p>
        <p className={styles.status}>
          Upload <code className={styles.mono}>src/content/defaultVendors.json</code> to your CMS bucket as{' '}
          <code className={styles.mono}>vendors.json</code> (see AWS-SETUP.md), or set{' '}
          <code className={styles.mono}>VITE_VENDORS_URL</code>.
        </p>
      </div>
    )
  }

  const byType = (t: VendorCategory) =>
    vendors
      .filter((v) => v.type === t)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))

  return (
    <form className={styles.form} onSubmit={onSave}>
      <div className={styles.toolbar}>
        {VENDOR_TYPES.map((t) => (
          <button key={t} type="button" className={styles.addBtn} onClick={() => addVendor(t)}>
            {ADD_VENDOR_LABELS[t]}
          </button>
        ))}
        {addVendorHint ? (
          <p className={styles.addVendorHint} role="status">
            {addVendorHint}
          </p>
        ) : null}
      </div>

      {VENDOR_TYPES.map((type) => (
        <section key={type} className={styles.typeBlock} aria-labelledby={`vendor-type-${type}`}>
          <h3 id={`vendor-type-${type}`} className={styles.typeTitle}>
            {VENDOR_TYPE_LABELS[type]}
          </h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Name</th>
                <th scope="col">Website</th>
                <th scope="col">Category</th>
                <th scope="col">Logo</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {byType(type).length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.mono}>
                    No vendors in this category yet.
                  </td>
                </tr>
              ) : (
                byType(type).map((v) => (
                  <tr key={v.id}>
                    <td>
                      <input
                        className={`${styles.input} ${styles.inputNarrow}`}
                        type="number"
                        inputMode="numeric"
                        value={v.sortOrder}
                        onChange={(ev) =>
                          updateVendor(v.id, { sortOrder: Number(ev.target.value) || 0 })
                        }
                        aria-label={`Sort order for ${v.name}`}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        type="text"
                        value={v.name}
                        onChange={(ev) => updateVendor(v.id, { name: ev.target.value })}
                        aria-label="Vendor name"
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        type="url"
                        inputMode="url"
                        placeholder="https://"
                        value={v.websiteUrl}
                        onChange={(ev) => updateVendor(v.id, { websiteUrl: ev.target.value })}
                        aria-label="Website URL"
                      />
                    </td>
                    <td>
                      <select
                        className={styles.select}
                        value={v.type}
                        onChange={(ev) => setVendorType(v.id, ev.target.value as VendorCategory)}
                        aria-label="Vendor category"
                      >
                        {VENDOR_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {VENDOR_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.logoCell}>
                      {v.logoUrl ? (
                        <img
                          className={styles.logoPreview}
                          src={v.logoUrl}
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
                        disabled={uploadingId === v.id}
                        onChange={(ev) => {
                          const f = ev.target.files?.[0] ?? null
                          ev.target.value = ''
                          void onPickLogo(v.id, f)
                        }}
                        aria-label={`Upload logo for ${v.name}`}
                      />
                      {v.logoUrl ? (
                        <button
                          type="button"
                          className={styles.rowBtn}
                          onClick={() => updateVendor(v.id, { logoUrl: '' })}
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
                          onClick={() => setVendors((prev) => reorderWithinType(prev, v.id, -1))}
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          className={styles.rowBtn}
                          onClick={() => setVendors((prev) => reorderWithinType(prev, v.id, 1))}
                        >
                          Move down
                        </button>
                        <button
                          type="button"
                          className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                          onClick={() => removeVendor(v.id)}
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
      ))}

      <div className={styles.saveRow}>
        <button className={styles.saveBtn} type="submit" disabled={saving || !isDirty}>
          {saving ? 'Saving…' : 'Save Vendors'}
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
