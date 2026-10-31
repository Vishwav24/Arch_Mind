-- ArchMind AI Database Schema (PostgreSQL / Supabase with Row Level Security)
-- Provides full compatibility with Supabase PostgreSQL or can run on standard Postgres

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    mode TEXT DEFAULT 'greenfield', -- 'greenfield' or 'brownfield'
    owner_id TEXT DEFAULT 'demo-user', -- Matches auth.uid() in Supabase
    status TEXT DEFAULT 'created',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Source Documents Table
CREATE TABLE IF NOT EXISTS source_documents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT DEFAULT '',
    extracted_text TEXT DEFAULT '',
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Requirements Table
CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    req_id TEXT NOT NULL, -- e.g. REQ-001
    data_json JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Clarifications Table
CREATE TABLE IF NOT EXISTS clarifications (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    issue_id TEXT DEFAULT '',
    question TEXT DEFAULT '',
    answer TEXT DEFAULT '',
    status TEXT DEFAULT 'open', -- 'open', 'answered', 'skipped', 'unknown', 'assumption_approved'
    data_json JSONB DEFAULT '{}'::jsonb,
    kind TEXT DEFAULT '', -- 'ambiguity', 'missing', 'conflict'
    explanation TEXT DEFAULT '',
    requirement_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Components Table
CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    comp_id TEXT NOT NULL, -- e.g. CMP-001
    data_json JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Connections Table
CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    conn_id TEXT NOT NULL, -- e.g. CONN-001
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Decisions (ADRs) Table
CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    adr_id TEXT NOT NULL, -- e.g. ADR-001
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Traceability & Validation Results Table
CREATE TABLE IF NOT EXISTS validation_results (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Architecture Versions Table (Full Snapshots)
CREATE TABLE IF NOT EXISTS architecture_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. LLM Response Cache Table (Saves quota on repeated runs)
CREATE TABLE IF NOT EXISTS llm_cache (
    id TEXT PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    response_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_components_project ON components(project_id);
CREATE INDEX IF NOT EXISTS idx_clarifications_project ON clarifications(project_id);
CREATE INDEX IF NOT EXISTS idx_connections_project ON connections(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_arch_versions_project ON architecture_versions(project_id, version_number);
CREATE INDEX IF NOT EXISTS idx_llm_cache_key ON llm_cache(cache_key);

-- Row Level Security (RLS) policies for user project ownership (NFR-05)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_versions ENABLE ROW LEVEL SECURITY;

-- Projects isolation: Users only see projects they own
CREATE POLICY user_projects_policy ON projects
    FOR ALL
    USING (owner_id = current_user OR owner_id = 'demo-user');

CREATE POLICY user_docs_policy ON source_documents
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE owner_id = current_user OR owner_id = 'demo-user'));

CREATE POLICY user_requirements_policy ON requirements
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE owner_id = current_user OR owner_id = 'demo-user'));

CREATE POLICY user_clarifications_policy ON clarifications
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE owner_id = current_user OR owner_id = 'demo-user'));

CREATE POLICY user_components_policy ON components
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE owner_id = current_user OR owner_id = 'demo-user'));

CREATE POLICY user_connections_policy ON connections
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE owner_id = current_user OR owner_id = 'demo-user'));

CREATE POLICY user_decisions_policy ON decisions
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE owner_id = current_user OR owner_id = 'demo-user'));

CREATE POLICY user_validation_policy ON validation_results
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE owner_id = current_user OR owner_id = 'demo-user'));

CREATE POLICY user_versions_policy ON architecture_versions
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE owner_id = current_user OR owner_id = 'demo-user'));

