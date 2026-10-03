import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import { api } from './api'
import Sidebar from './components/Sidebar'
import { Alert, Icon, Spinner } from './components/Ui'
import CartPage from './pages/CartPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import OrderDetailPage from './pages/OrderDetailPage'
import OrdersPage from './pages/OrdersPage'
import SuppliersPage from './pages/SuppliersPage'
import './App.css'

function routeFromHash() {
  const route = window.location.hash.replace(/^#/, '')
  return route.startsWith('/') ? route : '/dashboard'
}

function subscribeToRoute(onChange) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function DashboardApp() {
  const { token, user, loading, login, logout } = useAuth()
  const route = useSyncExternalStore(subscribeToRoute, routeFromHash, () => '/dashboard')
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [cart, setCart] = useState([])
  const [placingOrder, setPlacingOrder] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const navigate = useCallback((nextRoute) => {
    if (window.location.hash !== `#${nextRoute}`) window.location.hash = nextRoute
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (!loading && !token && route !== '/login') navigate('/login')
    if (!loading && token && route === '/login') navigate('/dashboard')
  }, [loading, token, route, navigate])

  const showMessage = useCallback((message, kind = 'success') => {
    setToast({ message, kind })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4500)
  }, [])

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const cartSupplierId = cart[0]?.supplierId
  const cartSupplier = selectedSupplier?.id === cartSupplierId
    ? selectedSupplier
    : cart.length ? { id: cartSupplierId, company_name: cart[0].supplierName } : null

  const addToCart = useCallback((product, supplier) => {
    if (Number(product.stock) <= 0) {
      showMessage('This product is out of stock.', 'error')
      return
    }
    if (cartSupplierId && cartSupplierId !== supplier.id) {
      showMessage('An order can only contain products from one supplier.', 'error')
      return
    }
    const existing = cart.find((item) => item.id === product.id)
    if (existing && existing.quantity >= Number(product.stock)) {
      showMessage('You have reached the available stock for this product.', 'error')
      return
    }
    setCart((items) => {
      if (existing) return items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...items, {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: Number(product.stock),
        unit: product.unit,
        quantity: 1,
        supplierId: supplier.id,
        supplierName: supplier.company_name,
      }]
    })
    showMessage(`${product.name} added to your cart.`)
  }, [cart, cartSupplierId, showMessage])

  const changeQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setCart((items) => items.filter((item) => item.id !== productId))
      return
    }
    setCart((items) => items.map((item) => item.id === productId
      ? { ...item, quantity: Math.min(quantity, item.stock) }
      : item))
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart((items) => items.filter((item) => item.id !== productId))
  }, [])

  const placeOrder = useCallback(async () => {
    if (!token || !cart.length || !cartSupplierId) return
    setPlacingOrder(true)
    try {
      const result = await api.createOrder(token, {
        supplierId: cartSupplierId,
        items: cart.map(({ id, quantity }) => ({ productId: id, quantity })),
      })
      setCart([])
      showMessage(`Order #${result.order.id} placed successfully.`)
      navigate(`/orders/${result.order.id}`)
    } catch (error) {
      showMessage(error.message, 'error')
    } finally {
      setPlacingOrder(false)
    }
  }, [token, cart, cartSupplierId, showMessage, navigate])

  const signOut = useCallback(() => {
    logout()
    setCart([])
    setSelectedSupplier(null)
    setToast(null)
    navigate('/login')
  }, [logout, navigate])

  if (loading) return <div className="auth-loading"><Spinner label="Verifying your session…" /></div>
  if (!token) return <LoginPage onLogin={login} />

  const activeRoute = route === '/login' ? '/dashboard' : route
  let page
  if (activeRoute === '/dashboard') {
    page = <DashboardPage token={token} user={user} onNavigate={navigate} />
  } else if (activeRoute === '/suppliers') {
    page = <SuppliersPage token={token} selectedSupplier={selectedSupplier} onSelectSupplier={setSelectedSupplier}
      cartSupplierId={cartSupplierId} onAddToCart={addToCart} onMessage={showMessage} />
  } else if (activeRoute === '/cart') {
    page = <CartPage cart={cart} supplier={cartSupplier} onNavigate={navigate} onQuantity={changeQuantity}
      onRemove={removeFromCart} onPlaceOrder={placeOrder} busy={placingOrder} />
  } else if (activeRoute === '/orders') {
    page = <OrdersPage key={token} token={token} onNavigate={navigate} />
  } else if (/^\/orders\/[^/]+$/.test(activeRoute)) {
    page = <OrderDetailPage key={activeRoute} token={token} orderId={activeRoute.split('/')[2]} onNavigate={navigate} />
  } else {
    page = <section className="content-card not-found"><span className="empty-icon"><Icon name="package" /></span><h2>Page not found</h2><button className="button button-primary" onClick={() => navigate('/dashboard')}>Go to overview</button></section>
  }

  return (
    <div className="app-shell">
      <Sidebar route={activeRoute} user={user} cartCount={cartCount} onNavigate={navigate} onLogout={signOut} />
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>StockVision</span><Icon name="arrow" size={13} /><strong>{activeRoute.startsWith('/orders/') ? 'Order details' : activeRoute.slice(1).replace(/^./, (letter) => letter.toUpperCase())}</strong></div>
          <div className="topbar-user"><span className="online-dot" /><span>{user?.name}</span><span className="avatar avatar-small">{(user?.name || 'S').charAt(0).toUpperCase()}</span></div>
        </header>
        <div className="page-content">{page}</div>
        <footer className="app-footer"><span>StockVision Shop Portal</span><span>Inventory that moves with you.</span></footer>
      </main>
      {toast && <div className="toast-holder"><Alert kind={toast.kind} onDismiss={() => setToast(null)}>{toast.message}</Alert></div>}
    </div>
  )
}

export default function App() {
  return <AuthProvider><DashboardApp /></AuthProvider>
}
