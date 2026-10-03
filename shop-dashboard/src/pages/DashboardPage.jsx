import { useEffect, useState } from 'react'
import { api } from '../api'
import { EmptyState, Icon, PageHeading, Spinner, StatusBadge } from '../components/Ui'
import { formatAmount, formatDate } from '../components/formatters'

export default function DashboardPage({ token, user, onNavigate }) {
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([api.suppliers(token), api.orders(token)])
      .then(([supplierResult, orderResult]) => {
        if (active) {
          setSuppliers(supplierResult.suppliers || [])
          setOrders(orderResult.orders || [])
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  const activeOrders = orders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status)).length
  const recentOrders = orders.slice(0, 5)

  return (
    <>
      <PageHeading eyebrow="YOUR WORKSPACE" title={`Good to see you, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Here’s what’s happening with your supply orders."
        action={<button className="button button-primary" onClick={() => onNavigate('/suppliers')}><Icon name="plus" /> Browse suppliers</button>} />
      {loading ? <Spinner label="Loading your overview…" /> : error ? <div className="alert alert-error">{error}</div> : (
        <>
          <section className="welcome-banner">
            <div><span className="welcome-icon"><Icon name="store" size={22} /></span>
              <div><p className="welcome-title">Your shop account</p><p>{user?.email} <span className="welcome-separator">·</span> {user?.role}</p></div>
            </div>
            <span className="account-status"><span className="online-dot" /> Account active</span>
          </section>
          <section className="stats-grid" aria-label="Shop activity">
            <article className="stat-card"><span className="stat-icon stat-violet"><Icon name="store" /></span><span className="stat-label">Available suppliers</span><strong>{suppliers.length}</strong><small>Ready to supply your shop</small></article>
            <article className="stat-card"><span className="stat-icon stat-blue"><Icon name="orders" /></span><span className="stat-label">Total orders</span><strong>{orders.length}</strong><small>Orders placed by your shop</small></article>
            <article className="stat-card"><span className="stat-icon stat-amber"><Icon name="clock" /></span><span className="stat-label">In progress</span><strong>{activeOrders}</strong><small>Awaiting completion</small></article>
          </section>
          <section className="content-card">
            <div className="card-heading"><div><h2>Recent orders</h2><p>Your latest supplier activity</p></div><button className="text-button" onClick={() => onNavigate('/orders')}>View all <Icon name="arrow" size={16} /></button></div>
            {recentOrders.length === 0 ? <EmptyState icon="orders" title="No orders yet" action={<button className="button button-secondary" onClick={() => onNavigate('/suppliers')}>Explore suppliers</button>}>Your orders will show up here once you place one.</EmptyState> :
              <div className="table-wrap"><table><thead><tr><th>ORDER</th><th>SUPPLIER</th><th>DATE</th><th>TOTAL</th><th>STATUS</th><th /></tr></thead>
                <tbody>{recentOrders.map((order) => <tr key={order.id} onClick={() => onNavigate(`/orders/${order.id}`)} className="clickable-row">
                  <td className="order-number">#{order.id}</td><td>{order.supplierName || `Supplier ${order.supplierId}`}</td><td>{formatDate(order.createdAt)}</td><td className="amount-cell">{formatAmount(order.totalAmount)}</td><td><StatusBadge status={order.status} /></td><td><Icon name="arrow" size={16} /></td>
                </tr>)}</tbody></table></div>}
          </section>
        </>
      )}
    </>
  )
}
