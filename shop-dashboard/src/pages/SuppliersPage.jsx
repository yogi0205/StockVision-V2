import { useEffect, useState } from 'react'
import { api, getInventorySocketUrl } from '../api'
import { EmptyState, Icon, PageHeading, Spinner } from '../components/Ui'
import { formatAmount } from '../components/formatters'

export default function SuppliersPage({ token, selectedSupplier, onSelectSupplier, cartSupplierId, onAddToCart, onMessage }) {
  const [suppliers, setSuppliers] = useState([])
  const [productState, setProductState] = useState({ supplierId: null, products: [] })
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [error, setError] = useState('')
  const [socketState, setSocketState] = useState({ supplierId: null, status: 'connecting' })
  const [stockNotice, setStockNotice] = useState('')
  const selectedSupplierId = selectedSupplier?.id
  const products = productState.supplierId === selectedSupplierId ? productState.products : []
  const loadingProducts = Boolean(selectedSupplierId && productState.supplierId !== selectedSupplierId)
  const currentSocketState = socketState.supplierId === selectedSupplierId ? socketState.status : 'connecting'

  useEffect(() => {
    let active = true
    api.suppliers(token)
      .then(({ suppliers: items }) => {
        if (!active) return
        setSuppliers(items || [])
        if (items?.length && !selectedSupplierId) onSelectSupplier(items[0])
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoadingSuppliers(false) })
    return () => { active = false }
  }, [token, selectedSupplierId, onSelectSupplier])

  useEffect(() => {
    if (!selectedSupplierId) return undefined
    let active = true
    api.supplierProducts(token, selectedSupplierId)
      .then(({ products: items }) => {
        if (active) {
          setError('')
          setProductState({ supplierId: selectedSupplierId, products: items || [] })
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message)
          setProductState({ supplierId: selectedSupplierId, products: [] })
        }
      })
    return () => { active = false }
  }, [token, selectedSupplierId])

  useEffect(() => {
    if (!selectedSupplierId || !token) return undefined
    let authenticated = false
    let subscriptionRequested = false
    let active = true
    let noticeTimeout
    let socket
    let socketErrorTimer

    try {
      socket = new WebSocket(getInventorySocketUrl())
    } catch {
      socketErrorTimer = window.setTimeout(() => {
        if (active) setSocketState({ supplierId: selectedSupplierId, status: 'offline' })
      }, 0)
      return () => {
        active = false
        window.clearTimeout(socketErrorTimer)
      }
    }

    socket.addEventListener('open', () => {
      if (active) socket.send(JSON.stringify({ type: 'auth', token }))
    })
    socket.addEventListener('message', (event) => {
      if (!active) return
      let message
      try { message = JSON.parse(event.data) } catch { return }
      if (message.type === 'auth.success') {
        authenticated = true
        if (active) {
          subscriptionRequested = true
          socket.send(JSON.stringify({ type: 'subscribe.supplier', supplierId: selectedSupplierId }))
        }
      } else if (message.type === 'subscription.success' && message.supplierId === selectedSupplierId) {
        if (active) setSocketState({ supplierId: selectedSupplierId, status: 'live' })
      } else if (message.type === 'subscription.error' || message.type === 'auth.error') {
        if (active) {
          setSocketState({ supplierId: selectedSupplierId, status: 'offline' })
          onMessage(message.message || 'Live inventory could not be connected.', 'error')
        }
      } else if (message.type === 'inventory.stock.updated' || message.type === 'inventory.stock.depleted') {
        if (message.data?.supplierId !== selectedSupplierId) return
        const { productId, oldStock, newStock } = message.data
        if (active) {
          setProductState((current) => current.supplierId === selectedSupplierId
            ? {
                ...current,
                products: current.products.map((product) => (
                  product.id === productId ? { ...product, stock: newStock } : product
                )),
              }
            : current)
          setStockNotice(`Stock updated: ${oldStock} → ${newStock}`)
          window.clearTimeout(noticeTimeout)
          noticeTimeout = window.setTimeout(() => setStockNotice(''), 4500)
        }
      }
    })
    socket.addEventListener('error', () => {
      if (active) setSocketState({ supplierId: selectedSupplierId, status: 'offline' })
    })
    socket.addEventListener('close', () => {
      if (active) setSocketState({ supplierId: selectedSupplierId, status: 'offline' })
    })

    return () => {
      active = false
      window.clearTimeout(socketErrorTimer)
      window.clearTimeout(noticeTimeout)
      if (socket.readyState === WebSocket.OPEN) {
        if (authenticated && subscriptionRequested) {
          socket.send(JSON.stringify({ type: 'unsubscribe.supplier', supplierId: selectedSupplierId }))
        }
        socket.close()
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    }
  }, [selectedSupplierId, token, onMessage])

  function selectSupplier(supplier) {
    if (cartSupplierId && cartSupplierId !== supplier.id) {
      onMessage('Your cart contains products from another supplier. Place or clear that order before switching suppliers.', 'error')
      return
    }
    onSelectSupplier(supplier)
  }

  return (
    <>
      <PageHeading eyebrow="SOURCING" title="Suppliers & products" description="Discover suppliers and add available products to your order." />
      {error && <div className="alert alert-error">{error}</div>}
      <div className="supplier-layout">
        <aside className="supplier-panel content-card">
          <div className="card-heading supplier-heading"><div><h2>Suppliers</h2><p>{suppliers.length} available</p></div></div>
          {loadingSuppliers ? <Spinner label="Loading suppliers…" /> : suppliers.length === 0 ? <EmptyState icon="store" title="No suppliers found">Suppliers will appear here when they’re available.</EmptyState> :
            <div className="supplier-list">{suppliers.map((supplier) => (
              <button key={supplier.id} className={`supplier-option ${selectedSupplier?.id === supplier.id ? 'selected' : ''}`}
                onClick={() => selectSupplier(supplier)}>
                <span className="supplier-avatar">{(supplier.company_name || 'S').charAt(0).toUpperCase()}</span>
                <span className="supplier-copy"><strong>{supplier.company_name}</strong><small>{supplier.location || 'Location not listed'}</small></span>
                <Icon name="arrow" size={16} />
              </button>
            ))}</div>}
        </aside>
        <section className="content-card product-panel">
          <div className="card-heading product-heading">
            <div><h2>{selectedSupplier?.company_name || 'Choose a supplier'}</h2><p>{selectedSupplier ? `${selectedSupplier.location || 'Supplier catalog'}${selectedSupplier.phone ? ` · ${selectedSupplier.phone}` : ''}` : 'Select a supplier to browse their catalog.'}</p></div>
            {selectedSupplier && <span className={`live-indicator ${currentSocketState}`}><span className="online-dot" />{currentSocketState === 'live' ? 'Live inventory' : currentSocketState === 'connecting' ? 'Connecting' : 'Live updates offline'}</span>}
          </div>
          {stockNotice && <div className="stock-notice"><span className="online-dot" />{stockNotice}</div>}
          {!selectedSupplier ? <EmptyState icon="store" title="Select a supplier" /> : loadingProducts ? <Spinner label="Loading catalog…" /> : products.length === 0 ? <EmptyState icon="package" title="No products yet">This supplier doesn’t have any active products in the catalog.</EmptyState> :
            <div className="product-grid">{products.map((product) => {
              const outOfStock = Number(product.stock) <= 0
              return <article className="product-card" key={product.id}>
                <div className="product-art"><span><Icon name="package" size={25} /></span><small>{product.category || 'GENERAL'}</small></div>
                <div className="product-info"><h3>{product.name}</h3><p>{product.category || 'Everyday essentials'}{product.unit ? ` · ${product.unit}` : ''}</p>
                  <div className="product-meta"><strong>{formatAmount(product.price)}</strong><span className={outOfStock ? 'stock-empty' : 'stock-available'}>{outOfStock ? 'Out of stock' : `${product.stock} ${product.unit || 'in stock'}`}</span></div>
                  <button className="button button-secondary add-button" disabled={outOfStock || (cartSupplierId && cartSupplierId !== selectedSupplier.id)}
                    onClick={() => onAddToCart(product, selectedSupplier)}>
                    <Icon name="plus" size={16} /> Add to order
                  </button>
                </div>
              </article>
            })}</div>}
        </section>
      </div>
    </>
  )
}
