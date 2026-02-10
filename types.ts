
export enum OrderStatus {
  PENDING_PLANNER = 'PENDING_PLANNER',
  COMPLETED = 'COMPLETED'
}

export type Company = 'Halagel Plant (M) Sdn Bhd' | 'Halagel Products Sdn Bhd' | 'Halagel Malaysia Sdn Bhd';

export interface MaterialRow {
  id: string;
  itemCode: string;
  materialName: string;
  qtyRequired: number;
  stockBalance: number;
  qtyToOrder: number;
  prNo: string;
}

export interface SupplySource {
  rawMaterial: 'Customer' | 'Halagel' | null;
  bottle: 'Customer' | 'Halagel' | null;
  labeling: 'Customer' | 'Halagel' | null;
  innerBox: 'Customer' | 'Halagel' | null;
  cap: 'Customer' | 'Halagel' | null;
  capSeal: 'Customer' | 'Halagel' | null;
  stopper: 'Customer' | 'Halagel' | null;
  pvcFoil: 'Customer' | 'Halagel' | null;
  alumFoil: 'Customer' | 'Halagel' | null;
  shrinkwrap: 'Customer' | 'Halagel' | null;
  carton: 'Customer' | 'Halagel' | null;
  insert: 'Customer' | 'Halagel' | null;
  others?: 'Customer' | 'Halagel' | null;
}

// Base interface for product details
export interface ProductSpec {
  // Section A: Product Detail
  productName: string;
  orderQuantity: number;
  unitType: 'Bottle' | 'Blister' | 'Box' | 'Tube' | 'Others';
  
  // Section B: Specs
  categories: string[]; 
  categoriesOthers?: string;
  
  productTypes: string[]; 
  productTypesOthers?: string;
  
  packingTypes: string[]; 
  packingTypesOthers?: string;
  
  weightPerItem: string;
  
  // Quantity Specs
  qtyPerBottle?: string;
  qtyPerBlister?: string;
  qtyPerBoxSet?: string;
  qtyPerCarton?: string;
  
  // Section C: Requirements
  supplySource: SupplySource;
  
  // Remarks for Section A
  remarks?: string;
}

// JobOrder extends ProductSpec for Product 1 (backward compatibility)
export interface JobOrder extends ProductSpec {
  id: string;
  createdAt: string;
  status: OrderStatus;
  
  // Header
  company: Company;
  customerName: string;
  poNumber: string;
  skuType: 'Existing' | 'New' | 'Trial';
  estDeliveryDate: string;
  
  // Optional Product 2
  product2?: ProductSpec;
  
  // Section A Signatures
  salesPreparedBy?: string;
  salesApprovedBy?: string;
  salesReceivedBy?: string; // Kept in type just in case, though removed from UI
  salesDate?: string;
  salesApprovedDate?: string;

  // Section B (Planner)
  jobOrderNo?: string;
  sectionBDate?: string;
  materials?: MaterialRow[];
  remarks?: string; // Section B Remarks
  
  // Planner Signatures
  plannerPreparedBy?: string;
  plannerReviewedBy?: string;
  plannerApprovedBy?: string;
  plannerReceivedBy?: string;
  
  plannerPreparedDate?: string;
  plannerReviewedDate?: string;
  plannerApprovedDate?: string;
  plannerReceivedDate?: string;
  
  // Footer
  completionDate?: string;
  finalStatus?: 'Closed' | 'Pending' | 'Delivered';
  qtyDelivered?: string;
  pendingReason?: string;
}

export const INITIAL_SUPPLY_SOURCE: SupplySource = {
  rawMaterial: null,
  bottle: null,
  labeling: null,
  innerBox: null,
  cap: null,
  capSeal: null,
  stopper: null,
  pvcFoil: null,
  alumFoil: null,
  shrinkwrap: null,
  carton: null,
  insert: null,
  others: null
};
