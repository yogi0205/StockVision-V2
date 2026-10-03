import { useAuth } from '../auth/useAuth'
import { PageHeading } from '../components/Ui'

export default function ProfilePage() {
  const { user } = useAuth()
  const fields = [
    ['Name', user?.name],
    ['Email', user?.email],
    ['Role', user?.role],
    ['Account status', user?.is_active ? 'Active' : 'Inactive'],
  ]

  return (
    <>
      <PageHeading eyebrow="ACCOUNT" title="Profile" description="Account information returned by the authenticated profile endpoint." />
      <section className="content-card profile-card">
        <div className="profile-banner"><span className="profile-avatar">{(user?.name || 'S').charAt(0).toUpperCase()}</span><div><h2>{user?.name || 'Supplier account'}</h2><p>Supplier user</p></div></div>
        <div className="profile-fields">{fields.map(([label, value]) => <div className="profile-field" key={label}><span>{label}</span><strong>{value ?? 'Not provided by the API'}</strong></div>)}</div>
        <p className="profile-note">The current <code>GET /auth/me</code> response contains user details only; company name, phone, and location are not included.</p>
      </section>
    </>
  )
}
