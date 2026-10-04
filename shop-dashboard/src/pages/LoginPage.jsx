import { useState } from 'react'
import { Alert, Icon } from '../components/Ui'

export default function LoginPage({ onLogin, registrationMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onLogin({ email, password })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <a className="brand login-brand" href="#/login">
          <span className="brand-mark">S</span>
          <span>StockVision<span className="brand-subtitle">SHOP PORTAL</span></span>
        </a>
        <div className="login-intro">
          <p className="eyebrow">SHOP WORKSPACE</p>
          <h1>Welcome back</h1>
          <p>Sign in to browse suppliers, manage orders, and keep your shelves stocked.</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          {registrationMessage && <Alert kind="success">{registrationMessage}</Alert>}
          <Alert>{error}</Alert>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="username" placeholder="you@business.com"
            value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" placeholder="Enter your password"
            value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="button button-primary login-submit" disabled={busy}>
            {busy ? <><span className="spinner spinner-light" /> Signing in…</> : <>Sign in <Icon name="arrow" /></>}
          </button>
        </form>
        <p className="login-footnote">Secure access for registered StockVision shop accounts.</p>
        <p className="login-footnote">New to StockVision? <a href="#/register">Create a shop account</a></p>
      </section>
      <aside className="login-art">
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="art-copy">
          <span className="art-kicker"><span className="online-dot" /> LIVE SUPPLY NETWORK</span>
          <h2>Your supply chain,<br />in clear view.</h2>
          <p>Discover trusted suppliers, order with confidence, and follow inventory as it moves.</p>
          <div className="art-stats">
            <div><strong>01</strong><span>Browse suppliers</span></div>
            <div><strong>02</strong><span>Place orders</span></div>
            <div><strong>03</strong><span>Track delivery</span></div>
          </div>
        </div>
        <div className="login-watermark"><Icon name="package" size={120} /></div>
      </aside>
    </main>
  )
}
