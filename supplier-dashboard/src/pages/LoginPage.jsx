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
        <a className="brand login-brand" href="#/login"><span className="brand-mark">S</span><span>StockVision<span className="brand-subtitle">SUPPLIER PORTAL</span></span></a>
        <div className="login-intro"><p className="eyebrow">SUPPLIER WORKSPACE</p><h1>Welcome back</h1><p>Manage your catalog, update inventory, and keep orders moving.</p></div>
        <form className="login-form" onSubmit={submit}>
          {registrationMessage && <Alert kind="success">{registrationMessage}</Alert>}
          {error && <div className="alert alert-error">{error}</div>}
          <label htmlFor="supplier-email">Email address</label><input id="supplier-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" required />
          <label htmlFor="supplier-password">Password</label><input id="supplier-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
          <button className="button button-primary login-submit" disabled={busy}>{busy ? <><span className="spinner spinner-light" /> Signing in…</> : <>Sign in <Icon name="arrow" /></>}</button>
        </form>
        <p className="login-footnote">Secure access for registered StockVision supplier accounts.</p>
        <p className="login-footnote">New to StockVision? <a href="#/register">Create a supplier account</a></p>
      </section>
      <aside className="login-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-copy"><span className="art-kicker"><span className="online-dot" /> SUPPLIER NETWORK</span><h2>Keep your inventory<br />moving forward.</h2><p>One clear workspace for your products, stock levels, and customer orders.</p><div className="art-stats"><div><strong>01</strong><span>Manage catalog</span></div><div><strong>02</strong><span>Update stock</span></div><div><strong>03</strong><span>Move orders</span></div></div></div><div className="login-watermark"><Icon name="package" size={120} /></div></aside>
    </main>
  )
}
