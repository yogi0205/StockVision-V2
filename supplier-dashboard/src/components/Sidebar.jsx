import { Icon } from './Ui'

const links = [
  { path: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { path: '/products', label: 'Products', icon: 'package' },
  { path: '/orders', label: 'Orders', icon: 'orders' },
  { path: '/profile', label: 'Profile', icon: 'user' },
]

export default function Sidebar({ route, user, companyName, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#/dashboard" onClick={(event) => { event.preventDefault(); onNavigate('/dashboard') }}>
        <span className="brand-mark">S</span><span>StockVision<span className="brand-subtitle">SUPPLIER PORTAL</span></span>
      </a>
      <p className="nav-label">WORKSPACE</p>
      <nav className="side-nav" aria-label="Main navigation">{links.map((link) => <a key={link.path} href={`#${link.path}`} className={`nav-link ${route === link.path ? 'active' : ''}`} onClick={(event) => { event.preventDefault(); onNavigate(link.path) }}><Icon name={link.icon} /><span>{link.label}</span></a>)}</nav>
      <div className="sidebar-bottom">
        <div className="account-card"><span className="avatar">{(companyName || user?.name || 'S').charAt(0).toUpperCase()}</span><span className="account-copy"><strong>{companyName || user?.name || 'Supplier account'}</strong><small>{user?.email}</small></span></div>
        <button className="logout-button" onClick={onLogout}><Icon name="logout" /><span>Sign out</span></button>
      </div>
    </aside>
  )
}
