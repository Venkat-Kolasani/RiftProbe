-- Seed retailops agent
INSERT INTO agent (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'retailops')
ON CONFLICT (name) DO NOTHING;

-- Seed v1.0 and v1.1 agent versions
INSERT INTO agent_version (id, agent_id, label, config_hash)
VALUES 
    ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'v1.0', 'hash_v1_0_vulnerable'),
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'v1.1', 'hash_v1_1_corrected')
ON CONFLICT (agent_id, label) DO NOTHING;
