-- LAYER 2: Source of Truth Memory
-- Purpose: Reality. No hallucinations.

-- Business Profile (Authoritative truth)
CREATE TABLE business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    profile_data JSONB NOT NULL DEFAULT '{
        "goals": [],
        "metrics": {},
        "policies": [],
        "brand_voice": {}
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decisions Log (What the brain decided)
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    decision_type VARCHAR(100) NOT NULL,
    context JSONB NOT NULL,
    decision JSONB NOT NULL,
    reasoning TEXT,
    confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outcomes Log (What actually happened)
CREATE TABLE outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL,
    outcome_type VARCHAR(100) NOT NULL,
    metrics JSONB NOT NULL,
    success BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LAYER 3: Experience Memory (Learning)
-- Purpose: Make the Brain experienced

-- Episodic Memory (Learning from experience)
CREATE TABLE episodic_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    context TEXT NOT NULL,
    context_embedding vector(768),
    decision TEXT NOT NULL,
    outcome TEXT NOT NULL,
    confidence DECIMAL(3,2),
    success_score DECIMAL(3,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_business_profiles_business ON business_profiles(business_id);
CREATE INDEX idx_decisions_business ON decisions(business_id);
CREATE INDEX idx_decisions_type ON decisions(decision_type);
CREATE INDEX idx_outcomes_business ON outcomes(business_id);
CREATE INDEX idx_outcomes_decision ON outcomes(decision_id);
CREATE INDEX idx_episodic_memory_business ON episodic_memory(business_id);
CREATE INDEX idx_episodic_memory_embedding ON episodic_memory USING ivfflat (context_embedding vector_cosine_ops);

-- RLS
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodic_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_profiles_isolation ON business_profiles
    USING (business_id = current_setting('app.current_business_id')::UUID);

CREATE POLICY decisions_isolation ON decisions
    USING (business_id = current_setting('app.current_business_id')::UUID);

CREATE POLICY outcomes_isolation ON outcomes
    USING (business_id = current_setting('app.current_business_id')::UUID);

CREATE POLICY episodic_memory_isolation ON episodic_memory
    USING (business_id = current_setting('app.current_business_id')::UUID);
