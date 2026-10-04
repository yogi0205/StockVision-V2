import { useEffect, useState } from 'react'
import { api } from '../api'
import { Alert, EmptyState, Icon, PageHeading, Spinner, StatusBadge } from '../components/Ui'

const STATUS_OPTIONS = ['CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED']

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export default function OrdersPage({ token, onMessage }) {
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [order, setOrder] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState('CONFIRMED')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    api.supplierOrders(token)
      .then(({ orders: supplierOrders }) => {
        if (active) setOrders(supplierOrders)
      })
      .catch((requestError) => {
        if (active) setOrdersError(requestError.message)
      })
      .finally(() => {
        if (active) setOrdersLoading(false)
      })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (selectedOrderId === null) return undefined
    let active = true
    api.supplierOrder(token, selectedOrderId)
      .then(({ order: supplierOrder }) => {
        if (active) setOrder(supplierOrder)
      })
      .catch((requestError) => {
        if (active) setDetailError(requestError.message)
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })
    return () => { active = false }
  }, [selectedOrderId, token])

  function showOrderDetails(id) {
    setDetailLoading(true)
    setDetailError('')
    setOrder(null)
    setSelectedOrderId(id)
    setOrderId(String(id))
    setError('')
    setSuccess('')
  }

  async function updateStatus(event) {
    event.preventDefault()
    if (!/^[1-9]\d*$/.test(orderId)) {
      setError('Enter a valid positive order ID.')
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await api.updateOrderStatus(token, orderId, status)
      setOrder((current) => (
        current && String(current.id) === String(result.order.id)
          ? { ...current, status: result.order.status }
          : current
      ))
      setOrders((current) => current.map((item) => (
        String(item.id) === String(result.order.id)
          ? { ...item, status: result.order.status }
          : item
      )))
      const message = `Order #${result.order.id} status updated to ${result.order.status.toLowerCase()}.`
      setSuccess(message)
      onMessage(message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="FULFILLMENT"
        title="Orders"
        description="Review orders that include your products and update their fulfillment status."
      />
      <section className="content-card orders-list-card">
        <div className="card-heading">
          <div><h2>Incoming orders</h2><p>Orders containing products from your catalog</p></div>
        </div>
        {ordersLoading ? <Spinner label="Loading supplier orders…" /> : ordersError ? <Alert>{ordersError}</Alert> : orders.length === 0 ? (
          <EmptyState icon="orders" title="No orders yet">Orders containing your products will appear here.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ORDER</th><th>SHOP</th><th>PLACED</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th><th /></tr></thead>
              <tbody>
                {orders.map((item) => (
                  <tr key={item.id}>
                    <td className="strong-cell">#{item.id}</td>
                    <td>{item.shopName || item.customerName}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.items.length}</td>
                    <td>{Number(item.totalAmount).toFixed(2)}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td><button className="text-button" onClick={() => showOrderDetails(item.id)}>View details <Icon name="arrow" size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedOrderId !== null && (
        <section className="content-card supplier-order-detail">
          <div className="card-heading">
            <div><h2>Order #{selectedOrderId}</h2><p>Customer and line-item details</p></div>
            <button className="text-button" onClick={() => { setSelectedOrderId(null); setOrder(null) }}>Close</button>
          </div>
          {detailLoading ? <Spinner label="Loading order details…" /> : detailError ? <Alert>{detailError}</Alert> : order && (
            <>
              <div className="supplier-order-meta">
                <div><span>Shop</span><strong>{order.shopName || '—'}</strong></div>
                <div><span>Customer</span><strong>{order.customerName || '—'}</strong></div>
                <div><span>Email</span><strong>{order.customerEmail || '—'}</strong></div>
                <div><span>Placed</span><strong>{formatDate(order.createdAt)}</strong></div>
                <div><span>Status</span><StatusBadge status={order.status} /></div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>PRODUCT</th><th>QUANTITY</th><th>UNIT PRICE</th><th>LINE TOTAL</th></tr></thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.productId}>
                        <td className="strong-cell">{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>{Number(item.unitPrice).toFixed(2)}</td>
                        <td>{Number(item.lineTotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><th colSpan="3">ORDER TOTAL</th><th>{Number(order.totalAmount).toFixed(2)}</th></tr></tfoot>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      <section className="content-card form-card status-update-card">
        <div className="card-heading"><div><h2>Update order status</h2><p>Uses the existing supplier-only status endpoint.</p></div></div>
        <form className="status-form" onSubmit={updateStatus}>
          <div><label htmlFor="order-id">Order ID</label><input id="order-id" inputMode="numeric" value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Enter order ID" required /></div>
          <div><label htmlFor="order-status">New status</label><select id="order-status" value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option.toLowerCase()}</option>)}</select></div>
          <button className="button button-primary" disabled={busy}>{busy ? <><span className="spinner spinner-light" /> Updating…</> : <>Update status <Icon name="arrow" /></>}</button>
        </form>
        {error && <div className="form-feedback"><Alert>{error}</Alert></div>}
        {success && <div className="form-feedback"><Alert kind="success">{success}</Alert></div>}
      </section>
    </>
  )
}
