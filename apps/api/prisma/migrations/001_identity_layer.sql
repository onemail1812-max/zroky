-- LAYER 0: Identity & Multi-Tenancy Schema
-- Purpose: User/business isolation, enterprise safety

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Organizations (Top-level tenant)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Businesses (Sub-tenant under organization)
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brain Instances (One per business)
CREATE TABLE brain_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

-- Indexes for performance
CREATE INDEX idx_businesses_org ON businesses(organization_id);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_brain_business ON brain_instances(business_id);

-- Row Level Security (RLS) for business_id isolation
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies (example - adjust based on your auth)
CREATE POLICY business_isolation ON businesses
    USING (organization_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY brain_isolation ON brain_instances
    USING (business_id IN (
        SELECT id FROM businesses 
        WHERE organization_id = current_setting('app.current_org_id')::UUID
    ));
