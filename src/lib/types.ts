// Database entity types
export interface Company {
  id: number;
  name: string;
  type: 'mill' | 'customer';
  created_at?: string;
  updated_at?: string;
}

export interface Purchase {
  id: number;
  purchase_bill_number: string;
  purchase_bill_date: string;
  company_id: number;
  created_at: string;
  bought_from_mill?: string;
}

export interface Sale {
  id: number;
  sale_bill_number: string;
  sale_bill_date: string;
  company_id: number;
  sale_type?: 'from_godown' | 'direct_ship_to';
  created_at: string;
  sold_to?: string;
}

export interface Reel {
  id: number;
  reel_number: string | null;
  purchase_id: number;
  sale_id: number | null;
  gsm: number;
  size: string;
  size_unit: string;
  bf: number;
  weight: number;
  shade: string;
  rate: number | null;
  created_at: string;
  purchase_bill_number?: string;
  purchase_bill_date?: string;
  bought_from_mill?: string;
}

// API Request/Response types
export interface ReelInput {
  reel_id?: number;
  reel_number?: string | null;
  gsm: number;
  size: string;
  size_unit: string;
  bf: number;
  weight: number;
  shade: string;
  rate?: number;
}

export interface PurchaseRequest {
  purchase_bill_number: string;
  purchase_bill_date: string;
  company_id: number;
  reels: ReelInput[];
  ship_to_customer_id?: number;
  sale_bill_number?: string;
  sale_bill_date?: string;
}

export interface SaleRequest {
  sale_bill_number: string;
  sale_bill_date: string;
  company_id: number;
  sale_type?: 'from_godown' | 'direct_ship_to';
  reels: Array<{
    reel_id: number;
    rate: number;
    reel_number?: string;
  }>;
}

export interface PurchaseResponse {
  success: boolean;
  data: {
    purchase: Purchase;
    reels: Reel[];
    sale?: Sale;
  };
  message: string;
}

export interface SaleResponse {
  success: boolean;
  data: {
    sale: Sale;
    reels: Reel[];
  };
  message: string;
}

// Form types
export interface PurchaseReelForm {
  reel_number: string;
  gsm: string;
  size: string;
  size_unit: string;
  bf: string;
  weight: string;
  shade: string;
  rate: string;
}

export interface SavedPurchaseData {
  purchaseData: {
    purchase_bill_number: string;
    purchase_bill_date: string;
    company_id: string;
    ship_to_enabled: boolean;
    ship_to_customer_id: string;
    sale_bill_number: string;
    sale_bill_date: string;
  };
  purchaseReels: PurchaseReelForm[];
}

