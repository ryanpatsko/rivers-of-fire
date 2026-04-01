import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  EVENT_DAY_LABELS,
  EVENT_DAYS,
  EVENT_ICON_EMOJI,
  EVENT_ICON_KEYS,
  EVENT_ICON_LABELS,
  type EventDay,
  type EventIconKey,
  type EventRecord,
  loadEvents,
  sanitizeEventsForSave,
  sortEventsForAdminTable,
} from '../content/eventsContent'
import { saveEventsContent, uploadEventLogo } from '../lib/cmsApi'
import { getStoredSessionToken } from '../lib/adminAuth'
import evStyles from './EventsEditor.module.css'
import styles from './VendorsEditor.module.css'

type SaveNotice =
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function inFridayColumn(day: EventDay) {
  return day === 'friday' || day === 'both'
}

function reorderEvents(list: EventRecord[], id: string, dir: -1 | 1): EventRecord[] {
  const row = list.find((x) => x.id === id)
  if (!row) return list
  const fri = inFridayColumn(row.day)
  const pool = list
    .filter((e) => (fri ? inFridayColumn(e.day) : e.day === 'saturday'))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
  const ids = pool.map((x) => x.id)
  const idx = ids.indexOf(id)
  const j = idx + dir
  if (j < 0 || j >= ids.length) return list
  const nextIds = [...ids]
  const tmp = nextIds[idx]!
  nextIds[idx] = nextIds[j]!
  nextIds[j] = tmp
  const orderMap = new Map(nextIds.map((eid, i) => [eid, i]))
  return list.map((e) =>
    fri
      ? inFridayColumn(e.day)
        ? { ...e, sortOrder: orderMap.get(e.id) ?? e.sortOrder }
        : e
      : e.day === 'saturday'
        ? { ...e, sortOrder: orderMap.get(e.id) ?? e.sortOrder }
        : e,
  )
}

function cloneEvent(ev: EventRecord): EventRecord {
  return JSON.parse(JSON.stringify(ev)) as EventRecord
}

function newEventRecord(events: EventRecord[]): EventRecord {
  const id = `e-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
  const pool = events.filter((e) => inFridayColumn(e.day))
  const max = pool.reduce((m, x) => Math.max(m, x.sortOrder), -1)
  return {
    id,
    day: 'friday',
    sortOrder: max + 1,
    title: 'New event',
    description: '',
    iconKey: 'none',
    logoUrl: '',
    logoLinkUrl: '',
    jumpToSectionId: '',
    jumpLinkLabel: '',
  }
}

export default function EventsEditor() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savedVersion, setSavedVersion] = useState(1)
  const savedVersionRef = useRef(1)
  const [events, setEvents] = useState<EventRecord[]>([])
  const [baselineJson, setBaselineJson] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null)
  const [saving, setSaving] = useState(false)

  const [view, setView] = useState<'list' | 'edit'>('list')
  const [draft, setDraft] = useState<EventRecord | null>(null)
  const [draftIsNew, setDraftIsNew] = useState(false)
  const [draftBaselineJson, setDraftBaselineJson] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const isDirty = useMemo(() => {
    if (baselineJson === null) return false
    return JSON.stringify(events) !== baselineJson
  }, [events, baselineJson])

  useEffect(() => {
    savedVersionRef.current = savedVersion
  }, [savedVersion])

  useEffect(() => {
    if (isDirty) {
      setSaveNotice((prev) => (prev?.kind === 'success' ? null : prev))
    }
  }, [isDirty])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await loadEvents()
        if (cancelled) return
        savedVersionRef.current = data.version
        setSavedVersion(data.version)
        setEvents(data.events)
        setBaselineJson(JSON.stringify(data.events))
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : 'Could not load events.')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function persistEvents(nextEvents: EventRecord[]): Promise<boolean> {
    setSaveNotice(null)
    const token = getStoredSessionToken()
    if (!token) {
      setSaveNotice({ kind: 'error', message: 'Not signed in.' })
      return false
    }
    const nextVersion = savedVersionRef.current + 1
    const doc = sanitizeEventsForSave({ version: nextVersion, events: nextEvents })
    setSaving(true)
    try {
      const result = await saveEventsContent(token, doc)
      if (result.ok) {
        savedVersionRef.current = nextVersion
        setSavedVersion(nextVersion)
        setEvents(doc.events)
        setBaselineJson(JSON.stringify(doc.events))
        setSaveNotice({ kind: 'success' })
        return true
      }
      setSaveNotice({ kind: 'error', message: result.message })
      return false
    } finally {
      setSaving(false)
    }
  }

  function setEventDayOnDraft(nextDay: EventDay) {
    setDraft((prev) => {
      if (!prev || prev.day === nextDay) return prev
      const pool = events.filter((e) => {
        if (nextDay === 'saturday') return e.day === 'saturday'
        return inFridayColumn(e.day)
      })
      const others = draftIsNew ? pool : pool.filter((e) => e.id !== prev.id)
      const max = others.reduce((m, e) => Math.max(m, e.sortOrder), -1)
      return { ...prev, day: nextDay, sortOrder: max + 1 }
    })
  }

  function startAddEvent() {
    setSaveNotice(null)
    const row = newEventRecord(events)
    setDraft(row)
    setDraftIsNew(true)
    setDraftBaselineJson(JSON.stringify(row))
    setView('edit')
  }

  function startEditEvent(id: string) {
    const row = events.find((e) => e.id === id)
    if (!row) return
    setSaveNotice(null)
    const copy = cloneEvent(row)
    setDraft(copy)
    setDraftIsNew(false)
    setDraftBaselineJson(JSON.stringify(copy))
    setView('edit')
  }

  function tryLeaveEdit() {
    if (!draft || draftBaselineJson === null) {
      setView('list')
      setDraft(null)
      setDraftIsNew(false)
      setDraftBaselineJson(null)
      return
    }
    if (JSON.stringify(draft) !== draftBaselineJson) {
      if (!window.confirm('Discard changes to this event?')) return
    }
    setView('list')
    setDraft(null)
    setDraftIsNew(false)
    setDraftBaselineJson(null)
  }

  async function onSaveDraft(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    const merged: EventRecord[] = draftIsNew
      ? [...events, draft]
      : events.map((ev) => (ev.id === draft.id ? draft : ev))
    const ok = await persistEvents(merged)
    if (ok) {
      setView('list')
      setDraft(null)
      setDraftIsNew(false)
      setDraftBaselineJson(null)
    }
  }

  async function onPickLogo(file: File | null) {
    if (!file || !draft) return
    const token = getStoredSessionToken()
    if (!token) {
      setSaveNotice({ kind: 'error', message: 'Not signed in.' })
      return
    }
    setSaveNotice(null)
    setUploadingLogo(true)
    try {
      const result = await uploadEventLogo(token, file)
      if (result.ok) {
        setDraft((d) => (d ? { ...d, logoUrl: result.publicUrl } : d))
      } else {
        setSaveNotice({ kind: 'error', message: result.message })
      }
    } finally {
      setUploadingLogo(false)
    }
  }

  async function removeEvent(id: string) {
    if (!window.confirm('Remove this event from the schedule?')) return
    const next = events.filter((e) => e.id !== id)
    await persistEvents(next)
  }

  async function moveEvent(id: string, dir: -1 | 1) {
    const next = reorderEvents(events, id, dir)
    if (next === events) return
    await persistEvents(next)
  }

  if (status === 'loading') {
    return (
      <p className={styles.status} role="status">
        Loading events…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div>
        <p className={styles.error} role="alert">
          {loadError ?? 'Could not load events.'}
        </p>
        <p className={styles.status}>
          Upload <code className={styles.mono}>src/content/defaultEvents.json</code> to your CMS bucket as{' '}
          <code className={styles.mono}>events.json</code> (see AWS-SETUP.md), or set{' '}
          <code className={styles.mono}>VITE_EVENTS_URL</code>.
        </p>
      </div>
    )
  }

  if (view === 'edit' && draft) {
    const draftDirty =
      draftBaselineJson !== null && JSON.stringify(draft) !== draftBaselineJson

    return (
      <div className={evStyles.editWrap}>
        <p className={styles.status} style={{ marginTop: 0 }}>
          <button type="button" className={styles.rowBtn} onClick={tryLeaveEdit}>
            ← Back to list
          </button>
        </p>
        <h3 className={evStyles.editTitle}>{draftIsNew ? 'New event' : 'Edit event'}</h3>
        <form className={styles.form} onSubmit={onSaveDraft}>
          <div className={evStyles.field}>
            <label className={evStyles.label} htmlFor="ev-sort-order">
              Sort order
            </label>
            <input
              id="ev-sort-order"
              className={styles.input}
              style={{ maxWidth: '8rem' }}
              type="number"
              inputMode="numeric"
              value={draft.sortOrder}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, sortOrder: Number(e.target.value) || 0 } : d,
                )
              }
            />
            <p className={evStyles.hint}>
              Lower numbers appear first within the same day column. Friday and “both days” share one list.
            </p>
          </div>

          <div className={evStyles.field}>
            <label className={evStyles.label} htmlFor="ev-day">
              Day placement
            </label>
            <select
              id="ev-day"
              className={styles.select}
              value={draft.day}
              onChange={(e) => setEventDayOnDraft(e.target.value as EventDay)}
            >
              {EVENT_DAYS.map((d) => (
                <option key={d} value={d}>
                  {EVENT_DAY_LABELS[d]}
                </option>
              ))}
            </select>
          </div>

          <div className={evStyles.field}>
            <label className={evStyles.label} htmlFor="ev-title">
              Title
            </label>
            <input
              id="ev-title"
              className={styles.input}
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
            />
          </div>

          <div className={evStyles.field}>
            <label className={evStyles.label} htmlFor="ev-desc">
              Description
            </label>
            <textarea
              id="ev-desc"
              className={styles.input}
              rows={5}
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, description: e.target.value } : d))
              }
            />
          </div>

          <div className={evStyles.field}>
            <label className={evStyles.label} htmlFor="ev-icon">
              Icon (when no card image)
            </label>
            <select
              id="ev-icon"
              className={styles.select}
              value={draft.iconKey}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, iconKey: e.target.value as EventIconKey } : d,
                )
              }
            >
              {EVENT_ICON_KEYS.map((k) => (
                <option key={k} value={k}>
                  {EVENT_ICON_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className={evStyles.field}>
            <span className={evStyles.label}>Card image</span>
            <p className={evStyles.hint}>
              Uploading replaces the emoji on the public site until you clear the image. Save this event after
              upload to publish.
            </p>
            {draft.logoUrl ? (
              <img
                className={evStyles.logoPreviewEdit}
                src={draft.logoUrl}
                alt=""
                decoding="async"
              />
            ) : null}
            <input
              className={styles.fileInput}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              disabled={uploadingLogo}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                e.target.value = ''
                void onPickLogo(f)
              }}
            />
            {draft.logoUrl ? (
              <button
                type="button"
                className={styles.rowBtn}
                onClick={() =>
                  setDraft((d) => (d ? { ...d, logoUrl: '', logoLinkUrl: '' } : d))
                }
              >
                Clear image
              </button>
            ) : null}
            {draft.logoUrl ? (
              <div className={evStyles.field} style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                <label className={evStyles.label} htmlFor="ev-logo-link">
                  Logo link (optional)
                </label>
                <input
                  id="ev-logo-link"
                  className={styles.input}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://example.com"
                  value={draft.logoLinkUrl ?? ''}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, logoLinkUrl: e.target.value } : d))
                  }
                />
                <p className={evStyles.hint}>
                  If set, visitors can click the card image to open this site in a new tab. Use HTTPS only.
                </p>
              </div>
            ) : null}
          </div>

          <div className={evStyles.field}>
            <label className={evStyles.label} htmlFor="ev-jump-id">
              Jump target section id
            </label>
            <input
              id="ev-jump-id"
              className={styles.input}
              type="text"
              placeholder="e.g. food-trucks-heading"
              value={draft.jumpToSectionId}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, jumpToSectionId: e.target.value } : d))
              }
            />
          </div>

          <div className={evStyles.field}>
            <label className={evStyles.label} htmlFor="ev-jump-label">
              Jump link label
            </label>
            <input
              id="ev-jump-label"
              className={styles.input}
              type="text"
              value={draft.jumpLinkLabel}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, jumpLinkLabel: e.target.value } : d))
              }
            />
          </div>

          <div className={evStyles.field}>
            <label className={styles.mono} style={{ fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={draft.badge === 'maybe'}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, badge: e.target.checked ? 'maybe' : undefined } : d,
                  )
                }
              />{' '}
              “Maybe” ribbon on the card
            </label>
          </div>

          <div className={evStyles.editActions}>
            <button
              className={styles.saveBtn}
              type="submit"
              disabled={saving || (!draftDirty && !draftIsNew)}
            >
              {saving ? 'Saving…' : 'Save event'}
            </button>
            <button type="button" className={styles.rowBtn} onClick={tryLeaveEdit}>
              Cancel
            </button>
            {saveNotice?.kind === 'error' ? (
              <p className={styles.saveErr} role="alert" style={{ margin: 0, flex: '1 1 100%' }}>
                {saveNotice.message}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    )
  }

  const rows = sortEventsForAdminTable(events)

  return (
    <div>
      <p className={styles.status} style={{ marginTop: 0 }}>
        Edit one event at a time. Reorder and remove save immediately. Card image uploads to storage; click{' '}
        <strong>Save event</strong> on the edit screen to publish changes.
      </p>
      <div className={styles.toolbar}>
        <button type="button" className={styles.addBtn} onClick={startAddEvent} disabled={saving}>
          Add event
        </button>
      </div>

      <section className={styles.typeBlock} aria-labelledby="events-editor-heading">
        <h3 id="events-editor-heading" className={styles.typeTitle}>
          Schedule events
        </h3>
        <div className={evStyles.listWrap}>
          <table className={`${styles.table} ${evStyles.listTable}`}>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Day</th>
                <th scope="col">Title</th>
                <th scope="col">Card</th>
                <th scope="col">Flags</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.mono}>
                    No events. Use “Add event”.
                  </td>
                </tr>
              ) : (
                rows.map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.sortOrder}</td>
                    <td>{EVENT_DAY_LABELS[ev.day]}</td>
                    <td className={evStyles.titleCell}>
                      <span className={evStyles.titleClamp} title={ev.title}>
                        {ev.title}
                      </span>
                      {ev.description.trim() ? (
                        <span className={evStyles.metaMuted} title={ev.description}>
                          {' '}
                          — {ev.description.slice(0, 48)}
                          {ev.description.length > 48 ? '…' : ''}
                        </span>
                      ) : null}
                    </td>
                    <td className={evStyles.emojiCell}>
                      {ev.logoUrl ? (
                        <img
                          className={evStyles.thumb}
                          src={ev.logoUrl}
                          alt=""
                          decoding="async"
                        />
                      ) : (
                        <span title={EVENT_ICON_LABELS[ev.iconKey]}>
                          {EVENT_ICON_EMOJI[ev.iconKey] || '—'}
                        </span>
                      )}
                    </td>
                    <td className={evStyles.metaMuted}>
                      {[
                        ev.badge === 'maybe' ? 'Maybe' : null,
                        ev.jumpToSectionId.trim() ? 'Jump' : null,
                        ev.logoUrl && (ev.logoLinkUrl ?? '').trim().startsWith('https://')
                          ? 'Logo link'
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                    <td>
                      <div className={evStyles.listActions}>
                        <button
                          type="button"
                          className={styles.rowBtn}
                          disabled={saving}
                          onClick={() => startEditEvent(ev.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.rowBtn}
                          disabled={saving}
                          onClick={() => void moveEvent(ev.id, -1)}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className={styles.rowBtn}
                          disabled={saving}
                          onClick={() => void moveEvent(ev.id, 1)}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                          disabled={saving}
                          onClick={() => void removeEvent(ev.id)}
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
        </div>
      </section>

      <div className={styles.saveRow}>
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
    </div>
  )
}
