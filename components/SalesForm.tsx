
import React, { useState } from 'react';
import { INITIAL_SUPPLY_SOURCE, JobOrder, OrderStatus, ProductSpec } from '../types';
import { StorageService } from '../services/storageService';
import { ArrowRight, Save, ArrowLeft, PlusCircle, XCircle, Loader2 } from 'lucide-react';

interface SalesFormProps {
  onComplete: () => void;
}

const SalesForm: React.FC<SalesFormProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [hasProduct2, setHasProduct2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize with empty product 2 structure
  const initialProduct2: ProductSpec = {
    productName: '',
    orderQuantity: 0,
    unitType: 'Bottle',
    categories: [],
    productTypes: [],
    packingTypes: [],
    weightPerItem: '',
    supplySource: JSON.parse(JSON.stringify(INITIAL_SUPPLY_SOURCE)), // Deep copy
    remarks: '',
  };

  const [formData, setFormData] = useState<Partial<JobOrder>>({
    company: 'Halagel Plant (M) Sdn Bhd',
    supplySource: JSON.parse(JSON.stringify(INITIAL_SUPPLY_SOURCE)),
    categories: [],
    productTypes: [],
    packingTypes: [],
    unitType: 'Bottle',
    skuType: 'Existing',
    remarks: '',
    // Product 2 will be added/removed on submission based on flag, but kept in state for inputs
    product2: initialProduct2
  });

  const handleChange = (field: keyof JobOrder, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProduct2Change = (field: keyof ProductSpec, value: any) => {
    setFormData(prev => ({
        ...prev,
        product2: {
            ...prev.product2!,
            [field]: value
        }
    }));
  };

  const toggleArrayItem = (field: 'categories' | 'productTypes' | 'packingTypes', value: string, isProduct2 = false) => {
    if (isProduct2) {
        const current = (formData.product2![field] as string[]) || [];
        if (current.includes(value)) {
            handleProduct2Change(field, current.filter(i => i !== value));
        } else {
            handleProduct2Change(field, [...current, value]);
        }
    } else {
        const current = (formData[field] as string[]) || [];
        if (current.includes(value)) {
            handleChange(field, current.filter(i => i !== value));
        } else {
            handleChange(field, [...current, value]);
        }
    }
  };

  const handleSupplyChange = (key: keyof typeof INITIAL_SUPPLY_SOURCE, value: 'Customer' | 'Halagel', isProduct2 = false) => {
    setFormData(prev => {
      if (isProduct2) {
          const currentSource = prev.product2!.supplySource || INITIAL_SUPPLY_SOURCE;
          const currentValue = currentSource[key];
          const newValue = currentValue === value ? null : value;
          return {
              ...prev,
              product2: {
                  ...prev.product2!,
                  supplySource: { ...currentSource, [key]: newValue }
              }
          };
      } else {
          const currentSource = prev.supplySource || INITIAL_SUPPLY_SOURCE;
          const currentValue = currentSource[key];
          const newValue = currentValue === value ? null : value;
          return {
            ...prev,
            supplySource: { ...currentSource, [key]: newValue }
          };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Clean up product 2 if not used
    const finalOrder: JobOrder = {
      ...formData as JobOrder,
      id: StorageService.generateId(),
      createdAt: new Date().toISOString(),
      status: OrderStatus.PENDING_PLANNER,
      salesDate: new Date().toISOString().split('T')[0]
    };
    
    if (!hasProduct2) {
        delete finalOrder.product2;
    }
    
    try {
        await StorageService.createOrder(finalOrder);
        // Call onComplete only on success
        onComplete();
    } catch (err) {
        console.error(err);
        alert("Failed to submit order. Check console for details.");
        setIsSubmitting(false); // Only re-enable button on failure
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden my-8">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">New Job Order - Sales (Step {step}/3)</h2>
        <div className="flex items-center space-x-2">
            {!hasProduct2 ? (
                <button type="button" onClick={() => setHasProduct2(true)} className="text-sm text-green-600 font-bold flex items-center hover:bg-green-50 px-2 py-1 rounded transition">
                    <PlusCircle className="w-4 h-4 mr-1"/> Add Product 2
                </button>
            ) : (
                <button type="button" onClick={() => setHasProduct2(false)} className="text-sm text-red-600 font-bold flex items-center hover:bg-red-50 px-2 py-1 rounded transition">
                    <XCircle className="w-4 h-4 mr-1"/> Remove Product 2
                </button>
            )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* STEP 1: Basic Info & Product Details */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-brand-900 border-b pb-2">Header Information</h3>
            
            {/* Header Fields - Common */}
            <div className="bg-blue-50 p-4 rounded-md">
                <label className="block text-sm font-bold text-gray-700 mb-2">Company</label>
                <div className="flex flex-wrap gap-4">
                    {['Halagel Plant (M) Sdn Bhd', 'Halagel Products Sdn Bhd', 'Halagel Malaysia Sdn Bhd'].map((c) => (
                        <label key={c} className="flex items-center text-gray-900 cursor-pointer">
                            <input type="radio" name="company" checked={formData.company === c} onChange={() => handleChange('company', c)} className="mr-2 text-brand-600 bg-white" />
                            {c}
                        </label>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                  value={formData.customerName || ''} onChange={e => handleChange('customerName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PO Number</label>
                <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                  value={formData.poNumber || ''} onChange={e => handleChange('poNumber', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Est. Delivery Date</label>
                <input required type="date" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                  value={formData.estDeliveryDate || ''} onChange={e => handleChange('estDeliveryDate', e.target.value)} />
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
                <span className="text-sm font-medium text-gray-700">SKU Status:</span>
                <label className="flex items-center text-gray-900 cursor-pointer"><input type="radio" name="sku" checked={formData.skuType === 'Existing'} onChange={() => handleChange('skuType', 'Existing')} className="mr-2 bg-white" /> Existing SKU</label>
                <label className="flex items-center text-gray-900 cursor-pointer"><input type="radio" name="sku" checked={formData.skuType === 'New'} onChange={() => handleChange('skuType', 'New')} className="mr-2 bg-white" /> New SKU</label>
                <label className="flex items-center text-gray-900 cursor-pointer"><input type="radio" name="sku" checked={formData.skuType === 'Trial'} onChange={() => handleChange('skuType', 'Trial')} className="mr-2 bg-white" /> Trial</label>
            </div>

            <h3 className="text-lg font-medium text-brand-900 border-b pb-2 pt-4">A. Product Detail</h3>
            <div className={`grid gap-8 ${hasProduct2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Product 1 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold text-gray-700 mb-3 uppercase">Product 1</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Product Name</label>
                            <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900"
                            value={formData.productName || ''} onChange={e => handleChange('productName', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                <input required type="number" className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900"
                                value={formData.orderQuantity || ''} onChange={e => handleChange('orderQuantity', parseInt(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Unit Type</label>
                                <select className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900"
                                value={formData.unitType} onChange={e => handleChange('unitType', e.target.value)}>
                                {['Bottle', 'Blister', 'Box', 'Tube', 'Others'].map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product 2 */}
                {hasProduct2 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-bold text-green-800 mb-3 uppercase">Product 2</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                                <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900"
                                value={formData.product2?.productName || ''} onChange={e => handleProduct2Change('productName', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                    <input required type="number" className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900"
                                    value={formData.product2?.orderQuantity || ''} onChange={e => handleProduct2Change('orderQuantity', parseInt(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Unit Type</label>
                                    <select className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900"
                                    value={formData.product2?.unitType} onChange={e => handleProduct2Change('unitType', e.target.value)}>
                                    {['Bottle', 'Blister', 'Box', 'Tube', 'Others'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-4">
              <button type="button" onClick={() => setStep(2)} className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 flex items-center">
                Next <ArrowRight className="ml-2 w-4 h-4"/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Specs */}
        {step === 2 && (
          <div className="space-y-6">
             <h3 className="text-lg font-medium text-brand-900 border-b pb-2">B. Product Specification</h3>
             
             <div className={`grid gap-8 ${hasProduct2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {[false, true].map((isP2) => {
                    if (isP2 && !hasProduct2) return null;
                    const data = isP2 ? formData.product2! : formData;
                    const changeHandler = isP2 ? handleProduct2Change : handleChange;
                    const toggleHandler = (f: any, v: any) => toggleArrayItem(f, v, isP2);
                    const bgClass = isP2 ? 'bg-green-50' : 'bg-gray-50';
                    const title = isP2 ? 'Product 2' : 'Product 1';

                    return (
                        <div key={isP2 ? 'p2' : 'p1'} className="space-y-4">
                            <h4 className={`font-bold uppercase border-b pb-1 ${isP2 ? 'text-green-800 border-green-200' : 'text-gray-700 border-gray-200'}`}>{title}</h4>
                            
                            <div className={`${bgClass} p-4 rounded`}>
                                <span className="block text-sm font-bold text-gray-700 mb-2">Category</span>
                                <div className="grid grid-cols-1 gap-2">
                                    {['Traditional & Health Supplement', 'Toothpaste & Cosmetics', 'Food & Beverages'].map(cat => (
                                    <label key={cat} className="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="form-checkbox text-brand-600 bg-white"
                                        checked={data.categories?.includes(cat)}
                                        onChange={() => toggleHandler('categories', cat)} />
                                        <span className="ml-2 text-xs text-gray-900">{cat}</span>
                                    </label>
                                    ))}
                                    <div>
                                        <label className="inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="form-checkbox text-brand-600 bg-white"
                                                checked={data.categories?.includes('Others')}
                                                onChange={() => toggleHandler('categories', 'Others')} />
                                            <span className="ml-2 text-xs text-gray-900">Others</span>
                                        </label>
                                        {data.categories?.includes('Others') && (
                                            <input type="text" placeholder="Specify..." className="ml-6 mt-1 block w-4/5 border-b border-gray-400 bg-transparent text-xs focus:outline-none text-gray-900"
                                                value={data.categoriesOthers || ''} onChange={e => changeHandler('categoriesOthers', e.target.value)} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={`${bgClass} p-4 rounded`}>
                                <span className="block text-sm font-bold text-gray-700 mb-2">Product Type</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Softgel', 'Hard Capsule', 'Toothpaste', 'Liquid', 'Cosmetics', 'Food'].map(type => (
                                    <label key={type} className="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="form-checkbox text-brand-600 bg-white"
                                        checked={data.productTypes?.includes(type)}
                                        onChange={() => toggleHandler('productTypes', type)} />
                                        <span className="ml-2 text-xs text-gray-900">{type}</span>
                                    </label>
                                    ))}
                                </div>
                            </div>

                            <div className={`${bgClass} p-4 rounded`}>
                                <span className="block text-sm font-bold text-gray-700 mb-2">Packing Type</span>
                                <div className="grid grid-cols-1 gap-2">
                                    {['HDPE White Bottle', 'Amber Glass Bottle', 'PET Amber Glass Bottle'].map(pack => (
                                    <label key={pack} className="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="form-checkbox text-brand-600 bg-white"
                                        checked={data.packingTypes?.includes(pack)}
                                        onChange={() => toggleHandler('packingTypes', pack)} />
                                        <span className="ml-2 text-xs text-gray-900">{pack}</span>
                                    </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Weight / Item</label>
                                <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900"
                                    value={data.weightPerItem || ''} onChange={e => changeHandler('weightPerItem', e.target.value)} />
                            </div>

                            <div className={`${bgClass} p-4 rounded`}>
                                <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Quantity Details</span>
                                <div className="grid grid-cols-1 gap-2">
                                    {['qtyPerBottle', 'qtyPerBlister', 'qtyPerBoxSet', 'qtyPerCarton'].map(q => (
                                        <div key={q} className="flex items-center">
                                            <span className="w-1/2 text-xs text-gray-700 capitalize">{q.replace('qty', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <input type="text" className="w-1/2 border rounded p-1 bg-white text-gray-900 text-sm"
                                            // @ts-ignore
                                            value={data[q] || ''} onChange={e => changeHandler(q, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
             </div>

             <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setStep(1)} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center">
                <ArrowLeft className="mr-2 w-4 h-4"/> Back
              </button>
              <button type="button" onClick={() => setStep(3)} className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 flex items-center">
                Next <ArrowRight className="ml-2 w-4 h-4"/>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Requirements */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-brand-900 border-b pb-2">C. Requirement</h3>
            
            <div className={`grid gap-8 ${hasProduct2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {[false, true].map((isP2) => {
                    if (isP2 && !hasProduct2) return null;
                    const data = isP2 ? formData.product2! : formData;
                    const changeHandler = isP2 ? handleProduct2Change : handleChange;
                    const title = isP2 ? 'Product 2' : 'Product 1';
                    const bgClass = isP2 ? 'bg-green-50' : 'bg-white';

                    return (
                        <div key={isP2 ? 'p2-req' : 'p1-req'} className="border rounded-lg overflow-hidden">
                            <div className={`px-4 py-2 font-bold uppercase ${isP2 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{title}</div>
                            <div className={`p-4 ${bgClass}`}>
                                {Object.keys(INITIAL_SUPPLY_SOURCE).map((key) => {
                                    const k = key as keyof typeof INITIAL_SUPPLY_SOURCE;
                                    let label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                    if (k === 'pvcFoil') label = 'PVC Foil';
                                    if (k === 'alumFoil') label = 'Alum Foil';
                                    if (k === 'shrinkwrap') label = 'Shrinkwrap';

                                    return (
                                    <div key={key} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                                        <span className="text-sm font-medium text-gray-700 flex-1 pr-4">{label}</span>
                                        <div className="flex items-center space-x-6 shrink-0">
                                            <label className="inline-flex items-center cursor-pointer min-w-[90px]">
                                                <input type="radio" checked={data.supplySource?.[k] === 'Customer'}
                                                onClick={() => handleSupplyChange(k, 'Customer', isP2)} onChange={() => {}} className="text-brand-600 focus:ring-brand-500 bg-white" />
                                                <span className="ml-2 text-sm text-gray-600">Customer</span>
                                            </label>
                                            <label className="inline-flex items-center cursor-pointer min-w-[80px]">
                                                <input type="radio" checked={data.supplySource?.[k] === 'Halagel'}
                                                onClick={() => handleSupplyChange(k, 'Halagel', isP2)} onChange={() => {}} className="text-brand-600 focus:ring-brand-500 bg-white" />
                                                <span className="ml-2 text-sm text-gray-600">Halagel</span>
                                            </label>
                                        </div>
                                    </div>
                                    );
                                })}
                                
                                <div className="mt-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">REMARKS:</label>
                                    <textarea 
                                        className="w-full border border-gray-300 rounded p-2 text-sm h-20 bg-white text-gray-900"
                                        value={data.remarks || ''}
                                        onChange={e => changeHandler('remarks', e.target.value)}
                                        placeholder="Additional remarks..."
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded border">
                <div>
                    <label className="block text-sm font-bold text-gray-700">Prepared By (Sales Executive)</label>
                    <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                      value={formData.salesPreparedBy || ''} onChange={e => handleChange('salesPreparedBy', e.target.value)} placeholder="Name" />
                </div>
                {/* Approved By input removed - only displayed on PDF */}
            </div>

            <div className="flex justify-between pt-6 border-t mt-6">
              <button type="button" onClick={() => setStep(2)} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center">
                <ArrowLeft className="mr-2 w-4 h-4"/> Back
              </button>
              <button disabled={isSubmitting} type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center shadow-lg transform transition hover:scale-105 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin"/> : <Save className="mr-2 w-4 h-4"/>} 
                {isSubmitting ? "Submitting..." : "Submit Job Order"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SalesForm;
