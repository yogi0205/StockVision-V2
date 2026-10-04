import { useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, EmptyState, Icon, PageHeading, Spinner } from '../components/Ui'

const LOW_STOCK_LIMIT = 5

export default function DashboardPage({ token, user, onNavigate }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')

  useEffect(() => {
    let active = true
    api.products(token)
      .then(({ products: items }) => {
        if (active) {
          const listedProducts = items || []
          setProducts(listedProducts)
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    let active = true
    api.supplierOrders(token)
      .then(({ orders: supplierOrders }) => {
        if (active) setOrders(supplierOrders)
      })
      .catch((requestError) => { if (active) setOrdersError(requestError.message) })
      .finally(() => { if (active) setOrdersLoading(false) })
    return () => { active = false }
  }, [token])

  const lowStock = products.filter((product) => Number(product.stock) <= LOW_STOCK_LIMIT).length
  const companyName = 'Company name unavailable'

  return (
    <>
      <PageHeading eyebrow="YOUR WORKSPACE" title={`Welcome, ${user?.name?.split(' ')[0] || 'supplier'}`} description="A quick overview of your product catalog and inventory." action={<button className="button button-primary" onClick={() => onNavigate('/products')}><Icon name="package" /> Manage products</button>} />
      <section className="welcome-banner"><div><span className="welcome-icon"><Icon name="user" size={22} /></span><div><p className="welcome-title">{companyName}</p><p>{user?.name} <span className="welcome-separator">·</span> {user?.email}</p></div></div><span className="account-status"><span className="online-dot" /> Supplier account</span></section>
      {loading ? <Spinner label="Loading supplier overview…" /> : error ? <div className="alert alert-error">{error}</div> : <>
        <section className="stats-grid" aria-label="Supplier activity">
          <article className="stat-card"><span className="stat-icon stat-violet"><Icon name="package" /></span><span className="stat-label">Active products</span><strong>{products.length}</strong><small>Products returned by the active catalog endpoint</small></article>
          <article className="stat-card"><span className="stat-icon stat-amber"><Icon name="warning" /></span><span className="stat-label">Low stock</span><strong>{lowStock}</strong><small>At or below {LOW_STOCK_LIMIT} units</small></article>
          <article className="stat-card"><span className="stat-icon stat-blue"><Icon name="orders" /></span><span className="stat-label">Incoming orders</span><strong>{ordersLoading ? '…' : orders.length}</strong><small>Orders containing your products</small></article>
        </section>
        {ordersError && <Alert>{ordersError}</Alert>}
        <section className="quick-grid">
          <button className="quick-card" onClick={() => onNavigate('/products')}><span className="quick-icon"><Icon name="package" /></span><span><strong>Products & stock</strong><small>View catalog and update inventory</small></span><Icon name="arrow" size={17} /></button>
          <button className="quick-card" onClick={() => onNavigate('/orders')}><span className="quick-icon quick-icon-blue"><Icon name="orders" /></span><span><strong>Order management</strong><small>Review incoming orders and update status</small></span><Icon name="arrow" size={17} /></button>
        </section>
        <section className="content-card">
          <div className="card-heading"><div><h2>Stock to review</h2><p>Products with 5 units or fewer</p></div><button className="text-button" onClick={() => onNavigate('/products')}>All products <Icon name="arrow" size={16} /></button></div>
          {products.filter((product) => Number(product.stock) <= LOW_STOCK_LIMIT).length === 0 ? <EmptyState icon="package" title="Stock levels look good">No products are currently at or below 5 units.</EmptyState> : <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>STOCK</th><th>PRICE</th></tr></thead><tbody>{products.filter((product) => Number(product.stock) <= LOW_STOCK_LIMIT).map((product) => <tr key={product.id}><td className="strong-cell">{product.name}</td><td>{product.category || '—'}</td><td><span className="stock-low">{product.stock} {product.unit}</span></td><td>{Number(product.price).toFixed(2)}</td></tr>)}</tbody></table></div>}
        </section>
      </>}
    </>
  )
}
