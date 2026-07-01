-- Springbok Finance Portal Database Schema
-- PostgreSQL 12+

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('po_owner', 'finance', 'senior_finance', 'receiver')),
  department VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  flagged_at TIMESTAMP,
  flagged_by UUID REFERENCES users(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_flagged ON vendors(flagged);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  department VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  ordered_qty INTEGER,
  created_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  expected_completion_date DATE,
  reporting_period VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_po_format CHECK (po_number ~ '^PO-\d{4}-\d{3}$')
);

CREATE INDEX idx_po_number ON purchase_orders(po_number);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_department ON purchase_orders(department);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- Goods Receipts table
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  gr_reference VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'VERIFIED', 'RECONCILED')),
  erp_reference VARCHAR(100),
  posted_by UUID NOT NULL REFERENCES users(id),
  posted_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT gr_format CHECK (gr_reference ~ '^GR-\d{4}-\d{4}$')
);

CREATE INDEX idx_gr_reference ON goods_receipts(gr_reference);
CREATE INDEX idx_gr_po ON goods_receipts(po_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(50) DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'APPROVED', 'PAID', 'REJECTED')),
  received_at TIMESTAMP DEFAULT NOW(),
  received_by UUID NOT NULL REFERENCES users(id),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  approval_notes TEXT,
  erp_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_invoice_format CHECK (invoice_number ~ '^[A-Z0-9]{5,20}$')
);

CREATE INDEX idx_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoice_po ON invoices(po_id);
CREATE INDEX idx_invoice_vendor ON invoices(vendor_id);
CREATE INDEX idx_invoice_status ON invoices(status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) UNIQUE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('BANK_TRANSFER', 'CHEQUE', 'CARD')),
  reference VARCHAR(100) NOT NULL,
  marked_by UUID NOT NULL REFERENCES users(id),
  marked_at TIMESTAMP DEFAULT NOW(),
  bank_verification_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_invoice ON payments(invoice_id);
CREATE INDEX idx_payment_date ON payments(payment_date);

-- Audit Log table (immutable, append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILURE')),
  error_message TEXT
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Grant permissions (example)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO finance_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO finance_user;
