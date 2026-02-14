-- LAYER 1: Knowledge Base (User-Fed Intelligence)
-- Purpose: Let each business teach the Brain how it works

-- Knowledge Sources
CREATE TABLE knowledge_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- 'pdf', 'url', 'doc', 'note', 'sop'
    source_url TEXT,
    title VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Chunks (with embeddings)
CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768), -- Vertex AI embedding dimension
    chunk_index INTEGER,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Context Instructions (Business-specific rules)
CREATE TABLE context_instructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category VARCHAR(100), -- 'brand', 'sop', 'policy', 'guideline'
    instruction TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for vector search
CREATE INDEX idx_knowledge_chunks_business ON knowledge_chunks(business_id);
CREATE INDEX idx_knowledge_chunks_source ON knowledge_chunks(source_id);
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);

-- Indexes for filtering
CREATE INDEX idx_knowledge_sources_business ON knowledge_sources(business_id);
CREATE INDEX idx_knowledge_sources_type ON knowledge_sources(source_type);
CREATE INDEX idx_context_instructions_business ON context_instructions(business_id);

-- RLS for business isolation
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_sources_isolation ON knowledge_sources
    USING (business_id = current_setting('app.current_business_id')::UUID);

CREATE POLICY knowledge_chunks_isolation ON knowledge_chunks
    USING (business_id = current_setting('app.current_business_id')::UUID);

CREATE POLICY context_instructions_isolation ON context_instructions
    USING (business_id = current_setting('app.current_business_id')::UUID);
