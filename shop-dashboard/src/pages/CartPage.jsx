import { EmptyState, Icon, PageHeading } from '../components/Ui'
import { formatAmount } from '../components/formatters'

export default function CartPage({ cart, supplier, onNavigate, onQuantity, onRemove, onPlaceOrder, busy }) {
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      <PageHeading eyebrow="YOUR ORDER" title="Shopping cart" description="Review your quantities before placing an order." />
      {cart.length === 0 ? <section className="content-card"><EmptyState icon="cart" title="Your cart is empty" action={<button className="button button-primary" onClick={() => onNavigate('/suppliers')}>Browse suppliers <Icon name="arrow" size={16} /></button>}>Find products from a supplier to start an order.</EmptyState></section> :
        <div className="cart-layout">
          <section className="content-card cart-items-card">
            <div className="card-heading"><div><h2>Order items <span className="inline-count">{itemCount}</span></h2><p>From {supplier?.company_name || 'selected supplier'}</p></div><button className="text-button" onClick={() => onNavigate('/suppliers')}>Continue browsing</button></div>
            <div className="cart-items">{cart.map((item) => (
              <article className="cart-item" key={item.id}>
                <span className="cart-product-icon"><Icon name="package" size={22} /></span>
                <div className="cart-product-name"><strong>{item.name}</strong><small>{formatAmount(item.price)} / {item.unit || 'unit'}</small></div>
                <div className="quantity-control">
                  <button aria-label={`Decrease ${item.name} quantity`} onClick={() => onQuantity(item.id, item.quantity - 1)}><Icon name="minus" size={15} /></button>
                  <span>{item.quantity}</span>
                  <button aria-label={`Increase ${item.name} quantity`} disabled={item.quantity >= Number(item.stock)} onClick={() => onQuantity(item.id, item.quantity + 1)}><Icon name="plus" size={15} /></button>
                </div>
                <strong className="cart-line-total">{formatAmount(Number(item.price) * item.quantity)}</strong>
                <button className="remove-button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}><Icon name="close" size={17} /></button>
              </article>
            ))}</div>
          </section>
          <aside className="content-card order-summary">
            <h2>Order summary</h2><p className="summary-supplier">{supplier?.company_name || 'Supplier'}</p>
            <div className="summary-row"><span>Items ({itemCount})</span><span>{formatAmount(total)}</span></div>
            <div className="summary-row"><span>Delivery</span><span className="included">Arranged by supplier</span></div>
            <div className="summary-total"><span>Estimated total</span><strong>{formatAmount(total)}</strong></div>
            <button className="button button-primary place-order" disabled={busy} onClick={onPlaceOrder}>
              {busy ? <><span className="spinner spinner-light" /> Placing order…</> : <>Place order <Icon name="arrow" /></>}
            </button>
            <p className="summary-note">Stock is confirmed when your order is placed.</p>
          </aside>
        </div>}
    </>
  )
}
