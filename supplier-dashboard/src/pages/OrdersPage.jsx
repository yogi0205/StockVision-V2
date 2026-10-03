import { useState } from 'react'
import { api } from '../api'
import { EmptyState, Icon, PageHeading, StatusBadge } from '../components/Ui'

const STATUS_OPTIONS = ['CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED']

export default function OrdersPage({ token, onMessage }) {
  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState('CONFIRMED')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [updatedOrder, setUpdatedOrder] = useState(null)

  async function updateStatus(event) {
    event.preventDefault()
    if (!/^[1-9]\d*$/.test(orderId)) {
      setError('Enter a valid positive order ID.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await api.updateOrderStatus(token, orderId, status)
      setUpdatedOrder(result.order)
      onMessage(`Order #${result.order.id} status updated to ${result.order.status.toLowerCase()}.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeading eyebrow="FULFILLMENT" title="Orders" description="Supplier status updates are supported; order listing and details are not exposed by the current API." />
      <div className="alert alert-info"><Icon name="warning" /><span>The backend currently restricts <code>GET /orders</code> and <code>GET /orders/:id</code> to shop users. There is no supplier order-list or order-details endpoint, so this page cannot show an order history without a backend change.</span></div>
      <section className="content-card orders-unavailable"><EmptyState icon="orders" title="Supplier order list unavailable">When you have a supplier order ID, you can submit a status transition below. The API validates supplier ownership and permitted transitions.</EmptyState></section>
      <section className="content-card form-card status-update-card">
        <div className="card-heading"><div><h2>Update order status</h2><p>Uses the existing supplier-only status endpoint.</p></div></div>
        <form className="status-form" onSubmit={updateStatus}>
          <div><label htmlFor="order-id">Order ID</label><input id="order-id" inputMode="numeric" value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Enter order ID" required /></div>
          <div><label htmlFor="order-status">New status</label><select id="order-status" value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option.toLowerCase()}</option>)}</select></div>
          <button className="button button-primary" disabled={busy}>{busy ? <><span className="spinner spinner-light" /> Updating…</> : <>Update status <Icon name="arrow" /></>}</button>
        </form>
        {error && <div className="alert alert-error form-feedback">{error}</div>}
        {updatedOrder && <div className="update-result"><span>Order #{updatedOrder.id} updated</span><StatusBadge status={updatedOrder.status} /></div>}
      </section>
    </>
  )
}
