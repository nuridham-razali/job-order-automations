
import React, { useState } from 'react';
import { JobOrder, ProductSpec, INITIAL_SUPPLY_SOURCE, OrderStatus, SupplySource } from '../types';
import { StorageService } from '../services/storageService';
import { Save, Trash2, Loader2 } from 'lucide-react';
import SignatureInput from './SignatureInput';

interface SalesFormProps {
  onComplete: () => void;
}

const INITIAL_PRODUCT_SPEC: ProductSpec = {
  productName: '',
  orderQuantity: 0,
  unitType: 'Bottle',
  categories: [],
  productTypes: [],
  packingTypes: [],
  weightPerItem: '',
  qtyPerBottle: '',
  qtyPerBlister: '',
  qtyPerBoxSet: '',
  qtyPerCarton: '',
  supplySource: { ...INITIAL_SUPPLY_SOURCE }
};

const INITIAL_ORDER: JobOrder = {
  id: '',
  createdAt: '',
  status: OrderStatus.PENDING_PLANNER,
  company: 'Halagel Plant (M) Sdn Bhd',
  customerName: '',
  poNumber: '',
  skuType: 'Existing',
  estDeliveryDate: new Date().toISOString().split('T')[0],
  
  ...INITIAL_PRODUCT_SPEC,

  salesPreparedBy: '',
  salesDate: new Date().toISOString().split('T')[0]
};

const SalesForm: React.FC<SalesFormProps> = ({ onComplete }) => {
  const [data, setData] = useState<JobOrder>({ 
    ...INITIAL_ORDER, 
    id: StorageService.generateId(),
    createdAt: new Date().toISOString()
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'product1' | 'product2'>('product1');

  // Generic helpers
  const updateOrder = (field: keyof JobOrder, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const getProduct = (isP2: boolean): ProductSpec => {
    return isP2 ? (data.product2 || { ...INITIAL_PRODUCT_SPEC }) : data;
  };

  const updateProduct = (isP2: boolean, field: keyof ProductSpec, value: any) => {
    if (!isP2) {
      setData(prev => ({ ...prev, [field]: value }));
    } else {
      setData(prev => ({
        ...prev,
        product2: {
          ...(prev.product2 || { ...INITIAL_PRODUCT_SPEC }),
          [field]: value
        }
      }));
    }
  };

  const toggleArray = (isP2: boolean, field: 'categories' | 'productTypes' | 'packingTypes', item: string) => {
    const current = getProduct(isP2);
    const arr = current[field] || [];
    const newArr = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    updateProduct(isP2, field, newArr);
  };

  const updateSupply = (isP2: boolean, key: keyof SupplySource, val: string) => {
    const current = getProduct(isP2);
    const currentList = current.supplySource[key] || [];
    const newList = currentList.includes(val) 
        ? currentList.filter(i => i !== val) 
        : [...currentList, val];
    
    const newSource = { ...current.supplySource, [key]: newList };
    updateProduct(isP2, 'supplySource', newSource);
  };

  const handleSubmit = async () => {
    if (!data.customerName || !data.poNumber) {
        alert("Customer Name and PO Number are required.");
        return;
    }
    setIsSaving(true);
    try {
        await StorageService.createOrder(data);
        
        // Attempt to notify planner
        await StorageService.notifyPlanner(data);
        
        onComplete();
    } catch (e) {
        alert("Error saving order");
    } finally {
        setIsSaving(false);
    }
  };

  const bgClass = "bg-gray-50 border border-gray-200";

  const renderProductForm = (isP2: boolean) => {
      const p = getProduct(isP2);
      // Helper wrappers for this product context
      const change = (field: keyof ProductSpec, val: any) => updateProduct(isP2, field, val);
      const toggle = (field: 'categories' | 'productTypes' | 'packingTypes', item: string) => toggleArray(isP2, field, item);
      const supply = (key: keyof SupplySource, val: string) => updateSupply(isP2, key, val);
      const changeHandler = change; 
      const toggleHandler = toggle;

      return (
          <div className="space-y-6">
              {/* Product Details Section */}
              <div className={`${bgClass} p-4 rounded`}>
                  <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">A. Product Detail</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700">Product Name</label>
                          <input type="text" className="w-full border rounded p-2 bg-white text-gray-900" value={p.productName} onChange={e => change('productName', e.target.value)} />
                      </div>
                      <div>
                           <label className="block text-sm font-bold text-gray-700">Order Quantity</label>
                           <input type="number" className="w-full border rounded p-2 bg-white text-gray-900" value={p.orderQuantity} onChange={e => change('orderQuantity', Number(e.target.value))} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700">Unit Type</label>
                          <select className="w-full border rounded p-2 bg-white text-gray-900" value={p.unitType} onChange={e => change('unitType', e.target.value)}>
                              {['Bottle', 'Blister', 'Box', 'Tube', 'Others'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                      </div>
                      <div>
                           <label className="block text-sm font-bold text-gray-700">Weight Per Item</label>
                           <input type="text" className="w-full border rounded p-2 bg-white text-gray-900" value={p.weightPerItem} onChange={e => change('weightPerItem', e.target.value)} />
                      </div>
                  </div>
              </div>

              {/* Specs Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {/* Categories */}
                   <div className={`${bgClass} p-4 rounded`}>
                        <span className="block text-sm font-bold text-gray-700 mb-2">Product Category</span>
                        {['Traditional & Health Supplement', 'Toothpaste & Cosmetics', 'Food & Beverages'].map(c => (
                            <label key={c} className="flex items-center space-x-2 mb-1 cursor-pointer">
                                <input type="checkbox" checked={p.categories.includes(c)} onChange={() => toggle('categories', c)} className="bg-white form-checkbox text-brand-600" />
                                <span className="text-xs text-gray-900">{c}</span>
                            </label>
                        ))}
                        <label className="flex items-center space-x-2 mb-1 cursor-pointer">
                            <input type="checkbox" checked={p.categories.includes('Others')} onChange={() => toggle('categories', 'Others')} className="bg-white form-checkbox text-brand-600" />
                            <span className="text-xs text-gray-900">Others</span>
                        </label>
                        {p.categories.includes('Others') && (
                            <input type="text" placeholder="Specify..." className="w-full border-b bg-transparent text-xs text-gray-900" value={p.categoriesOthers || ''} onChange={e => change('categoriesOthers', e.target.value)} />
                        )}
                   </div>

                   {/* Product Type */}
                   <div className={`${bgClass} p-4 rounded`}>
                        <span className="block text-sm font-bold text-gray-700 mb-2">Product Type</span>
                        {['Softgel', 'Hard Capsule', 'Toothpaste', 'Liquid', 'Cosmetics', 'Food'].map(t => (
                            <label key={t} className="flex items-center space-x-2 mb-1 cursor-pointer">
                                <input type="checkbox" checked={p.productTypes.includes(t)} onChange={() => toggle('productTypes', t)} className="bg-white form-checkbox text-brand-600" />
                                <span className="text-xs text-gray-900">{t}</span>
                            </label>
                        ))}
                        <label className="flex items-center space-x-2 mb-1 cursor-pointer">
                            <input type="checkbox" checked={p.productTypes.includes('Others')} onChange={() => toggle('productTypes', 'Others')} className="bg-white form-checkbox text-brand-600" />
                            <span className="text-xs text-gray-900">Others</span>
                        </label>
                        {p.productTypes.includes('Others') && (
                            <input type="text" placeholder="Specify..." className="w-full border-b bg-transparent text-xs text-gray-900" value={p.productTypesOthers || ''} onChange={e => change('productTypesOthers', e.target.value)} />
                        )}
                   </div>

                   {/* Packing Type */}
                   <div className={`${bgClass} p-4 rounded`}>
                        <span className="block text-sm font-bold text-gray-700 mb-2">Packing Type</span>
                        <div className="grid grid-cols-1 gap-2">
                            {['HDPE White Bottle', 'Amber Glass Bottle', 'PET Amber Glass Bottle'].map(pack => (
                            <label key={pack} className="inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="form-checkbox text-brand-600 bg-white"
                                checked={p.packingTypes?.includes(pack)}
                                onChange={() => toggleHandler('packingTypes', pack)} />
                                <span className="ml-2 text-xs text-gray-900">{pack}</span>
                            </label>
                            ))}
                            <div>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="form-checkbox text-brand-600 bg-white"
                                        checked={p.packingTypes?.includes('Others')}
                                        onChange={() => toggleHandler('packingTypes', 'Others')} />
                                    <span className="ml-2 text-xs text-gray-900">Others</span>
                                </label>
                                {p.packingTypes?.includes('Others') && (
                                    <input type="text" placeholder="Specify..." className="ml-6 mt-1 block w-4/5 border-b border-gray-400 bg-transparent text-xs focus:outline-none text-gray-900"
                                        value={p.packingTypesOthers || ''} onChange={e => changeHandler('packingTypesOthers', e.target.value)} />
                                )}
                            </div>
                        </div>
                    </div>
              </div>

              {/* Quantity Specifications */}
              <div className={`${bgClass} p-4 rounded`}>
                  <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Quantity Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700">Quantity Per Bottle</label>
                          <input type="text" className="w-full border rounded p-2 bg-white text-gray-900" value={p.qtyPerBottle || ''} onChange={e => change('qtyPerBottle', e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700">Quantity Per Blister</label>
                          <input type="text" className="w-full border rounded p-2 bg-white text-gray-900" value={p.qtyPerBlister || ''} onChange={e => change('qtyPerBlister', e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700">Quantity Per Box / Set</label>
                          <input type="text" className="w-full border rounded p-2 bg-white text-gray-900" value={p.qtyPerBoxSet || ''} onChange={e => change('qtyPerBoxSet', e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700">Quantity Per Carton</label>
                          <input type="text" className="w-full border rounded p-2 bg-white text-gray-900" value={p.qtyPerCarton || ''} onChange={e => change('qtyPerCarton', e.target.value)} />
                      </div>
                  </div>
              </div>

              {/* Requirement Supply Source */}
              <div className={`${bgClass} p-4 rounded`}>
                  <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">C. Requirement (Tick Source)</h4>
                  <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-gray-900">
                          <thead>
                              <tr className="border-b">
                                  <th className="text-left py-2">Item</th>
                                  <th className="text-center py-2">Customer</th>
                                  <th className="text-center py-2">Halagel</th>
                              </tr>
                          </thead>
                          <tbody>
                              {[
                                  ['rawMaterial', 'Raw Material'], ['bottle', 'Bottle'], ['labeling', 'Labelling'],
                                  ['innerBox', 'Inner Box'], ['cap', 'Cap'], ['capSeal', 'Cap Seal'],
                                  ['stopper', 'Stopper'], ['pvcFoil', 'PVC Foil'], ['alumFoil', 'Aluminium Foil'],
                                  ['shrinkwrap', 'Shrinkwrap'], ['carton', 'Carton'], ['insert', 'Insert'], ['others', 'Others']
                              ].map(([k, label]) => {
                                  const key = k as keyof SupplySource;
                                  return (
                                      <tr key={key} className="border-b hover:bg-gray-100">
                                          <td className="py-2">{label}</td>
                                          <td className="text-center">
                                              <input type="checkbox" checked={p.supplySource[key]?.includes('Customer')} onChange={() => supply(key, 'Customer')} className="bg-white form-checkbox text-brand-600" />
                                          </td>
                                          <td className="text-center">
                                              <input type="checkbox" checked={p.supplySource[key]?.includes('Halagel')} onChange={() => supply(key, 'Halagel')} className="bg-white form-checkbox text-brand-600" />
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
              
              <div className={`${bgClass} p-4 rounded`}>
                  <label className="block text-sm font-bold text-gray-700">Remarks</label>
                  <textarea className="w-full border rounded p-2 bg-white text-gray-900 h-32" value={p.remarks || ''} onChange={e => change('remarks', e.target.value)} />
              </div>
          </div>
      );
  };

  return (
    <div className="bg-white shadow-xl rounded-lg overflow-hidden m-4 max-w-5xl mx-auto">
       <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">New Job Order</h2>
            <button onClick={handleSubmit} disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center transition-colors disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save Order
            </button>
       </div>

       <div className="p-6 space-y-6">
           {/* Section 0: Header Info */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                   <label className="block text-sm font-bold text-gray-700">Company</label>
                   <select className="w-full border rounded p-2 bg-white text-gray-900" value={data.company} onChange={e => updateOrder('company', e.target.value)}>
                       <option value="Halagel Plant (M) Sdn Bhd">Halagel Plant (M) Sdn Bhd</option>
                       <option value="Halagel Products Sdn Bhd">Halagel Products Sdn Bhd</option>
                       <option value="Halagel Malaysia Sdn Bhd">Halagel Malaysia Sdn Bhd</option>
                   </select>
               </div>
               <div>
                   <label className="block text-sm font-bold text-gray-700">Customer Name</label>
                   <input type="text" className="w-full border rounded p-2 bg-white text-gray-900" value={data.customerName} onChange={e => updateOrder('customerName', e.target.value)} />
               </div>
               <div>
                   <label className="block text-sm font-bold text-gray-700">PO Number</label>
                   <input type="text" className="w-full border rounded p-2 bg-white text-gray-900" value={data.poNumber} onChange={e => updateOrder('poNumber', e.target.value)} />
               </div>
               <div>
                   <label className="block text-sm font-bold text-gray-700">Estimate Delivery Date</label>
                   <input type="date" className="w-full border rounded p-2 bg-white text-gray-900" value={data.estDeliveryDate} onChange={e => updateOrder('estDeliveryDate', e.target.value)} />
               </div>
               <div>
                    <span className="block text-sm font-bold text-gray-700 mb-2">SKU Type</span>
                    <div className="flex space-x-4">
                        {['Existing', 'New', 'Trial'].map(type => (
                            <label key={type} className="inline-flex items-center cursor-pointer">
                                <input type="radio" name="skuType" className="form-radio text-brand-600 bg-white" checked={data.skuType === type} onChange={() => updateOrder('skuType', type)} />
                                <span className="ml-2 text-gray-700">{type}</span>
                            </label>
                        ))}
                    </div>
               </div>
           </div>

           {/* Tabs for Products */}
           <div className="border-b border-gray-200">
               <nav className="-mb-px flex space-x-8">
                   <button onClick={() => setActiveTab('product1')} className={`${activeTab === 'product1' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                       Product 1
                   </button>
                   <button onClick={() => { setActiveTab('product2'); if(!data.product2) updateProduct(true, 'productName', ''); }} className={`${activeTab === 'product2' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                       Product 2 (Optional)
                   </button>
               </nav>
           </div>

           <div className="py-4">
               {activeTab === 'product1' ? renderProductForm(false) : (
                   <div>
                       <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-gray-500">Details for second product in the same Job Order (if applicable).</p>
                            {data.product2 && (
                                <button onClick={() => updateOrder('product2', undefined)} className="text-red-500 text-sm flex items-center hover:underline"><Trash2 className="w-4 h-4 mr-1"/> Remove Product 2</button>
                            )}
                       </div>
                       {renderProductForm(true)}
                   </div>
               )}
           </div>

           {/* Signatures */}
           <div className="border-t pt-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Sales Executive Prepared By</label>
                        <div className="space-y-4">
                            <SignatureInput 
                                label="Signature"
                                value={data.salesPreparedSignature} 
                                onChange={(val) => updateOrder('salesPreparedSignature', val)}
                                signerName={data.salesPreparedBy || ''}
                            />
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Name</label>
                                <input type="text" className="w-full border rounded p-2 bg-white text-gray-900" placeholder="Type Name..." value={data.salesPreparedBy || ''} onChange={e => updateOrder('salesPreparedBy', e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                        <input type="date" className="w-full border rounded p-2 bg-white text-gray-900" value={data.salesDate || ''} onChange={e => updateOrder('salesDate', e.target.value)} />
                    </div>
                </div>
           </div>
       </div>
    </div>
  );
};

export default SalesForm;
