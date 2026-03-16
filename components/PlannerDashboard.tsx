
import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { generateJobOrderPDF } from '../services/pdfGenerator';
import { JobOrder } from '../types';
import { FileText, Clock, RefreshCw, Download } from 'lucide-react';

interface PlannerDashboardProps {
  onSelectOrder: (id: string) => void;
}

const PlannerDashboard: React.FC<PlannerDashboardProps> = ({ onSelectOrder }) => {
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await StorageService.getAllOrders();
      setOrders(data.reverse()); // Newest first
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent, order: JobOrder) => {
    e.stopPropagation(); // Prevent row click
    try {
      const pdfBytes = await generateJobOrderPDF(order);
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `JobOrder_${order.poNumber}.pdf`;
      link.click();
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Failed to generate PDF");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (isoDate: string) => {
    if (!isoDate) return '';
    // Expecting YYYY-MM-DD from input type="date"
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto my-8 px-4 text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-4" />
        <p className="text-gray-600">Syncing with Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto my-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Job Orders</h2>
        <button onClick={fetchOrders} className="text-sm text-brand-600 hover:text-brand-800 flex items-center">
            <RefreshCw className="w-4 h-4 mr-1"/> Refresh
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul className="divide-y divide-gray-200">
          {orders.length === 0 && (
            <li className="p-6 text-center text-gray-500">No job orders found. Create one to get started.</li>
          )}
          {orders.map((order) => (
            <li key={order.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => onSelectOrder(order.id)}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-600 truncate">
                      PO: {order.poNumber} <span className="text-gray-500 ml-2">({order.customerName})</span>
                    </p>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center">
                      <div className="flex items-center text-sm text-gray-500 mr-6 mb-1 sm:mb-0">
                        <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {order.productName}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        Due: {formatDate(order.estDeliveryDate)}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex items-center space-x-4">
                    <button
                        onClick={(e) => handleDownloadPDF(e, order)}
                        className="text-gray-400 hover:text-brand-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                        title="Download PDF"
                    >
                        <Download className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PlannerDashboard;
