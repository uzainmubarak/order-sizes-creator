import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getAllOrders, saveOrder as dbSave, deleteOrder as dbDelete } from '../lib/db';

const OrderContext = createContext(null);

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);

  // Load on mount
  useEffect(() => {
    getAllOrders()
      .then(setOrders)
      .catch((err) => console.error('Failed to load orders:', err));
  }, []);

  const saveOrder = async (orderData) => {
    await dbSave(orderData);
    const updated = await getAllOrders();
    setOrders(updated.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
  };

  const removeOrder = async (id) => {
    await dbDelete(id);
    const updated = await getAllOrders();
    setOrders(updated.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
  };

  return (
    <OrderContext.Provider value={{ orders, saveOrder, removeOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used within OrderProvider');
  return ctx;
}
