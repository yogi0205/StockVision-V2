import { useEffect, useState } from 'react'
import { api } from '../api'
import { Icon, PageHeading, Spinner, StatusBadge } from '../components/Ui'
import { formatAmount, formatDate } from '../components/formatters'

export default function OrderDetailPage({ token, orderId, onNavigate }) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.order(token, orderId)
      .then(({ order: result }) => { if (active) setOrder(result) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, orderId])

  return (
    <>
      <button className="back-link" onClick={() => onNavigate('/orders')}><Icon name="arrow" size={16} /> Back to orders</button>
      {loading ? <Spinner label="Loading order details…" /> : error ? <div className="alert alert-error">{error}</div> : order && <>
        <PageHeading eyebrow={`ORDER #${order.id}`} title="Order details" description={`Placed ${formatDate(order.createdAt)}`}
          action={<StatusBadge status={order.status} />} />
        <div className="detail-grid">
          <section className="content-card">
            <div className="card-heading"><div><h2>Items in this order</h2><p>{order.items?.length || 0} product lines</p></div></div>
            <div className="order-detail-items">{order.items?.map((item) => (
              <article className="detail-item" key={item.productId}>
                <span className="cart-product-icon"><Icon name="package" size={20} /></span>
                <div className="cart-product-name"><strong>{item.productName || `Product ${item.productId}`}</strong><small>{formatAmount(item.unitPrice)} × {item.quantity}</small></div>
                <strong>{formatAmount(item.lineTotal)}</strong>
              </article>
            ))}</div>
            <div className="detail-total"><span>Order total</span><strong>{formatAmount(order.totalAmount)}</strong></div>
          </section>
          <aside className="content-card detail-aside">
            <p className="eyebrow">SUPPLIER</p><h2>{order.supplierName || `Supplier ${order.supplierId}`}</h2>
            <div className="detail-info"><span>Order status</span><StatusBadge status={order.status} /></div>
            <div className="detail-info"><span>Order ID</span><strong>#{order.id}</strong></div>
            <div className="detail-info"><span>Placed</span><strong>{formatDate(order.createdAt)}</strong></div>
            <div className="detail-info"><span>Last updated</span><strong>{formatDate(order.updatedAt)}</strong></div>
            <button className="button button-secondary full-button" onClick={() => onNavigate('/orders')}><Icon name="orders" /> All orders</button>
          </aside>
        </div>
      </>}
    </>
  )
}
