import { useRef } from 'react';
import { OrderProvider } from './context/OrderContext';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import './global.css';

export default function App() {
  const formRef = useRef();

  return (
    <OrderProvider>
      <main className="container">
        <h1>📦 Order Tracker</h1>
        <OrderForm ref={formRef} />
        <hr />
        <OrderList formRef={formRef} />
      </main>
    </OrderProvider>
  );
}
