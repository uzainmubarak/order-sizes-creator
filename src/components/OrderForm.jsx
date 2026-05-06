import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { useOrders } from '../context/OrderContext';

const OrderForm = forwardRef(function OrderForm(_, ref) {
  const { saveOrder } = useOrders();

  const [editingId, setEditingId] = useState(null);
  const [orderNo, setOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [customer, setCustomer] = useState('');
  const [sizes, setSizes] = useState(['XS', 'S', 'M', 'L', 'XL']);
  const [colors, setColors] = useState([{ name: '', quantities: {} }]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Total pieces — derived from sizes + colors
  const totalQty = colors.reduce(
    (sum, c) => sum + Object.values(c.quantities).reduce((s, q) => s + (parseInt(q) || 0), 0),
    0
  );

  // Expose startEdit to parent via ref
  useImperativeHandle(ref, () => ({
    startEdit(order) {
      setEditingId(order.id);
      setOrderNo(order.orderNo);
      setOrderDate(order.date);
      setCustomer(order.customer);
      setSizes([...(order.sizes || [])]);
      const rebuilt = (order.colors || []).map((c) => ({
        name: c.name,
        quantities: { ...(c.sizes || {}) },
      }));
      setColors(rebuilt.length > 0 ? rebuilt : [{ name: '', quantities: {} }]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Editing order #' + order.orderNo, 'info');
    },
  }));

  function showToast(message, type = 'info') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  // ── Sizes ────────────────────────────────────────────────
  const addSize = useCallback(() => {
    setSizes((prev) => [...prev, '']);
  }, []);

  const updateSize = useCallback((index, value) => {
    setSizes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const removeSize = useCallback((index) => {
    if (sizes.length <= 1) {
      showToast('Need at least one size.', 'error');
      return;
    }
    const removedSize = sizes[index];
    setSizes((prev) => prev.filter((_, i) => i !== index));
    // Clean up the removed size from ALL color quantities
    setColors((prev) =>
      prev.map((c) => {
        const q = { ...c.quantities };
        delete q[removedSize];
        return { ...c, quantities: q };
      })
    );
  }, [sizes]);

  // ── Colors ───────────────────────────────────────────────
  const addColorRow = useCallback(() => {
    setColors((prev) => [...prev, { name: '', quantities: {} }]);
  }, []);

  const removeColorRow = useCallback((index) => {
    if (colors.length <= 1) {
      showToast('Need at least one color row.', 'error');
      return;
    }
    setColors((prev) => prev.filter((_, i) => i !== index));
  }, [colors]);

  const updateColorName = useCallback((index, name) => {
    setColors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name };
      return next;
    });
  }, []);

  const updateQuantity = useCallback((colorIndex, sizeName, value) => {
    setColors((prev) => {
      const next = [...prev];
      next[colorIndex] = {
        ...next[colorIndex],
        quantities: { ...next[colorIndex].quantities, [sizeName]: value },
      };
      return next;
    });
  }, []);

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!orderNo.trim() || !orderDate || !customer.trim()) {
      showToast('Please fill Order No, Date, and Customer.', 'error');
      return;
    }

    const validSizes = sizes.map((s) => s.trim()).filter(Boolean);
    if (validSizes.length === 0) {
      showToast('Add at least one size.', 'error');
      return;
    }

    const validColors = colors
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), sizes: {} }));

    validColors.forEach((vc) => {
      const original = colors.find((c) => c.name.trim() === vc.name);
      if (original) {
        validSizes.forEach((sz) => {
          vc.sizes[sz] = parseInt(original.quantities[sz]) || 0;
        });
      }
    });

    if (validColors.length === 0) {
      showToast('Add at least one color with a name.', 'error');
      return;
    }

    const orderData = {
      orderNo: orderNo.trim(),
      date: orderDate,
      customer: customer.trim(),
      sizes: validSizes,
      colors: validColors,
      totalQty,
      createdAt: new Date().toISOString(),
    };

    if (editingId) {
      orderData.id = editingId;
    }

    try {
      await saveOrder(orderData);
      showToast(editingId ? 'Order updated!' : 'Order saved!', 'success');
      resetForm();
    } catch (err) {
      console.error('Save error:', err);
      if (err?.name === 'ConstraintError') {
        showToast('Duplicate Order No! Use a different number.', 'error');
      } else {
        showToast('Failed to save order.', 'error');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setOrderNo('');
    setOrderDate('');
    setCustomer('');
    setSizes(['XS', 'S', 'M', 'L', 'XL']);
    setColors([{ name: '', quantities: {} }]);
  };

  const validSizes = sizes.filter((s) => s.trim());

  return (
    <div className="form-section">
      <div className="form-header">
        <h2>{editingId ? '✏️ Edit Order' : '➕ New Order'}</h2>
        {totalQty > 0 && <span className="total-badge">Total: {totalQty} pcs</span>}
      </div>

      {/* Basic fields */}
      <div className="form-grid">
        <div className="field">
          <label>Order No *</label>
          <input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="e.g. ORD-001" />
        </div>
        <div className="field">
          <label>Date *</label>
          <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Customer / Vendor *</label>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
        </div>
      </div>

      {/* Sizes */}
      <div className="sizes-section">
        <span className="section-label">Sizes</span>
        <div className="sizes-list">
          {sizes.map((size, i) => (
            <div className="size-item" key={i}>
              <input
                value={size}
                onChange={(e) => updateSize(i, e.target.value)}
                placeholder="Size name"
              />
              <button className="btn btn-danger btn-sm" onClick={() => removeSize(i)} title="Remove size">
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={addSize}>
          + Add Size
        </button>
      </div>

      {/* Colors & Quantities Table */}
      <div className="table-section">
        <span className="section-label">Colors & Quantities</span>

        {validSizes.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="color-header" rowSpan="2">
                    Color
                  </th>
                  <th className="sizes-header" colSpan={validSizes.length}>
                    Sizes
                  </th>
                  <th className="action-header" rowSpan="2"></th>
                </tr>
                <tr>
                  {validSizes.map((size) => (
                    <th key={size}>{size}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colors.map((color, ci) => (
                  <tr key={ci}>
                    <td className="color-cell">
                      <input
                        value={color.name}
                        onChange={(e) => updateColorName(ci, e.target.value)}
                        placeholder="Color name"
                      />
                    </td>
                    {validSizes.map((size) => (
                      <td key={size}>
                        <input
                          type="number"
                          min="0"
                          value={color.quantities[size] ?? ''}
                          onChange={(e) => updateQuantity(ci, size, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => removeColorRow(ci)} title="Remove color">
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint">Add at least one size above to see the quantity table.</p>
        )}

        <button className="btn btn-secondary btn-sm" onClick={addColorRow}>
          + Add Color
        </button>
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button className="btn btn-success" onClick={handleSave}>
          {editingId ? '💾 Update Order' : '💾 Save Order'}
        </button>
        <button className="btn btn-outline" onClick={resetForm}>
          Clear
        </button>
      </div>

      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
});

export default OrderForm;
