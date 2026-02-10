
import React, { useState, useEffect } from 'react';
import { JobOrder, MaterialRow, OrderStatus } from '../types';
import { StorageService } from '../services/storageService';
import { generateJobOrderPDF } from '../services/pdfGenerator';
import { Plus, Trash2, Download, CheckCircle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

interface PlannerFormProps {
  orderId: string;
  onClose: () => void;
}

const PlannerForm: React.FC<PlannerFormProps> = ({ orderId, onClose }) => {
  const [order, setOrder] = useState<JobOrder | undefined>(undefined);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const data = await StorageService.getOrderById(orderId);
        if (data) {
          setOrder(data);
          setMaterials(data.materials || []);
        }
        setLoading(false);
    };
    fetchData();
  }, [orderId]);

  const addMaterialRow = () => {
    setMaterials([
      ...materials,
      {
        id: Math.random().toString(36).substr(2, 9),
        itemCode: '',
        materialName: '',
        qtyRequired: 0,
        stockBalance: 0,
        qtyToOrder: 0,
        prNo: ''
      }
    ]);
  };

  const updateMaterial = (id: string, field: keyof MaterialRow, value: any) => {
    setMaterials(materials.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'qtyRequired' || field === 'stockBalance') {
            const req = field === 'qtyRequired' ? Number(value) : m.qtyRequired;
            const bal = field === 'stockBalance' ? Number(value) : m.stockBalance;
            updated.qtyToOrder = Math.max(0, req - bal);
        }
        return updated;
      }
      return m;
    }));
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const getValue = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || '';

  const getUpdatedOrderFromForm = (status: 'Closed' | 'Pending' | 'Delivered'): JobOrder | undefined => {
      if (!order) return undefined;
      return {
        ...order,
        materials,
        finalStatus: status,
        status: OrderStatus.COMPLETED,
        completionDate: getValue('completionDate'),
        
        jobOrderNo: getValue('jobOrderNo'),
        sectionBDate: getValue('sectionBDate'),
        remarks: getValue('remarks'),
        
        // Planner Signatures
        plannerPreparedBy: getValue('plannerPreparedBy'),
        plannerPreparedDate: getValue('plannerPreparedDate'),
        plannerReviewedBy: getValue('plannerReviewedBy'),
        plannerReviewedDate: getValue('plannerReviewedDate'),
        plannerApprovedBy: getValue('plannerApprovedBy'),
        plannerApprovedDate: getValue('plannerApprovedDate'),
        plannerReceivedBy: getValue('plannerReceivedBy'),
        plannerReceivedDate: getValue('plannerReceivedDate'),

        // Footer Status
        qtyDelivered: getValue('qtyDelivered'),
        pendingReason: getValue('pendingReason'),
    };
  }

  const handleSave = async (status: 'Closed' | 'Pending' | 'Delivered') => {
    if (!order) return;
    setIsSaving(true);
    
    const updatedOrder = getUpdatedOrderFromForm(status);
    if (!updatedOrder) return;

    try {
        await StorageService.updateOrder(updatedOrder);
        setOrder(updatedOrder);
        alert('Order updated!');
    } catch (e) {
        alert('Failed to update order.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!order) return;
    setIsSaving(true); 
    
    // Minimal delay to allow React to paint the 'Processing...' state
    setTimeout(async () => {
        try {
            // Auto-save before downloading
            const currentStatus = order.finalStatus || 'Pending';
            
            const updatedOrder = getUpdatedOrderFromForm(currentStatus);
            if (!updatedOrder) return;

            // Update local state immediately for responsiveness
            setOrder(updatedOrder);

            // Trigger Save AND PDF Generation in parallel to save time
            const savePromise = StorageService.updateOrder(updatedOrder);
            const pdfPromise = generateJobOrderPDF(updatedOrder);

            // Wait for PDF first to trigger download ASAP
            const pdfBytes = await pdfPromise;

            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `JobOrder_${updatedOrder.poNumber}.pdf`;
            document.body.appendChild(link); 
            link.click();
            document.body.removeChild(link);
            
            // Ensure save completes before reenabling UI
            await savePromise;

        } catch (e) {
            console.error("PDF Generation failed", e);
            alert("Failed to generate PDF. Check console for details.");
        } finally {
            setIsSaving(false);
        }
    }, 50);
  };

  if (loading || !order) return (
    <div className="max-w-6xl mx-auto my-8 px-4 text-center py-12">
      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-4" />
      <p className="text-gray-600">Loading Order Details...</p>
    </div>
  );

  return (
    <div className="bg-white shadow-xl rounded-lg overflow-hidden m-4 max-w-6xl mx-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
            <button onClick={onClose} className="mr-4 text-gray-500 hover:text-black"><ArrowLeft /></button>
            <h2 className="text-xl font-bold text-gray-900">Planning Section (Order: {order.poNumber})</h2>
        </div>
        <div className="space-x-2">
            <button onClick={handleDownloadPDF} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center inline-flex transition-colors">
                <Download className="w-4 h-4 mr-2" /> {isSaving ? 'Processing...' : 'Download PDF'}
            </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Header Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded border">
            <div>
                <label className="block text-sm font-bold text-gray-700">Job Order No</label>
                <input id="jobOrderNo" type="text" defaultValue={order.jobOrderNo || ''} className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900" placeholder="JO-2023-XXX" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700">Date</label>
                <input id="sectionBDate" type="date" defaultValue={order.sectionBDate || ''} className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900" />
            </div>
        </div>

        {/* Dynamic Materials Table */}
        <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-800">Material Requirements</h3>
                <button onClick={addMaterialRow} className="text-sm text-brand-600 hover:text-brand-800 font-semibold flex items-center">
                    <Plus className="w-4 h-4 mr-1"/> Add Item
                </button>
            </div>
            <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Item Code</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Raw @ Packaging Material</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Qty Required (kg/pcs)</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Stock Balance (kg/pcs)</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Qty to Order (kg/pcs)</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">PR No</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {materials.map((row) => (
                            <tr key={row.id}>
                                <td className="px-2 py-2"><input type="text" className="w-full border rounded px-1 bg-white text-gray-900" value={row.itemCode || ''} onChange={e => updateMaterial(row.id, 'itemCode', e.target.value)} /></td>
                                <td className="px-2 py-2"><input type="text" className="w-full border rounded px-1 bg-white text-gray-900" value={row.materialName || ''} onChange={e => updateMaterial(row.id, 'materialName', e.target.value)} /></td>
                                <td className="px-2 py-2"><input type="number" className="w-24 border rounded px-1 bg-white text-gray-900" value={row.qtyRequired || 0} onChange={e => updateMaterial(row.id, 'qtyRequired', e.target.value)} /></td>
                                <td className="px-2 py-2"><input type="number" className="w-24 border rounded px-1 bg-white text-gray-900" value={row.stockBalance || 0} onChange={e => updateMaterial(row.id, 'stockBalance', e.target.value)} /></td>
                                <td className="px-2 py-2"><input type="number" className="w-24 border rounded px-2 py-2 h-10 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={row.qtyToOrder || 0} onChange={e => updateMaterial(row.id, 'qtyToOrder', Number(e.target.value))} /></td>
                                <td className="px-2 py-2"><input type="text" className="w-24 border rounded px-1 bg-white text-gray-900" value={row.prNo || ''} onChange={e => updateMaterial(row.id, 'prNo', e.target.value)} /></td>
                                <td className="px-2 py-2"><button onClick={() => removeMaterial(row.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Remarks</label>
            <textarea id="remarks" defaultValue={order.remarks || ''} className="w-full border border-gray-300 rounded p-2 h-24 bg-white text-gray-900" />
        </div>

        {/* Approvals */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            {['Prepared', 'Reviewed', 'Approved', 'Received'].map((role) => {
                const roleKey = `planner${role}By` as keyof JobOrder;
                const dateKey = `planner${role}Date` as keyof JobOrder;
                return (
                    <div key={role} className="bg-gray-50 p-3 rounded">
                        <span className="block text-xs font-bold text-gray-500 uppercase mb-2">{role} by</span>
                        <input id={roleKey} placeholder="Name" className="block w-full mb-2 border rounded p-1 text-sm bg-white text-gray-900" defaultValue={order[roleKey] as string || ''} />
                        <input id={dateKey} type="date" className="block w-full border rounded p-1 text-sm bg-white text-gray-900" defaultValue={order[dateKey] as string || ''} />
                    </div>
                );
            })}
        </div>

        {/* Status Footer */}
        <div className="bg-gray-100 p-4 rounded mt-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                 <div className="flex items-center">
                     <label className="text-sm font-medium mr-2 w-48 text-gray-900">Date of Job Order completion:</label>
                     <input id="completionDate" type="date" defaultValue={order.completionDate || ''} className="border rounded p-1 flex-1 bg-white text-gray-900" />
                 </div>
                 <div className="flex items-center">
                     <label className="text-sm font-medium mr-2 w-32 text-gray-900">Quantity delivered:</label>
                     <input id="qtyDelivered" type="text" defaultValue={order.qtyDelivered || ''} className="border rounded p-1 flex-1 bg-white text-gray-900" />
                 </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="flex items-center">
                     <span className="text-sm font-medium mr-4 w-48 text-gray-900">Status of Job Order:</span>
                     <div className="space-x-4">
                         <label className="inline-flex items-center text-gray-900 cursor-pointer"><input type="radio" name="status" checked={order.finalStatus === 'Closed'} onClick={() => handleSave('Closed')} className="mr-1 bg-white"/> Closed</label>
                         <label className="inline-flex items-center text-gray-900 cursor-pointer"><input type="radio" name="status" checked={order.finalStatus === 'Pending'} onClick={() => handleSave('Pending')} className="mr-1 bg-white"/> Pending</label>
                     </div>
                 </div>
                 <div className="flex items-center">
                     <label className="text-sm font-medium mr-2 w-32 text-gray-900">Reason of pending:</label>
                     <input id="pendingReason" type="text" defaultValue={order.pendingReason || ''} className="border rounded p-1 flex-1 border-b border-gray-400 bg-white text-gray-900" />
                 </div>
             </div>
        </div>

        {/* Action Footer */}
        <div className="flex justify-end pt-6 border-t space-x-4">
             <button disabled={isSaving} onClick={() => handleSave('Pending')} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                 {isSaving ? "Saving..." : "Save Draft"}
             </button>
             <button disabled={isSaving} onClick={() => handleSave('Closed')} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center disabled:opacity-50">
                {isSaving ? <Loader2 className="mr-2 w-4 h-4 animate-spin"/> : <CheckCircle className="mr-2 w-4 h-4"/>} 
                Save & Close
             </button>
        </div>
      </div>
    </div>
  );
};

export default PlannerForm;
