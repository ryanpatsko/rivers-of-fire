import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  type SiteContent,
  type SiteGeneralContent,
  loadSiteContent,
  sanitizeSiteContentForSave,
} from '../content/siteContent'
import {
  GENERAL_EDITOR_GROUPS,
  fieldIsMultiline,
  fieldLabel,
} from '../content/generalEditorFields'
import { saveSiteContent } from '../lib/cmsApi'
import { getStoredSessionToken } from '../lib/adminAuth'
import styles from './GeneralSiteEditor.module.css'

export default function GeneralSiteEditor() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  /** Version last loaded from (or successfully saved to) S3; next save sends savedVersion + 1. */
  const [savedVersion, setSavedVersion] = useState(1)
  const [fields, setFields] = useState<SiteGeneralContent | null>(null)
  /** JSON snapshot of `general` when last loaded or saved; used to detect edits. */
  const [baselineGeneralJson, setBaselineGeneralJson] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isDirty = useMemo(() => {
    if (!fields || baselineGeneralJson === null) return false
    return JSON.stringify(fields) !== baselineGeneralJson
  }, [fields, baselineGeneralJson])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await loadSiteContent()
        if (cancelled) return
        setSavedVersion(data.version)
        setFields(data.general)
        setBaselineGeneralJson(JSON.stringify(data.general))
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : 'Could not load content.')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function updateField(key: keyof SiteGeneralContent, value: string) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setSaveMsg(null)
    const token = getStoredSessionToken()
    if (!token || !fields) {
      setSaveMsg('Not signed in or form not ready.')
      return
    }
    const nextVersion = savedVersion + 1
    const doc: SiteContent = sanitizeSiteContentForSave({ version: nextVersion, general: fields })
    setSaving(true)
    try {
      const result = await saveSiteContent(token, doc)
      if (result.ok) {
        setSavedVersion(nextVersion)
        setBaselineGeneralJson(JSON.stringify(fields))
        setSaveMsg('Saved. The public site may take a minute to show changes (browser or CDN cache).')
      } else {
        setSaveMsg(result.message)
      }
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <p className={styles.status} role="status">
        Loading site content…
      </p>
    )
  }

  if (status === 'error' || !fields) {
    return (
      <p className={styles.error} role="alert">
        {loadError ?? 'Could not load content.'}
      </p>
    )
  }

  return (
    <form className={styles.form} onSubmit={onSave}>
      {GENERAL_EDITOR_GROUPS.map((group) => (
        <fieldset key={group.title} className={styles.fieldset}>
          <legend className={styles.legend}>{group.title}</legend>
          <div className={styles.grid}>
            {group.keys.map((key) => (
              <div key={key} className={styles.field}>
                <label className={styles.label} htmlFor={`cms-${String(key)}`}>
                  {fieldLabel(key)}
                </label>
                {fieldIsMultiline(key) ? (
                  <textarea
                    id={`cms-${String(key)}`}
                    className={styles.textarea}
                    rows={5}
                    value={fields[key]}
                    onChange={(ev) => updateField(key, ev.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <input
                    id={`cms-${String(key)}`}
                    className={styles.input}
                    type="text"
                    value={fields[key]}
                    onChange={(ev) => updateField(key, ev.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      <div className={styles.saveRow}>
        <button className={styles.saveBtn} type="submit" disabled={saving || !isDirty}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saveMsg ? (
          <p className={saveMsg.includes('Saved') ? styles.saveOk : styles.saveErr} role="status">
            {saveMsg}
          </p>
        ) : null}
      </div>
    </form>
  )
}
