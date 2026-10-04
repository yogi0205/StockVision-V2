import { useState } from 'react'
import { api } from '../api'
import { Alert, Icon } from '../components/Ui'

export default function RegisterPage({ onRegistered }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    location: '',
  })
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState([])
  const [busy, setBusy] = useState(false)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setValidationErrors([])
    setBusy(true)
    try {
      await api.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'SUPPLIER',
        companyName: form.companyName.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
      })
      onRegistered()
    } catch (registrationError) {
      setError(registrationError.message)
      setValidationErrors(registrationError.errors || [])
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen registration-screen">
      <section className="login-panel">
        <a className="brand login-brand" href="#/login"><span className="brand-mark">S</span><span>StockVision<span className="brand-subtitle">SUPPLIER PORTAL</span></span></a>
        <div className="login-intro"><p className="eyebrow">SUPPLIER WORKSPACE</p><h1>Create your account</h1><p>Register your business to manage products, inventory, and orders.</p></div>
        <form className="login-form" onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          {validationErrors.length > 0 && (
            <ul className="registration-errors">
              {validationErrors.map(({ field, message }, index) => (
                <li key={`${field}-${index}`}><strong>{field}:</strong> {message}</li>
              ))}
            </ul>
          )}
          <label htmlFor="register-name">Name</label>
          <input id="register-name" name="name" autoComplete="name" maxLength="100" value={form.name} onChange={updateField} required />
          <label htmlFor="register-email">Email address</label>
          <input id="register-email" name="email" type="email" autoComplete="email" maxLength="255" value={form.email} onChange={updateField} required />
          <label htmlFor="register-password">Password</label>
          <input id="register-password" name="password" type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={updateField} required />
          <label htmlFor="register-phone">Phone</label>
          <input id="register-phone" name="phone" type="tel" autoComplete="tel" maxLength="20" value={form.phone} onChange={updateField} required />
          <label htmlFor="register-company">Company name</label>
          <input id="register-company" name="companyName" autoComplete="organization" maxLength="150" value={form.companyName} onChange={updateField} required />
          <label htmlFor="register-location">Location</label>
          <input id="register-location" name="location" autoComplete="address-level2" maxLength="255" value={form.location} onChange={updateField} required />
          <button className="button button-primary login-submit" disabled={busy}>{busy ? <><span className="spinner spinner-light" /> Creating account…</> : <>Create account <Icon name="arrow" /></>}</button>
        </form>
        <p className="login-footnote">Already registered? <a href="#/login">Sign in</a></p>
      </section>
      <aside className="login-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-copy"><span className="art-kicker"><span className="online-dot" /> SUPPLIER NETWORK</span><h2>Keep your inventory<br />moving forward.</h2><p>One clear workspace for your products, stock levels, and customer orders.</p><div className="art-stats"><div><strong>01</strong><span>Manage catalog</span></div><div><strong>02</strong><span>Update stock</span></div><div><strong>03</strong><span>Move orders</span></div></div></div><div className="login-watermark"><Icon name="package" size={120} /></div></aside>
    </main>
  )
}
