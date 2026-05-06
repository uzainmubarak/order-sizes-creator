import { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { getOrder } from '../lib/db';

export default function OrderList({ formRef }) {
  const { orders, removeOrder } = useOrders();
  const [search, setSearch] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printData, setPrintData] = useState(null);

  const filtered = orders.filter(
    (o) =>
      !search ||
      (o.orderNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (order) => {
    if (formRef?.current?.startEdit) {
      formRef.current.startEdit(order);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this order?')) return;
    try {
      await removeOrder(id);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete order.');
    }
  };

  const handlePrint = async (id) => {
    try {
      const order = await getOrder(id);
      if (!order) {
        alert('Order not found.');
        return;
      }
      setPrintData(order);
      setPrinting(true);
      await new Promise((r) => setTimeout(r, 150));
      window.print();
      setPrinting(false);
    } catch (err) {
      console.error('Print error:', err);
      alert('Failed to load order for printing.');
    }
  };

  return (
    <>
      <div className="list-section" style={printing ? { display: 'none' } : undefined}>
        <div className="list-header">
          <h2>📋 Orders</h2>
          <input
            className="search-input"
            placeholder="🔍 Search by Order No or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No orders found.</p>
          </div>
        ) : (
          <div className="order-cards">
            {filtered.map((order) => (
              <div className="order-card" key={order.id}>
                <div className="order-top">
                  <div>
                    <span className="order-no">#{order.orderNo}</span>
                    <span className="order-meta">
                      {order.date} · {order.customer}
                    </span>
                  </div>
                  <span className="qty-badge">{order.totalQty} pcs</span>
                </div>

                <div className="order-bottom">
                  <div className="order-details">
                    <span className="label">Sizes:</span> {(order.sizes || []).join(', ')}
                    <br />
                    <span className="label">Colors:</span>{' '}
                    {(order.colors || []).map((c) => c.name).join(', ')}
                  </div>
                  <div className="order-actions">
                    <button className="btn btn-warning btn-sm" onClick={() => handlePrint(order.id)}>
                      🖨 Print
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleEdit(order)}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(order.id)}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print overlay */}
      {printing && printData && (
        <div className="print-section">
          <h1>Order Details</h1>
          <div className="print-info">
            <p>
              <strong>Order No:</strong> {printData.orderNo}
            </p>
            <p>
              <strong>Date:</strong> {printData.date}
            </p>
            <p>
              <strong>Customer/Vendor:</strong> {printData.customer}
            </p>
            <p>
              <strong>Total Pieces:</strong> {printData.totalQty}
            </p>
          </div>
          <table>
            <thead>
              <tr>
                <th rowSpan="2" style={{ minWidth: 140 }}>
                  Color
                </th>
                <th colSpan={(printData.sizes || []).length} className="sizes-header">
                  Sizes
                </th>
              </tr>
              <tr>
                {(printData.sizes || []).map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(printData.colors || []).map((color) => (
                <tr key={color.name}>
                  <td style={{ textAlign: 'left', fontWeight: 'bold' }}>
                    {color.name}
                  </td>
                  {(printData.sizes || []).map((s) => (
                    <td key={s}>{color.sizes?.[s] || 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
