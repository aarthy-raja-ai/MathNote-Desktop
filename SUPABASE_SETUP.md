# Supabase Setup Guide for MathNote Sync

To enable real-time sync between your Desktop and Mobile apps, you need to set up a Supabase project with the following tables.

## 1. Create Tables
Run this SQL in your Supabase SQL Editor:

```sql
-- 1. Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date DATE,
  "customerName" TEXT,
  "customerState" TEXT,
  "customerAddress" TEXT,
  "customerGSTIN" TEXT,
  "customerPhone" TEXT,
  "totalAmount" NUMERIC,
  "paidAmount" NUMERIC,
  "paymentMethod" TEXT,
  note TEXT,
  items JSONB,
  "invoiceNumber" TEXT,
  subtotal NUMERIC,
  "discountTotal" NUMERIC,
  "discountType" TEXT,
  "taxTotal" NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  "taxMode" TEXT,
  "returnIds" JSONB,
  "linkedCreditId" TEXT,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT,
  brand TEXT,
  sku TEXT,
  barcode TEXT,
  "hsnCode" TEXT,
  category TEXT,
  price NUMERIC,
  "costPrice" NUMERIC,
  stock NUMERIC,
  unit TEXT,
  "lowStockThreshold" NUMERIC,
  "taxRate" NUMERIC,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  state TEXT,
  gstin TEXT,
  type TEXT,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date DATE,
  category TEXT,
  amount NUMERIC,
  note TEXT,
  "vendorName" TEXT,
  "vendorId" TEXT,
  "paymentMethod" TEXT,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Credits Table
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  party TEXT,
  type TEXT,
  amount NUMERIC,
  "paidAmount" NUMERIC,
  status TEXT,
  date DATE,
  "dueDate" DATE,
  note TEXT,
  "linkedSaleId" TEXT,
  "linkedPurchaseId" TEXT,
  payments JSONB,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Returns Table
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  "saleId" TEXT,
  date DATE,
  party TEXT,
  amount NUMERIC,
  note TEXT,
  items JSONB,
  "linkedCreditId" TEXT,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  date DATE,
  "vendorName" TEXT,
  "vendorState" TEXT,
  "totalAmount" NUMERIC,
  "paidAmount" NUMERIC,
  "paymentMethod" TEXT,
  note TEXT,
  items JSONB,
  "linkedExpenseId" TEXT,
  "linkedCreditId" TEXT,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  date DATE,
  "quotationNumber" TEXT,
  "customerName" TEXT,
  "customerState" TEXT,
  "customerAddress" TEXT,
  "customerGSTIN" TEXT,
  "customerPhone" TEXT,
  items JSONB,
  subtotal NUMERIC,
  "discountTotal" NUMERIC,
  "discountType" TEXT,
  "taxTotal" NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  "taxMode" TEXT,
  "grandTotal" NUMERIC,
  "validUntil" DATE,
  terms TEXT,
  status TEXT,
  "convertedSaleId" TEXT,
  note TEXT,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  date DATE,
  "poNumber" TEXT,
  "vendorName" TEXT,
  "vendorState" TEXT,
  items JSONB,
  subtotal NUMERIC,
  "taxTotal" NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  "grandTotal" NUMERIC,
  "expectedDate" DATE,
  status TEXT,
  "convertedPurchaseId" TEXT,
  note TEXT,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  "staffId" TEXT,
  "staffName" TEXT,
  date DATE,
  status TEXT,
  note TEXT,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Users Table (Unified for both Desktop and Mobile login modes)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT,
  password TEXT, -- hashed password for Desktop
  pin TEXT,      -- pin code for Mobile
  role TEXT NOT NULL,
  company_id TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Business Profile Table
CREATE TABLE IF NOT EXISTS business_profile (
  id TEXT PRIMARY KEY,
  "businessName" TEXT,
  "ownerName" TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  state TEXT,
  city TEXT,
  pincode TEXT,
  gstin TEXT,
  "panNumber" TEXT,
  category TEXT,
  "taxType" TEXT,
  "logoBase64" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  gstin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for all 13 tables (using a safe DO block to prevent errors if already added)
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY['sales', 'products', 'contacts', 'expenses', 'credits', 'returns', 'purchases', 'quotations', 'purchase_orders', 'attendance', 'users', 'business_profile', 'companies'];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
        END IF;
    END LOOP;
END
$$;
```

## 2. Row Level Security (RLS) Configuration

You must configure RLS to either disable RLS completely or add policies to allow read/write access.

### OPTION A: Disable RLS for all tables (Recommended for easy/quick testing)
```sql
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
```

### OPTION B: Enable RLS and add public access policies (For production environments)
```sql
-- Enable RLS for all 13 tables
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Add open public read/write access policies for sync
CREATE POLICY "Allow all access" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON credits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON returns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON business_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON companies FOR ALL USING (true) WITH CHECK (true);
```

## 3. Existing Database Migration Script
If you created the database tables previously and need to migrate them to support the updated sync format (renaming `"createdAt"` to `created_at` and adding missing columns like `"linkedCreditId"` or `"company_id"`), run the following query in your Supabase **SQL Editor**:

```sql
-- 1. Add missing linkedCreditId to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "linkedCreditId" TEXT;

-- 2. Add missing company_id columns to partitioned tables
ALTER TABLE sales ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE credits ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE returns ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'default';

-- 3. Migrate createdAt columns to snake_case created_at across all tables
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('sales', 'products', 'contacts', 'expenses', 'credits', 'returns', 'purchases', 'quotations', 'purchase_orders', 'attendance', 'users', 'business_profile')
    LOOP
        -- If "createdAt" exists and created_at does not, rename it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = tbl.table_name AND column_name = 'createdAt'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = tbl.table_name AND column_name = 'created_at'
        ) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN "createdAt" TO created_at', tbl.table_name);
        END IF;

        -- If created_at does not exist, add it
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = tbl.table_name AND column_name = 'created_at'
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()', tbl.table_name);
        END IF;
    END LOOP;
END
$$;
```

## 4. Configuration
After creating the tables:
1. Go to **Project Settings > API**.
2. Copy the **Project URL** and **anon public key**.
3. Paste them into the **MathNote Settings > Cloud Sync** section on both Desktop and Mobile apps.
