-- SEP-12 KYC Compliance Database Migration
-- Compatible with PostgreSQL (primary) and MySQL (secondary)

-- KYC Customers table
CREATE TABLE IF NOT EXISTS kyc_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account VARCHAR(56) NOT NULL,
    memo VARCHAR(255),
    memo_type ENUM('text', 'id', 'hash') DEFAULT 'id',
    type VARCHAR(100),
    status ENUM('NEEDS_INFO', 'PROCESSING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'NEEDS_INFO',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_customer UNIQUE (account, memo)
);

-- KYC Fields table for dynamic field requirements
CREATE TABLE IF NOT EXISTS kyc_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type ENUM('string', 'number', 'date', 'binary', 'boolean') NOT NULL,
    description TEXT NOT NULL,
    status ENUM('ACCEPTED', 'PROCESSING', 'REJECTED', 'REQUIRED') NOT NULL DEFAULT 'REQUIRED',
    value TEXT,
    file_path VARCHAR(500),
    is_optional BOOLEAN NOT NULL DEFAULT false,
    choices JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_customer_field UNIQUE (customer_id, field_name),
    FOREIGN KEY (customer_id) REFERENCES kyc_customers(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kyc_customers_account ON kyc_customers(account);
CREATE INDEX IF NOT EXISTS idx_kyc_customers_status ON kyc_customers(status);
CREATE INDEX IF NOT EXISTS idx_kyc_fields_customer_id ON kyc_fields(customer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_fields_field_name ON kyc_fields(field_name);

-- Function to update updated_at timestamp (PostgreSQL)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_kyc_customers_updated_at 
    BEFORE UPDATE ON kyc_customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_fields_updated_at 
    BEFORE UPDATE ON kyc_fields 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
-- INSERT INTO kyc_customers (account, memo, type, status) VALUES 
--     ('GBORFR3GDNVZ5PLUTBDQHKGWVD26CQUHORO2T3SDQ2JPLGLUJCCA5GK6', '12345', 'sep31-sender', 'NEEDS_INFO')
-- ON CONFLICT (account, memo) DO NOTHING;
