-- Database Constraint Validation Script
-- Run this to verify all immutability triggers and constraints exist

-- Check triggers exist
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE 
        WHEN tgenabled = 'O' THEN 'Enabled'
        ELSE 'Disabled'
    END as status
FROM pg_trigger
WHERE tgname IN (
    'domain_events_update_guard',
    'domain_events_delete_guard',
    'domain_events_hash_validation',
    'domain_events_reference_validation',
    'case_status_history_update_guard',
    'case_status_history_delete_guard',
    'case_status_history_event_validation',
    'record_merge_history_update_guard',
    'record_merge_history_delete_guard',
    'record_merge_history_event_validation',
    'data_access_logs_update_guard',
    'data_access_logs_delete_guard'
)
ORDER BY table_name, trigger_name;

-- Check constraints exist
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname IN (
    'event_type_pattern_check',
    'content_hash_format_check',
    'no_self_causation_check',
    'occurred_at_not_future_check',
    'aggregate_id_not_null_check',
    'aggregate_type_not_null_check'
)
ORDER BY table_name, constraint_name;

-- Validation query: Should return 0 rows if all constraints/triggers exist
SELECT 
    'Missing trigger' as issue_type,
    tgname as name
FROM (VALUES
    ('domain_events_update_guard'),
    ('domain_events_delete_guard'),
    ('domain_events_hash_validation'),
    ('case_status_history_update_guard'),
    ('record_merge_history_update_guard'),
    ('data_access_logs_update_guard')
) AS required_triggers(tgname)
WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = required_triggers.tgname
);

SELECT 
    'Missing constraint' as issue_type,
    conname as name
FROM (VALUES
    ('event_type_pattern_check'),
    ('content_hash_format_check'),
    ('no_self_causation_check')
) AS required_constraints(conname)
WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = required_constraints.conname
);












