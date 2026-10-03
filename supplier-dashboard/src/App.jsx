import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import Sidebar from './components/Sidebar'
import { Alert, Icon, Spinner } from './components/Ui'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import OrdersPage from './pages/OrdersPage'
import ProductsPage from './pages/ProductsPage'
import ProfilePage from './pages/ProfilePage'
import './App.css'

function routeFromHash() {
  const route = window.location.hash.replace(/^#/, '')
  return route.startsWith('/') ? route : '/dashboard'
}

function subscribeToRoute(onChange) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function SupplierApp() {
  const { token, user, loading, login, logout } = useAuth()
  const route = useSyncExternalStore(subscribeToRoute, routeFromHash, () => '/dashboard')
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const navigate = useCallback((nextRoute) => {
    if (window.location.hash !== `#${nextRoute}`) window.location.hash = nextRoute
  }, [])

  const showMessage = useCallback((message, kind = 'success') => {
    setToast({ message, kind })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4500)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (!loading && !token && route !== '/login') navigate('/login')
    if (!loading && token && route === '/login') navigate('/dashboard')
  }, [loading, token, route, navigate])

  const dismissToast = useCallback(() => setToast(null), [])
  const activeRoute = route === '/login' ? '/dashboard' : route
  const page = useMemo(() => {
    if (activeRoute === '/dashboard') {
      return <DashboardPage token={token} user={user} onNavigate={navigate} />
    }
    if (activeRoute === '/products') return <ProductsPage token={token} onMessage={showMessage} />
    if (activeRoute === '/orders') return <OrdersPage token={token} onMessage={showMessage} />
    if (activeRoute === '/profile') return <ProfilePage />
    return <section className="content-card not-found"><span className="empty-icon"><Icon name="package" /></span><h2>Page not found</h2><button className="button button-primary" onClick={() => navigate('/dashboard')}>Go to dashboard</button></section>
  }, [activeRoute, token, user, navigate, showMessage])

  if (loading) return <div className="auth-loading"><Spinner label="Verifying your session…" /></div>
  if (!token) return <LoginPage onLogin={login} />

  return (
    <div className="app-shell">
      <Sidebar route={activeRoute} user={user} onNavigate={navigate} onLogout={() => { logout(); setToast(null); navigate('/login') }} />
      <main className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>StockVision</span><Icon name="arrow" size={13} /><strong>{activeRoute.slice(1).replace(/^./, (letter) => letter.toUpperCase())}</strong></div><div className="topbar-user"><span className="online-dot" /><span>{user?.name}</span><span className="avatar avatar-small">{(user?.name || 'S').charAt(0).toUpperCase()}</span></div></header>
        <div className="page-content">{page}</div>
        <footer className="app-footer"><span>StockVision Supplier Portal</span><span>Inventory that moves with you.</span></footer>
      </main>
      {toast && <div className="toast-holder"><Alert kind={toast.kind} onDismiss={dismissToast}>{toast.message}</Alert></div>}
    </div>
  )
}

export default function App() {
  return <AuthProvider><SupplierApp /></AuthProvider>
}
