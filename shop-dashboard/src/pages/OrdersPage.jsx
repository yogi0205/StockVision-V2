import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { EmptyState, Icon, PageHeading, Spinner, StatusBadge } from '../components/Ui'
import { formatAmount, formatDate } from '../components/formatters'

export default function OrdersPage({ token, onNavigate }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setRefreshing(true)
    try {
      const { orders: items } = await api.orders(token)
      setOrders(items || [])
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    let active = true
    const loadOrders = async () => {
      try {
        const { orders: items } = await api.orders(token)
        if (active) {
          setOrders(items || [])
          setError('')
        }
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadOrders()
    const interval = window.setInterval(loadOrders, 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [token])

  return (
    <>
      <PageHeading eyebrow="PURCHASING" title="Your orders" description="Review order details and keep track of supplier progress."
        action={<button className="button button-secondary" disabled={refreshing} onClick={() => refresh(true)}><Icon name="refresh" /> {refreshing ? 'Refreshing…' : 'Refresh'}</button>} />
      {error && <div className="alert alert-error">{error}</div>}
      <section className="content-card">
        {loading ? <Spinner label="Loading your orders…" /> : orders.length === 0 ? <EmptyState icon="orders" title="No orders to show" action={<button className="button button-primary" onClick={() => onNavigate('/suppliers')}>Browse suppliers</button>}>Orders you place will appear here with their latest status.</EmptyState> :
          <div className="table-wrap"><table><thead><tr><th>ORDER</th><th>SUPPLIER</th><th>PLACED</th><th>LAST UPDATED</th><th>TOTAL</th><th>STATUS</th><th /></tr></thead>
            <tbody>{orders.map((order) => <tr key={order.id} className="clickable-row" onClick={() => onNavigate(`/orders/${order.id}`)}>
              <td className="order-number">#{order.id}</td><td>{order.supplierName || `Supplier ${order.supplierId}`}</td><td>{formatDate(order.createdAt)}</td><td>{formatDate(order.updatedAt)}</td><td className="amount-cell">{formatAmount(order.totalAmount)}</td><td><StatusBadge status={order.status} /></td><td><Icon name="arrow" size={16} /></td>
            </tr>)}</tbody></table></div>}
      </section>
      <p className="refresh-hint"><span className="online-dot" /> Order statuses refresh automatically every 30 seconds.</p>
    </>
  )
}
