
export enum OrderStatus {
  PENDING_PLANNER = 'PENDING_PLANNER',
  COMPLETED = 'COMPLETED'
}

export type Company = 'Halagel Plant (M) Sdn Bhd' | 'Halagel Products Sdn Bhd' | 'Halagel Malaysia Sdn Bhd';

export interface AppSettings {
  plannerEmail: string;
}

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
  rawMaterial: string[];
  bottle: string[];
  labeling: string[];
  innerBox: string[];
  cap: string[];
  capSeal: string[];
  stopper: string[];
  pvcFoil: string[];
  alumFoil: string[];
  shrinkwrap: string[];
  carton: string[];
  insert: string[];
  others: string[];
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
  salesPreparedSignature?: string; // Base64 signature image
  salesApprovedBy?: string;
  salesReceivedBy?: string; // Kept in type just in case, though removed from UI
  salesDate?: string;
  salesApprovedDate?: string;

  // Section B (Planner)
  jobOrderNo?: string;
  sectionBDate?: string;
  materials?: MaterialRow[];
  plannerRemarks?: string; // Specific Remarks for Section B to avoid conflict with Section A
  
  // Planner Signatures
  plannerPreparedBy?: string;
  plannerPreparedSignature?: string; // Base64 signature image
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
  rawMaterial: [],
  bottle: [],
  labeling: [],
  innerBox: [],
  cap: [],
  capSeal: [],
  stopper: [],
  pvcFoil: [],
  alumFoil: [],
  shrinkwrap: [],
  carton: [],
  insert: [],
  others: []
};
