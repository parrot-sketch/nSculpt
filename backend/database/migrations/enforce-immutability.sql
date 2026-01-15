-- Database Immutability Hardening
-- CRITICAL: These triggers and constraints enforce immutability at the database level
-- Treat silent mutation as a critical system failure

-- ============================================================================
-- 1. DomainEvent Immutability Enforcement
-- ============================================================================

-- Prevent ALL updates to domain_events
CREATE OR REPLACE FUNCTION prevent_domain_event_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'domain_events table is immutable. UPDATE operations are forbidden. Event ID: %, Event Type: %', 
        OLD.id, OLD.event_type
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_events_update_guard
    BEFORE UPDATE ON domain_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_domain_event_update();

-- Prevent ALL deletes from domain_events
CREATE OR REPLACE FUNCTION prevent_domain_event_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'domain_events table is immutable. DELETE operations are forbidden. Event ID: %, Event Type: %', 
        OLD.id, OLD.event_type
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_events_delete_guard
    BEFORE DELETE ON domain_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_domain_event_delete();

-- Validate content hash on insert (enforces integrity)
CREATE OR REPLACE FUNCTION validate_domain_event_hash()
RETURNS TRIGGER AS $$
DECLARE
    expected_hash TEXT;
    event_content TEXT;
BEGIN
    -- Construct content string (order matters - must match application logic!)
    event_content := NEW.event_type || '|' || 
                     NEW.domain::TEXT || '|' || 
                     NEW.aggregate_id::TEXT || '|' || 
                     NEW.aggregate_type || '|' || 
                     NEW.payload::TEXT || '|' || 
                     COALESCE(NEW.metadata::TEXT, '') || '|' || 
                     NEW.occurred_at::TEXT;
    
    -- Compute SHA-256 hash
    expected_hash := encode(digest(event_content, 'sha256'), 'hex');
    
    -- Validate hash matches
    IF NEW.content_hash IS NULL OR NEW.content_hash != expected_hash THEN
        RAISE EXCEPTION 'Invalid content_hash for event %. Expected: %, Got: %', 
            NEW.id, expected_hash, NEW.content_hash
        USING ERRCODE = 'P0001';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_events_hash_validation
    BEFORE INSERT ON domain_events
    FOR EACH ROW
    EXECUTE FUNCTION validate_domain_event_hash();

-- Validate causation/correlation references
CREATE OR REPLACE FUNCTION validate_event_references()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate causationId exists if provided
    IF NEW.causation_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM domain_events WHERE id = NEW.causation_id) THEN
            RAISE EXCEPTION 'causation_id % does not reference existing event', NEW.causation_id
            USING ERRCODE = 'P0001';
        END IF;
        
        -- Prevent self-reference
        IF NEW.causation_id = NEW.id THEN
            RAISE EXCEPTION 'causation_id cannot reference self. Event ID: %', NEW.id
            USING ERRCODE = 'P0001';
        END IF;
    END IF;
    
    -- Validate correlationId exists if provided
    IF NEW.correlation_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM domain_events WHERE id = NEW.correlation_id) THEN
            RAISE EXCEPTION 'correlation_id % does not reference existing event', NEW.correlation_id
            USING ERRCODE = 'P0001';
        END IF;
    END IF;
    
    -- Validate createdBy references existing user if provided
    IF NEW.created_by IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.created_by) THEN
            RAISE EXCEPTION 'created_by % does not reference existing user', NEW.created_by
            USING ERRCODE = 'P0001';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domain_events_reference_validation
    BEFORE INSERT ON domain_events
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_references();

-- ============================================================================
-- 2. Check Constraints for DomainEvent
-- ============================================================================

-- Ensure eventType follows pattern DomainEntity.Action
ALTER TABLE domain_events
ADD CONSTRAINT IF NOT EXISTS event_type_pattern_check
CHECK (event_type ~ '^[A-Z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$');

-- Ensure occurredAt is not in future (with 5 minute tolerance for clock skew)
ALTER TABLE domain_events
ADD CONSTRAINT IF NOT EXISTS occurred_at_not_future_check
CHECK (occurred_at <= NOW() + INTERVAL '5 minutes');

-- Ensure contentHash is valid SHA-256 hex string (64 hex characters)
ALTER TABLE domain_events
ADD CONSTRAINT IF NOT EXISTS content_hash_format_check
CHECK (content_hash ~ '^[a-f0-9]{64}$');

-- Prevent self-reference in causation
ALTER TABLE domain_events
ADD CONSTRAINT IF NOT EXISTS no_self_causation_check
CHECK (causation_id IS NULL OR causation_id != id);

-- Prevent self-reference in correlation (allowing same ID for correlation)
-- Note: Correlation can reference self for same-workflow grouping

-- Ensure aggregateId and aggregateType are not null
ALTER TABLE domain_events
ADD CONSTRAINT IF NOT EXISTS aggregate_id_not_null_check
CHECK (aggregate_id IS NOT NULL);

ALTER TABLE domain_events
ADD CONSTRAINT IF NOT EXISTS aggregate_type_not_null_check
CHECK (aggregate_type IS NOT NULL);

-- ============================================================================
-- 3. CaseStatusHistory Immutability Enforcement
-- ============================================================================

-- Prevent ALL updates to case_status_history
CREATE OR REPLACE FUNCTION prevent_case_status_history_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'case_status_history is immutable. UPDATE forbidden. ID: %, Case ID: %', 
        OLD.id, OLD.case_id
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER case_status_history_update_guard
    BEFORE UPDATE ON case_status_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_case_status_history_update();

CREATE TRIGGER case_status_history_delete_guard
    BEFORE DELETE ON case_status_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_case_status_history_update();

-- Validate triggeringEventId references existing event
CREATE OR REPLACE FUNCTION validate_case_status_history_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM domain_events WHERE id = NEW.triggering_event_id) THEN
        RAISE EXCEPTION 'triggering_event_id % does not reference existing event', NEW.triggering_event_id
        USING ERRCODE = 'P0001';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER case_status_history_event_validation
    BEFORE INSERT ON case_status_history
    FOR EACH ROW
    EXECUTE FUNCTION validate_case_status_history_event();

-- ============================================================================
-- 4. RecordMergeHistory Immutability Enforcement
-- ============================================================================

-- Prevent updates to immutable fields, allow reversal fields
CREATE OR REPLACE FUNCTION prevent_record_merge_history_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow updates to reversal fields
    IF (OLD.source_record_id IS DISTINCT FROM NEW.source_record_id) OR
       (OLD.target_record_id IS DISTINCT FROM NEW.target_record_id) OR
       (OLD.triggering_event_id IS DISTINCT FROM NEW.triggering_event_id) OR
       (OLD.reason IS DISTINCT FROM NEW.reason) OR
       (OLD.merged_by IS DISTINCT FROM NEW.merged_by) OR
       (OLD.merged_at IS DISTINCT FROM NEW.merged_at) THEN
        RAISE EXCEPTION 'record_merge_history immutable fields cannot be updated. ID: %', OLD.id
        USING ERRCODE = 'P0001';
    END IF;
    
    -- Validate reversal event if provided
    IF NEW.reversal_event_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM domain_events WHERE id = NEW.reversal_event_id) THEN
            RAISE EXCEPTION 'reversal_event_id % does not reference existing event', NEW.reversal_event_id
            USING ERRCODE = 'P0001';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER record_merge_history_update_guard
    BEFORE UPDATE ON record_merge_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_record_merge_history_update();

CREATE TRIGGER record_merge_history_delete_guard
    BEFORE DELETE ON record_merge_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_record_merge_history_update();

-- Validate triggeringEventId on insert
CREATE OR REPLACE FUNCTION validate_record_merge_history_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM domain_events WHERE id = NEW.triggering_event_id) THEN
        RAISE EXCEPTION 'triggering_event_id % does not reference existing event', NEW.triggering_event_id
        USING ERRCODE = 'P0001';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER record_merge_history_event_validation
    BEFORE INSERT ON record_merge_history
    FOR EACH ROW
    EXECUTE FUNCTION validate_record_merge_history_event();

-- ============================================================================
-- 5. DataAccessLog Immutability Enforcement
-- ============================================================================

-- Prevent updates/deletes to data_access_logs (HIPAA requirement)
CREATE OR REPLACE FUNCTION prevent_data_access_log_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'data_access_logs is immutable. UPDATE/DELETE forbidden. ID: %', OLD.id
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_access_logs_update_guard
    BEFORE UPDATE ON data_access_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_data_access_log_update();

CREATE TRIGGER data_access_logs_delete_guard
    BEFORE DELETE ON data_access_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_data_access_log_update();

-- ============================================================================
-- 6. Comments for Documentation
-- ============================================================================

COMMENT ON TRIGGER domain_events_update_guard ON domain_events IS 
    'CRITICAL: Prevents all UPDATE operations. DomainEvent is immutable after creation.';
    
COMMENT ON TRIGGER domain_events_delete_guard ON domain_events IS 
    'CRITICAL: Prevents all DELETE operations. DomainEvent is immutable after creation.';
    
COMMENT ON TRIGGER domain_events_hash_validation ON domain_events IS 
    'CRITICAL: Validates content_hash on INSERT to ensure event integrity.';
    
COMMENT ON TRIGGER case_status_history_update_guard ON case_status_history IS 
    'CRITICAL: Prevents all UPDATE/DELETE operations. History is immutable.';
    
COMMENT ON TRIGGER record_merge_history_update_guard ON record_merge_history IS 
    'CRITICAL: Prevents UPDATE to immutable fields. Only reversal fields can be updated.';












