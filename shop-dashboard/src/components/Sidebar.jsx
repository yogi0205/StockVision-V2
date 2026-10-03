import { Icon } from './Ui'

const links = [
  { path: '/dashboard', label: 'Overview', icon: 'grid' },
  { path: '/suppliers', label: 'Suppliers', icon: 'store' },
  { path: '/cart', label: 'Your cart', icon: 'cart' },
  { path: '/orders', label: 'Orders', icon: 'orders' },
]

export default function Sidebar({ route, user, cartCount, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#/dashboard" onClick={(event) => { event.preventDefault(); onNavigate('/dashboard') }}>
        <span className="brand-mark">S</span>
        <span>StockVision<span className="brand-subtitle">SHOP PORTAL</span></span>
      </a>
      <p className="nav-label">WORKSPACE</p>
      <nav className="side-nav" aria-label="Main navigation">
        {links.map((link) => (
          <a key={link.path} href={`#${link.path}`}
            className={`nav-link ${route === link.path || (link.path === '/orders' && route.startsWith('/orders/')) ? 'active' : ''}`}
            onClick={(event) => { event.preventDefault(); onNavigate(link.path) }}>
            <Icon name={link.icon} />
            <span>{link.label}</span>
            {link.path === '/cart' && cartCount > 0 && <span className="nav-count">{cartCount}</span>}
          </a>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="account-card">
          <span className="avatar">{(user?.name || 'S').charAt(0).toUpperCase()}</span>
          <span className="account-copy"><strong>{user?.name || 'Shop account'}</strong><small>Shop account</small></span>
        </div>
        <button className="logout-button" onClick={onLogout}><Icon name="logout" /><span>Sign out</span></button>
      </div>
    </aside>
  )
}
