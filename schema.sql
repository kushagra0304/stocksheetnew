-- Stocksheet Database Schema
-- Auto-generated on 2025-11-24T09:48:51.150Z
-- DO NOT EDIT MANUALLY - This file is auto-synced from the database
-- Run: npm run schema:generate

-- ENUM Types
CREATE TYPE company_type_enum AS ENUM ('mill', 'customer');
CREATE TYPE shade_enum AS ENUM ('GY', 'NS');

-- Table: company
CREATE TABLE company (
    id INTEGER NOT NULL DEFAULT nextval('company_id_seq'::regclass),
    name VARCHAR(255) NOT NULL,
    type COMPANY_TYPE_ENUM NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE company ADD CONSTRAINT company_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX company_name_key ON public.company USING btree (name);
CREATE INDEX idx_company_type ON public.company USING btree (type);

-- Table: purchases
CREATE TABLE purchases (
    id INTEGER NOT NULL DEFAULT nextval('purchases_id_seq'::regclass),
    purchase_bill_number VARCHAR NOT NULL,
    purchase_bill_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    company_id INTEGER NOT NULL
);

ALTER TABLE purchases ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);

ALTER TABLE purchases ADD CONSTRAINT purchases_company_id_fkey FOREIGN KEY (company_id) REFERENCES company(id) ;

CREATE INDEX idx_purchases_bill_number ON public.purchases USING btree (purchase_bill_number);

-- Table: reels
CREATE TABLE reels (
    id INTEGER NOT NULL DEFAULT nextval('reels_id_seq'::regclass),
    reel_number VARCHAR,
    purchase_id INTEGER NOT NULL,
    sale_id INTEGER,
    gsm INTEGER NOT NULL,
    size VARCHAR NOT NULL,
    size_unit VARCHAR NOT NULL,
    bf NUMERIC NOT NULL DEFAULT 0,
    weight NUMERIC NOT NULL DEFAULT 0,
    shade SHADE_ENUM NOT NULL,
    rate NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reels ADD CONSTRAINT reels_pkey PRIMARY KEY (id);

ALTER TABLE reels ADD CONSTRAINT reels_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL ;
ALTER TABLE reels ADD CONSTRAINT reels_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE ;

CREATE INDEX idx_reels_created_at ON public.reels USING btree (created_at DESC);
CREATE INDEX idx_reels_purchase_id ON public.reels USING btree (purchase_id);
CREATE INDEX idx_reels_sale_id ON public.reels USING btree (sale_id);

-- Table: sales
CREATE TABLE sales (
    id INTEGER NOT NULL DEFAULT nextval('sales_id_seq'::regclass),
    sale_bill_number VARCHAR NOT NULL,
    sale_bill_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    company_id INTEGER NOT NULL
);

ALTER TABLE sales ADD CONSTRAINT sales_pkey PRIMARY KEY (id);

ALTER TABLE sales ADD CONSTRAINT sales_company_id_fkey FOREIGN KEY (company_id) REFERENCES company(id) ;

CREATE INDEX idx_sales_bill_number ON public.sales USING btree (sale_bill_number);

