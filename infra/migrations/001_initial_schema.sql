CREATE TABLE IF NOT EXISTS agent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_version (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    config_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, label)
);

CREATE TABLE IF NOT EXISTS scenario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_failure_id UUID,
    goal TEXT NOT NULL,
    user_turns JSONB NOT NULL DEFAULT '[]'::jsonb,
    state_patch JSONB NOT NULL DEFAULT '{}'::jsonb,
    fault_injections JSONB NOT NULL DEFAULT '[]'::jsonb,
    policy_context JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_invariants JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES agent_version(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES run(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
    events JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL REFERENCES trace(id) ON DELETE CASCADE,
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    verdict VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS failure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL REFERENCES trace(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES run(id) ON DELETE CASCADE,
    cluster_key VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    category VARCHAR(255) NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add parent_failure_id FK now that failure table exists
ALTER TABLE scenario 
    ADD CONSTRAINT fk_scenario_parent_failure 
    FOREIGN KEY (parent_failure_id) REFERENCES failure(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS regression_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_failure_id UUID NOT NULL REFERENCES failure(id) ON DELETE CASCADE,
    spec JSONB NOT NULL DEFAULT '{}'::jsonb,
    threshold DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS release_gate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES agent_version(id) ON DELETE CASCADE,
    baseline_id UUID REFERENCES run(id) ON DELETE SET NULL,
    verdict VARCHAR(50) NOT NULL,
    deltas JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
