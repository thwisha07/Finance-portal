export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'po_owner' | 'receiver' | 'finance' | 'senior_finance';
  department?: string;
  active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  department: string;
  description: string;
  amount: number;
  ordered_qty?: number;
  created_by: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  expected_completion_date?: Date;
  reporting_period?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  po_id: string;
  vendor_id: string;
  amount: number;
  status: 'RECEIVED' | 'APPROVED' | 'PAID' | 'REJECTED';
  received_at: Date;
  received_by: string;
  approved_at?: Date;
  approved_by?: string;
  approval_notes?: string;
  erp_reference?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  flagged: boolean;
  flag_reason?: string;
  flagged_at?: Date;
  flagged_by?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status: 'SUCCESS' | 'FAILURE';
  error_message?: string;
}

export interface GoodsReceipt {
  id: string;
  po_id: string;
  gr_reference: string;
  status: 'POSTED' | 'VERIFIED' | 'RECONCILED';
  erp_reference?: string;
  posted_by: string;
  posted_at: Date;
  verified_at?: Date;
  verified_by?: string;
  created_at: Date;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: Date;
  payment_method: 'BANK_TRANSFER' | 'CHEQUE' | 'CARD';
  reference: string;
  marked_by: string;
  marked_at: Date;
  bank_verification_date?: Date;
  created_at: Date;
}
