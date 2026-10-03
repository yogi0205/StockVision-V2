import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { EmptyState, Icon, PageHeading, Spinner } from '../components/Ui'
import { formatAmount, formatDate } from '../components/formatters'

const emptyProduct = { name: '', category: '', unit: '', price: '', stock: '0' }

export default function ProductsPage({ token, onMessage }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyProduct)
  const [stockProduct, setStockProduct] = useState('')
  const [stock, setStock] = useState('')
  const [updatingStock, setUpdatingStock] = useState(false)

  const loadProducts = useCallback(async () => {
    const { products: items } = await api.products(token)
    setProducts(items || [])
    setError('')
  }, [token])

  useEffect(() => {
    let active = true
    api.products(token)
      .then(({ products: items }) => {
        if (active) {
          setProducts(items || [])
          setError('')
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  async function createProduct(event) {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      await api.createProduct(token, {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        unit: form.unit.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
      })
      await loadProducts()
      setForm(emptyProduct)
      onMessage('Product created successfully.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCreating(false)
    }
  }

  async function updateStock(event) {
    event.preventDefault()
    if (!stockProduct || !/^\d+$/.test(stock) || !Number.isSafeInteger(Number(stock))) {
      setError('Choose a product and enter a whole-number stock quantity of zero or more.')
      return
    }
    setUpdatingStock(true)
    setError('')
    try {
      await api.updateStock(token, stockProduct, Number(stock))
      await loadProducts()
      const product = products.find((item) => String(item.id) === stockProduct)
      onMessage(`${product?.name || 'Product'} stock updated successfully.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUpdatingStock(false)
    }
  }

  return (
    <>
      <PageHeading eyebrow="CATALOG" title="Products & stock" description="Manage your active catalog and update inventory." action={<button className="button button-secondary" onClick={() => { setLoading(true); loadProducts().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)) }}><Icon name="refresh" /> Refresh</button>} />
      {error && <div className="alert alert-error">{error}</div>}
      <div className="management-grid">
        <section className="content-card form-card">
          <div className="card-heading"><div><h2>Update stock</h2><p>Stock changes are sent to the supplier API.</p></div></div>
          <form className="stack-form" onSubmit={updateStock}>
            <label htmlFor="stock-product">Product</label>
            <select id="stock-product" value={stockProduct} onChange={(event) => setStockProduct(event.target.value)} required><option value="">Select a product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.stock} {product.unit}</option>)}</select>
            <label htmlFor="stock-quantity">New stock quantity</label>
            <input id="stock-quantity" type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} placeholder="Enter a whole number" required />
            <button className="button button-primary" disabled={updatingStock || !products.length}>{updatingStock ? <><span className="spinner spinner-light" /> Updating…</> : <><Icon name="edit" /> Update stock</>}</button>
          </form>
        </section>
        <section className="content-card form-card">
          <div className="card-heading"><div><h2>Add a product</h2><p>Create an active catalog item.</p></div></div>
          <form className="stack-form" onSubmit={createProduct}>
            <label htmlFor="product-name">Product name</label><input id="product-name" maxLength="150" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <div className="form-row"><div><label htmlFor="product-category">Category <span>(optional)</span></label><input id="product-category" maxLength="100" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></div><div><label htmlFor="product-unit">Unit</label><input id="product-unit" maxLength="50" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="e.g. kg" required /></div></div>
            <div className="form-row"><div><label htmlFor="product-price">Price</label><input id="product-price" type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></div><div><label htmlFor="product-stock">Opening stock</label><input id="product-stock" type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} required /></div></div>
            <button className="button button-primary" disabled={creating}>{creating ? <><span className="spinner spinner-light" /> Creating…</> : <><Icon name="plus" /> Create product</>}</button>
          </form>
        </section>
      </div>
      <section className="content-card products-table-card">
        <div className="card-heading"><div><h2>Your products</h2><p>{products.length} active products returned by the API</p></div></div>
        {loading ? <Spinner label="Loading products…" /> : products.length === 0 ? <EmptyState icon="package" title="No active products yet">Create a product to start building your catalog.</EmptyState> : <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th>UPDATED</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td className="strong-cell">{product.name}</td><td>{product.category || '—'}</td><td>{formatAmount(product.price)}</td><td><span className={Number(product.stock) <= 5 ? 'stock-low' : 'stock-available'}>{product.stock} {product.unit}</span></td><td><span className="status-badge status-completed">Active</span></td><td>{formatDate(product.updated_at)}</td></tr>)}</tbody></table></div>}
      </section>
    </>
  )
}
