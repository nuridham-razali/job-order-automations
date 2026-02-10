
import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { JobOrder, OrderStatus } from '../types';
import { FileText, Clock, CheckCircle, RefreshCw } from 'lucide-react';

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
      setOrders([...data].reverse()); // Newest first, safely copied
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
        <h2 className="text-2xl font-bold text-gray-800">Planner Dashboard</h2>
        <button onClick={fetchOrders} className="text-sm text-brand-600 hover:text-brand-800 flex items-center">
            <RefreshCw className="w-4 h-4 mr-1"/> Refresh
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul className="divide-y divide-gray-200">
          {orders.length === 0 && (
            <li className="p-6 text-center text-gray-500">No job orders found. Switch to Sales role to create one.</li>
          )}
          {orders.map((order) => (
            <li key={order.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => onSelectOrder(order.id)}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-brand-600 truncate">
                    PO: {order.poNumber} <span className="text-gray-500 ml-2">({order.customerName})</span>
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      order.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status === OrderStatus.COMPLETED ? 'Completed' : 'Pending Action'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500 mr-6">
                      <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      {order.productName}
                    </p>
                    <p className="flex items-center text-sm text-gray-500">
                      <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      Due: {order.estDeliveryDate}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                     {order.status === OrderStatus.COMPLETED ? 
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1"/> : 
                        <span className="text-xs text-red-500">Needs Materials Planning</span>
                     }
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
