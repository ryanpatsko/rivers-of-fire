import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useState,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EventsEditor from './admin/EventsEditor'
import GeneralSiteEditor from './admin/GeneralSiteEditor'
import SponsorsEditor from './admin/SponsorsEditor'
import VendorsEditor from './admin/VendorsEditor'
import {
  adminLogin,
  adminVerifySession,
  clearStoredSessionToken,
  getStoredSessionToken,
  isAdminAuthConfigured,
} from './lib/adminAuth'
import styles from './Admin.module.css'

type GateState = 'checking' | 'locked' | 'unlocked'

const ADMIN_TAB_IDS = ['general', 'events', 'vendors', 'sponsors'] as const
type AdminTabId = (typeof ADMIN_TAB_IDS)[number]

function isAdminTabId(value: string | null): value is AdminTabId {
  return value !== null && (ADMIN_TAB_IDS as readonly string[]).includes(value)
}

const TAB_LABELS: Record<AdminTabId, string> = {
  general: 'General',
  events: 'Events',
  vendors: 'Vendors',
  sponsors: 'Sponsors',
}

const TAB_INTRO: Record<AdminTabId, string> = {
  general:
    'Festival-wide settings—dates, venue, ticket link, social links, and other site-wide copy will be editable here.',
  events: '',
  vendors: '',
  sponsors: '',
}

function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: AdminTabId = isAdminTabId(tabParam) ? tabParam : 'general'

  function selectTab(id: AdminTabId) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('tab', id)
        return next
      },
      { replace: true },
    )
  }

  function onTabKeyDown(id: AdminTabId, e: KeyboardEvent<HTMLButtonElement>) {
    const i = ADMIN_TAB_IDS.indexOf(id)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = ADMIN_TAB_IDS[(i + 1) % ADMIN_TAB_IDS.length]!
      selectTab(next)
      queueMicrotask(() => document.getElementById(`admin-tab-${next}`)?.focus())
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = ADMIN_TAB_IDS[(i - 1 + ADMIN_TAB_IDS.length) % ADMIN_TAB_IDS.length]!
      selectTab(next)
      queueMicrotask(() => document.getElementById(`admin-tab-${next}`)?.focus())
    } else if (e.key === 'Home') {
      e.preventDefault()
      const next = ADMIN_TAB_IDS[0]!
      selectTab(next)
      queueMicrotask(() => document.getElementById(`admin-tab-${next}`)?.focus())
    } else if (e.key === 'End') {
      e.preventDefault()
      const next = ADMIN_TAB_IDS[ADMIN_TAB_IDS.length - 1]!
      selectTab(next)
      queueMicrotask(() => document.getElementById(`admin-tab-${next}`)?.focus())
    }
  }

  return (
    <section aria-label="Admin dashboard">
      <div className={styles.tabShell}>
        <div className={styles.tabList} role="tablist" aria-label="Admin sections">
          {ADMIN_TAB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`admin-tab-${id}`}
              aria-selected={activeTab === id}
              aria-controls={`admin-panel-${id}`}
              tabIndex={activeTab === id ? 0 : -1}
              className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
              onClick={() => selectTab(id)}
              onKeyDown={(e) => onTabKeyDown(id, e)}
            >
              {TAB_LABELS[id]}
            </button>
          ))}
        </div>

        {ADMIN_TAB_IDS.map((id) => (
          <div
            key={id}
            id={`admin-panel-${id}`}
            role="tabpanel"
            aria-labelledby={`admin-tab-${id}`}
            hidden={activeTab !== id}
            className={styles.tabPanel}
          >
            {id === 'general' ? (
              <GeneralSiteEditor />
            ) : id === 'events' ? (
              <EventsEditor />
            ) : id === 'vendors' ? (
              <VendorsEditor />
            ) : id === 'sponsors' ? (
              <SponsorsEditor />
            ) : (
              <>
                <h3 className={styles.tabPanelTitle}>{TAB_LABELS[id]}</h3>
                <p className={styles.muted}>{TAB_INTRO[id]}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Admin() {
  const passwordFieldId = useId()
  const [gate, setGate] = useState<GateState>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const configured = isAdminAuthConfigured()

  const verifyStored = useCallback(async () => {
    if (!configured) {
      setGate('locked')
      return
    }
    const token = getStoredSessionToken()
    if (!token) {
      setGate('locked')
      return
    }
    const ok = await adminVerifySession(token)
    if (ok) setGate('unlocked')
    else {
      clearStoredSessionToken()
      setGate('locked')
    }
  }, [configured])

  useEffect(() => {
    void verifyStored()
  }, [verifyStored])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await adminLogin(password)
      if (result.ok) {
        setPassword('')
        setGate('unlocked')
      } else {
        setError(result.message)
      }
    } finally {
      setBusy(false)
    }
  }

  function onSignOut() {
    clearStoredSessionToken()
    setGate('locked')
    setPassword('')
    setError(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerBrand}>
              <img
                className={styles.headerLogo}
                src="/Rivers-of-Fire-logo-transparent-background.png"
                alt=""
                width={56}
                height={84}
                decoding="async"
              />
              <div className={styles.headerTitles}>
                <p className={styles.kicker}>Pittsburgh&apos;s Rivers of Fire</p>
                <h1 className={styles.title}>Admin Dashboard</h1>
              </div>
            </div>
            <nav className={styles.headerNav} aria-label="Admin actions">
              {gate === 'unlocked' ? (
                <button type="button" className={styles.headerLink} onClick={onSignOut}>
                  Sign out
                </button>
              ) : null}
              <Link className={styles.headerLink} to="/">
                Back to site
              </Link>
            </nav>
          </div>
        </header>

        {gate === 'checking' ? (
          <p className={styles.muted} role="status">
            Checking session…
          </p>
        ) : gate === 'locked' ? (
          <section className={styles.panel} aria-labelledby="admin-sign-in-heading">
            <h2 id="admin-sign-in-heading" className={styles.panelTitle}>
              Sign in
            </h2>
            {!configured ? (
              <p className={styles.warn}>
                Set <code className={styles.code}>VITE_ADMIN_AUTH_URL</code> to your Lambda Function URL
                origin (same value everywhere): in Amplify Hosting → Environment variables for production
                builds, and in <code className={styles.code}>.env.local</code> for{' '}
                <code className={styles.code}>npm run dev</code>. See <code className={styles.code}>AWS-SETUP.md</code>{' '}
                in the repo.
              </p>
            ) : (
              <p className={styles.muted}>
                Session lasts 24 hours on this device. The password is checked on the server only.
              </p>
            )}
            <form className={styles.form} onSubmit={onSubmit}>
              <label className={styles.label} htmlFor={passwordFieldId}>
                Password
              </label>
              <input
                id={passwordFieldId}
                className={styles.input}
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={!configured || busy}
                required
              />
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              <button className={styles.submit} type="submit" disabled={!configured || busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </section>
        ) : (
          <div className={styles.panel}>
            <AdminDashboard />
          </div>
        )}
      </div>
    </div>
  )
}
