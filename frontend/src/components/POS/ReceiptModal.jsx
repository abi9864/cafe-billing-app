import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { X, Printer } from 'lucide-react';
import { receiptService } from '../../services';
import { formatCurrency } from '../../utils/calculations';
import { format } from 'date-fns';

export default function ReceiptModal({ order, onClose }) {
  const printRef = useRef();

  const { data: receipt } = useQuery({
    queryKey: ['receipt', order.id],
    queryFn: () => receiptService.getByOrder(order.id).then(r => r.data),
    retry: 2
  });

  const handlePrint = useReactToPrint({ content: () => printRef.current });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg">Receipt</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-secondary btn-sm">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>

        <div ref={printRef} className="receipt-print p-5">
          <div className="text-center mb-4">
            <h3 className="font-bold text-lg">Raja's Cafe</h3>
            <p className="text-xs text-gray-500">Point of Sale Receipt</p>
          </div>

          <div className="text-xs space-y-1 mb-4 pb-4 border-b border-dashed border-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-500">Order #</span>
              <span className="font-mono font-semibold">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="capitalize">{order.order_type}</span>
            </div>
            {order.table_number && (
              <div className="flex justify-between">
                <span className="text-gray-500">Table</span>
                <span>{order.table_number}</span>
              </div>
            )}
          </div>

          {order.items && (
            <div className="mb-4 pb-4 border-b border-dashed border-gray-300">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs py-0.5">
                  <span>{item.quantity}x {item.name}{item.variant_name ? ` (${item.variant_name})` : ''}</span>
                  <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs space-y-1 mb-4 pb-4 border-b border-dashed border-gray-300">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {parseFloat(order.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatCurrency(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>Thank you for your visit!</p>
            <p className="mt-1">Come back soon ☕</p>
          </div>
        </div>

        <div className="p-4 pt-0">
          <button onClick={onClose} className="btn-primary w-full">
            New Order
          </button>
        </div>
      </div>
    </div>
  );
}
